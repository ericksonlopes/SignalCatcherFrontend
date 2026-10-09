import {getTranslation} from './locales';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    const {t} = getTranslation(localStorage.getItem('signalcatcher_language') || 'en');
    
    const adminApiKey = import.meta.env.VITE_ADMIN_API_KEY || localStorage.getItem('signalcatcher_admin_api_key');
    if (adminApiKey) {
        headers.set('X-API-Key', adminApiKey);
    }
    
    const response = await fetch(input, {...init, headers});
    
    if (response.status === 409) throw new Error(t('contentBusy'));
    return response;
}
