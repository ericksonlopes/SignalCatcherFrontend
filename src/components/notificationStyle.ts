import {AlertTriangle, CircleCheck, CircleX, Info} from 'lucide-react';
import {ToastType} from '../types';
import {TranslationKeys} from '../locales/pt';

export const notificationStyle: Record<ToastType, {
    Icon: typeof Info; title: TranslationKeys; color: string; border: string;
}> = {
    success: {Icon: CircleCheck, title: 'toastSuccess', color: 'text-emerald-400', border: 'border-emerald-500/30'},
    error: {Icon: CircleX, title: 'toastError', color: 'text-rose-400', border: 'border-rose-500/30'},
    warning: {Icon: AlertTriangle, title: 'toastWarning', color: 'text-amber-400', border: 'border-amber-500/30'},
    info: {Icon: Info, title: 'toastInfo', color: 'text-blue-400', border: 'border-blue-500/30'},
};
