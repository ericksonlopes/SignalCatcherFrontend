import {useCallback, useEffect, useRef, useState} from 'react';
import {API_BASE_URL, apiFetch} from '../api';
import {CapturedVideo} from '../types';

interface VideoDTO {
    id: string | number; title: string; url: string; channel_name?: string; thumbnail?: string;
    created_at?: string; published_at?: string; duration?: number | string; step?: string;
    tags?: string[]; description?: string; language?: string; deletion_requested?: boolean;
    attempt_count?: number; next_retry_at?: string | null; error_info?: string | null;
    is_diarized?: boolean; diarization_status?: string | null;
}
interface VideoPage {items: VideoDTO[]; total_pages: number;}
interface RequestContext {controller: AbortController; busy: boolean; pages: number; hasMore: boolean;}
const PAGE_SIZE = 24;

function mapVideo(item: VideoDTO): CapturedVideo {
    return {
        id: String(item.id), sourceId: 'api', sourceName: item.channel_name || 'YouTube', sourceAvatar: '',
        title: item.title, videoUrl: item.url, thumbnail: item.thumbnail || '', createdAt: item.created_at,
        publishedAt: item.published_at || '', duration: item.duration ?? '0:00',
        views: 0, likes: 0, commentsCount: 0, status: item.step || 'PENDING_DOWNLOAD',
        postgresRecordId: String(item.id), tags: item.tags || [], description: item.description || '',
        language: item.language, deletionRequested: item.deletion_requested ?? false,
        attemptCount: item.attempt_count ?? 0, nextRetryAt: item.next_retry_at ?? null,
        errorInfo: item.error_info ?? null, isDiarized: item.is_diarized ?? false,
        diarizationStatus: item.diarization_status || null,
    };
}

export function useInfiniteVideos(step: string, search: string, channel: string, refreshTrigger: number) {
    const [captures, setCaptures] = useState<CapturedVideo[]>([]);
    const [isInitialLoading, setInitialLoading] = useState(true);
    const [isLoadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(false);
    const context = useRef<RequestContext | null>(null);

    const fetchPage = useCallback(async (page: number, signal: AbortSignal): Promise<VideoPage> => {
        const params = new URLSearchParams({page: String(page), limit: String(PAGE_SIZE)});
        if (step) params.set('step', step);
        if (search) params.set('search', search);
        if (channel) params.set('channel', channel);
        const response = await apiFetch(`${API_BASE_URL}/api/youtube/content?${params}`, {signal});
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json() as VideoPage;
        if (!Array.isArray(data.items) || typeof data.total_pages !== 'number') throw new Error('Invalid video page');
        return data;
    }, [step, search, channel]);

    const request = useCallback(async (mode: 'more' | 'refresh') => {
        const current = context.current;
        if (!current || current.busy || current.controller.signal.aborted || (mode === 'more' && !current.hasMore)) return;
        current.busy = true;
        setError(false);
        if (current.pages > 0) setLoadingMore(true);
        try {
            const start = mode === 'refresh' ? 1 : current.pages + 1;
            const end = mode === 'refresh' ? Math.max(1, current.pages) : start;
            let videos: CapturedVideo[] = [];
            let lastPage = start;
            let more = false;
            for (let page = start; page <= end; page++) {
                const data = await fetchPage(page, current.controller.signal);
                videos.push(...data.items.map(mapVideo));
                lastPage = page;
                more = page < data.total_pages && data.items.length > 0;
                if (!more) break;
            }
            if (context.current !== current || current.controller.signal.aborted) return;
            setCaptures(previous => {
                const combined = mode === 'refresh' ? videos : [...previous, ...videos];
                return Array.from(new Map(combined.map(video => [video.id, video])).values());
            });
            current.pages = lastPage;
            current.hasMore = more;
            setHasMore(more);
        } catch {
            if (!current.controller.signal.aborted && context.current === current) setError(true);
        } finally {
            current.busy = false;
            if (context.current === current && !current.controller.signal.aborted) {
                setInitialLoading(false);
                setLoadingMore(false);
            }
        }
    }, [fetchPage]);

    useEffect(() => {
        const next: RequestContext = {controller: new AbortController(), busy: false, pages: 0, hasMore: true};
        context.current = next;
        setCaptures([]); setInitialLoading(true); setLoadingMore(false); setHasMore(true); setError(false);
        void request('more');
        return () => next.controller.abort();
    }, [request]);

    useEffect(() => {
        // Refresh the loaded window, preserving its length and preventing overlap with pagination.
        void request('refresh');
    }, [refreshTrigger, request]);

    const loadMore = useCallback(() => {
        void request(error && !context.current?.hasMore ? 'refresh' : 'more');
    }, [error, request]);
    return {captures, setCaptures, isInitialLoading, isLoadingMore, hasMore, error, loadMore};
}
