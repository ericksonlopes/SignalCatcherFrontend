import React, {useEffect, useRef, useState} from 'react';
import {AnimatePresence, motion, useReducedMotion} from 'motion/react';
import {X} from 'lucide-react';
import {useToast} from './ToastContext';
import {LanguageMode, ToastNotification} from '../../types';
import {getTranslation} from '../../locales';
import {notificationStyle} from '../notificationStyle';

interface ToastItemProps {
    toast: ToastNotification;
    language: LanguageMode;
    onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({toast, language, onDismiss}) => {
    const {t} = getTranslation(language);
    const reducedMotion = useReducedMotion();
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(document.hidden);
    const duration = toast.duration ?? 5000;
    const remaining = useRef(duration);
    const paused = hovered || focused || hidden;
    const {Icon, color, border, title} = notificationStyle[toast.type];

    useEffect(() => {
        const onVisibility = () => setHidden(document.hidden);
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);

    useEffect(() => {
        if (paused || duration <= 0 || !Number.isFinite(duration)) return;
        const started = performance.now();
        const timer = window.setTimeout(() => onDismiss(toast.id), Math.max(0, remaining.current));
        return () => {
            window.clearTimeout(timer);
            remaining.current = Math.max(0, remaining.current - (performance.now() - started));
        };
    }, [duration, paused, toast.id, onDismiss]);

    return <motion.li layout={!reducedMotion}
        initial={{opacity: 0, y: reducedMotion ? 0 : 8}}
        animate={{opacity: 1, y: 0}}
        exit={{opacity: 0}}
        transition={{duration: reducedMotion ? 0 : 0.15}}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={event => {if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);}}
        className={`pointer-events-auto rounded-xl border bg-zinc-950 p-3 shadow-lg ${border}`}>
        <div className="flex items-start gap-2.5">
            <Icon aria-hidden="true" className={`size-4 shrink-0 mt-0.5 ${color}`} />
            <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-100 break-words">{toast.title || t(title)}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-300 [overflow-wrap:anywhere] whitespace-pre-wrap">{toast.message}</p>
                {toast.action && <button className="mt-2 text-xs font-medium text-indigo-400 hover:underline"
                    onClick={() => {toast.action?.onClick(); onDismiss(toast.id);}}>{toast.action.label}</button>}
            </div>
            <button aria-label={t('notificationDismiss')} title={t('notificationDismiss')}
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"><X className="size-4" /></button>
        </div>
    </motion.li>;
};

export const ToastContainer: React.FC<{language?: LanguageMode; hidden?: boolean}> = ({language = 'pt', hidden = false}) => {
    const {toasts, dismissToast, clearAllToasts} = useToast();
    const {t} = getTranslation(language);
    // Keep timers mounted while the drawer is open, without overlapping it.
    return <section aria-label={t('notificationsTitle')} aria-live="polite" aria-relevant="additions"
        className={`fixed bottom-3 right-3 left-3 sm:left-auto sm:w-80 z-[120] pointer-events-none ${hidden ? 'invisible' : ''}`}>
        {toasts.length > 1 && <div className="mb-2 flex justify-end">
            <button onClick={clearAllToasts} className="pointer-events-auto rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-100">{t('toastClearAll')}</button>
        </div>}
        <ul className="flex flex-col gap-2 max-h-[70dvh] overflow-y-auto">
            <AnimatePresence initial={false}>{toasts.map(item => <ToastItem key={item.id} toast={item} language={language} onDismiss={dismissToast} />)}</AnimatePresence>
        </ul>
    </section>;
};
