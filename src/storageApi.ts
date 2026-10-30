import {API_BASE_URL, apiFetch} from './api';

export async function storageRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await apiFetch(`${API_BASE_URL}/api/youtube/${path}`, {
        ...init,
        headers: {'Content-Type': 'application/json', ...init.headers},
    });
    if (!response.ok) {
        const body = await response.json().catch(() => null) as { detail?: unknown } | null;
        throw new Error(typeof body?.detail === 'string' ? body.detail : `HTTP ${response.status}`);
    }
    return response.json() as Promise<T>;
}
