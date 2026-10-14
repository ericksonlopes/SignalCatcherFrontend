import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL, apiFetch } from '../api';
import type { DiarizationVideo } from '../components/apps/DiarizationApp';

interface DiarizationPage {
  items: DiarizationVideo[];
  total: number;
  total_pages: number;
}
type RequestMode = 'more' | 'refresh' | 'poll';
interface RequestContext {
  controller: AbortController;
  busy: boolean;
  pages: number;
  hasMore: boolean;
  head: string;
  failedMode: RequestMode;
}
const PAGE_SIZE = 20;
const ACTIVE_POLL_STEPS = new Set(['ALL', 'PROCESSING', 'TRANSCRIPTION', 'ALIGNMENT', 'DIARIZATION']);

const fingerprint = (page: DiarizationPage) => JSON.stringify([page.total, page.items.map(item => [item.id, item.step, item.progress_percent, item.queue_priority])]);

function mergeDiarizations(previous: DiarizationVideo[], incoming: DiarizationVideo[]) {
  return Array.from(new Map([...previous, ...incoming].map(item => [item.id, item])).values());
}

function shouldSkipPoll(firstPage: DiarizationPage, head: string, step: string): boolean {
  return fingerprint(firstPage) === head && !ACTIVE_POLL_STEPS.has(step);
}

interface LoadedPagesResult {
  items: DiarizationVideo[];
  lastPage: number;
  more: boolean;
  total: number;
  head: string;
}

async function fetchPagesRange(
  start: number,
  end: number,
  fetchPage: (page: number, signal: AbortSignal) => Promise<DiarizationPage>,
  signal: AbortSignal,
  firstPage?: DiarizationPage,
  initialHead: string = ''
): Promise<LoadedPagesResult> {
  let items: DiarizationVideo[] = [];
  let lastPage = start;
  let more = false;
  let total = 0;
  let head = initialHead;

  for (let page = start; page <= end; page++) {
    const data = page === 1 && firstPage ? firstPage : await fetchPage(page, signal);
    items = mergeDiarizations(items, data.items);
    lastPage = page;
    total = data.total;
    more = page < data.total_pages && data.items.length > 0;
    if (page === 1) head = fingerprint(data);
    if (!more) break;
  }

  return { items, lastPage, more, total, head };
}

export function useInfiniteDiarizations(step: string = 'ALL', search: string = '', refreshTrigger: number = 0) {
  const [videos, setVideos] = useState<DiarizationVideo[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [isFetching, setFetching] = useState(false);
  const [isLoadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const context = useRef<RequestContext | null>(null);

  const fetchPage = useCallback(async (page: number, signal: AbortSignal): Promise<DiarizationPage> => {
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (step !== 'ALL') params.set('step', step);
    if (search) params.set('search', search);
    const response = await apiFetch(API_BASE_URL + '/api/diarization/list?' + params, { signal });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    const items = data.items ?? data.diarizations;
    if (!Array.isArray(items) || typeof data.total !== 'number' || typeof data.total_pages !== 'number') {
      throw new TypeError('Invalid diarization page');
    }
    return { items, total: data.total, total_pages: data.total_pages };
  }, [step, search]);

  const request = useCallback(async (mode: RequestMode) => {
    const current = context.current;
    if (!current || current.busy || current.controller.signal.aborted || (mode === 'more' && !current.hasMore)) return;
    current.busy = true;
    setFetching(true);
    setLoadingMore(mode === 'more' && current.pages > 0);
    setLoadError(false);
    try {
      let firstPage: DiarizationPage | undefined;
      if (mode === 'poll') {
        firstPage = await fetchPage(1, current.controller.signal);
        if (shouldSkipPoll(firstPage, current.head, step)) return;
      }
      const start = mode === 'more' ? current.pages + 1 : 1;
      const end = mode === 'more' ? start : Math.max(1, current.pages);
      const result = await fetchPagesRange(start, end, fetchPage, current.controller.signal, firstPage, current.head);

      if (context.current !== current || current.controller.signal.aborted) return;
      setVideos(previous => mode === 'more' ? mergeDiarizations(previous, result.items) : result.items);
      current.pages = result.lastPage;
      current.hasMore = result.more;
      current.head = result.head;
      setHasMore(result.more);
      setTotalItems(result.total);
    } catch {
      if (context.current === current && !current.controller.signal.aborted) {
        current.failedMode = mode;
        setLoadError(true);
      }
    } finally {
      current.busy = false;
      if (context.current === current && !current.controller.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
        setFetching(false);
      }
    }
  }, [fetchPage, step]);

  useEffect(() => {
    const current: RequestContext = {
      controller: new AbortController(), busy: false, pages: 0,
      hasMore: true, head: '', failedMode: 'more',
    };
    context.current = current;
    setVideos([]);
    setLoading(true);
    setLoadingMore(false);
    setHasMore(true);
    setLoadError(false);
    setTotalItems(0);
    void request('more');
    const interval = setInterval(() => void request('poll'), 5000);
    return () => { current.controller.abort(); clearInterval(interval); };
  }, [request]);

  useEffect(() => { void request('refresh'); }, [refreshTrigger, request]);
  const loadMore = useCallback(() => { void request('more'); }, [request]);
  const retry = useCallback(() => { void request(context.current?.failedMode ?? 'more'); }, [request]);
  return { videos, setVideos, isLoading, isFetching, isLoadingMore, hasMore, loadError, totalItems, loadMore, retry };
}
