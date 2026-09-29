import {getTranslation} from './locales';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const ADMIN_KEY_STORAGE = 'signalcatcher_admin_key';

export function getAdminKey(): string {
    return sessionStorage.getItem(ADMIN_KEY_STORAGE) || '';
}

export function setAdminKey(value: string): void {
    if (value) sessionStorage.setItem(ADMIN_KEY_STORAGE, value);
    else sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    window.dispatchEvent(new Event('signalcatcher-admin-key-changed'));
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const url = new URL(input, window.location.href);
    const base = new URL(API_BASE_URL, window.location.href);
    const method = (init.method || 'GET').toUpperCase();
    const needsKey = !['GET', 'HEAD', 'OPTIONS'].includes(method) || url.pathname === `${base.pathname.replace(/\/$/, '')}/metrics`;
    const headers = new Headers(init.headers);
    const {t} = getTranslation(localStorage.getItem('signalcatcher_language') || 'en');
    if (needsKey && url.origin === base.origin) {
        const key = getAdminKey();
        if (!key) throw new Error(t('adminKeyRequired'));
        headers.set('X-API-Key', key);
    }
    const response = await fetch(input, {...init, headers});
    if (response.status === 401) throw new Error(t('adminKeyInvalid'));
    if (response.status === 503 && needsKey) {
        const error = await response.clone().json().catch(() => null) as { detail?: string } | null;
        if (error?.detail === 'Administrative access is not configured.') {
            throw new Error(t('adminKeyNotConfigured'));
        }
    }
    if (response.status === 409) throw new Error(t('contentBusy'));
    return response;
}
