import type {Express} from 'express';
import type {StorageSettings} from '../types';

interface MockVideo {
    id: string;
    storage_location?: string | null;
    drive_url?: string | null;
}

export function registerStorageMocks(app: Express, contents: () => MockVideo[]) {
    const settings: StorageSettings = {
        mode: 'BOTH', uploads_paused: false, max_upload_mib_per_second: null,
        drive_ready: false, drive_info: {}, last_error: null, checked_at: null,
        catalog_error: null, catalog_updated_at: null,
    };
    app.get('/api/youtube/storage-settings', (_req, res) => res.json(settings));
    app.get('/api/youtube/drive-oauth/status', (_req, res) => res.json({
        configured: false,
        authorized: false, reason: 'client_setup_required', connect_url: null,
        redirect_uri: 'http://127.0.0.1:8000/api/youtube/drive-oauth/callback'
    }));
    app.patch('/api/youtube/storage-settings', (req, res) => {
        const body = req.body as Partial<StorageSettings>;
        if (body.mode && !['LOCAL', 'DRIVE', 'BOTH'].includes(body.mode)) return res.status(422).json({detail: 'Invalid storage mode.'});
        if (body.mode === 'DRIVE') return res.status(409).json({detail: 'Authorize Google Drive before selecting Drive-only mode.'});
        if ('max_upload_mib_per_second' in body) {
            const speed = body.max_upload_mib_per_second;
            if (speed !== null && (typeof speed !== 'number' || !Number.isFinite(speed) || speed < 0.1 || speed > 10000)) return res.status(422).json({detail: 'Invalid upload limit.'});
            settings.max_upload_mib_per_second = speed ?? null;
        }
        if (body.mode) settings.mode = body.mode;
        if (typeof body.uploads_paused === 'boolean') settings.uploads_paused = body.uploads_paused;
        return res.json(settings);
    });
    app.get('/api/youtube/drive-backups/summary', (_req, res) => {
        const locations: Record<string, number> = {};
        for (const item of contents()) locations[item.storage_location || 'UNKNOWN'] = (locations[item.storage_location || 'UNKNOWN'] || 0) + 1;
        return res.json({...settings, locations, transfers: {}, queued_bytes: 0});
    });
    app.get('/api/youtube/drive-backups', (req, res) => res.json({
        items: [], total: 0, page: Math.max(1, Number(req.query.page) || 1),
        limit: Math.max(1, Math.min(100, Number(req.query.limit) || 25)),
    }));
    app.post('/api/youtube/drive-backups/retry-errors', (_req, res) => res.status(202).json({queued: 0}));
    app.post('/api/youtube/drive-backups/restore', (_req, res) => res.status(409).json({detail: 'No verified Drive copies are available in the development mock.'}));
    app.get('/api/youtube/content/:externalId/storage-history', (req, res) => {
        if (!contents().some(item => item.id === req.params.externalId)) return res.status(404).json({detail: 'Content not found.'});
        return res.json({
            items: [], total: 0, page: Math.max(1, Number(req.query.page) || 1),
            limit: Math.max(1, Math.min(100, Number(req.query.limit) || 50))
        });
    });
}
