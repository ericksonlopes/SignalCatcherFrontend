import {CapturedVideo, ContentSource} from './types';

export function channelIdentity(value: string): string {
    let identity = value.trim();
    try {
        const url = new URL(identity);
        if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname.toLowerCase())) {
            identity = decodeURIComponent(url.pathname);
        }
    } catch {
        // Video origins already contain a handle, optionally followed by a playlist folder.
    }
    identity = identity.replace(/^\/+/, '').replace(/^(channel|c|user)\//i, '').split('/')[0].replace(/^@/, '');
    // YouTube channel IDs are case sensitive; handles are not.
    return /^UC[A-Za-z0-9_-]{22}$/.test(identity) ? identity : identity.toLocaleLowerCase();
}

const normalizedName = (value: string): string => value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();

export function buildChannelOptions(saved: ContentSource[], monitored: ContentSource[], captures: CapturedVideo[]) {
    const channels = new Map<string, {value: string; label: string}>();
    const aliases = new Map<string, string>();
    const names = new Map<string, Set<string>>();
    for (const channel of saved) {
        const key = channelIdentity(channel.channelId);
        if (!key) continue;
        channels.set(key, {value: channel.channelId.replace(/^@/, ''), label: channel.name || channel.channelId});
        for (const alias of [channel.channelId, channel.url, channel.channelUrl || '']) {
            const identity = channelIdentity(alias);
            if (identity) aliases.set(identity, key);
        }
        const name = normalizedName(channel.name);
        if (name) names.set(name, new Set([...(names.get(name) || []), key]));
    }
    for (const channel of monitored) {
        const identity = channelIdentity(channel.channelId || channel.url);
        if (!identity) continue;
        const matchingNames = names.get(normalizedName(channel.name));
        const key = aliases.get(identity) || (matchingNames?.size === 1 ? Array.from(matchingNames)[0] : identity);
        aliases.set(identity, key);
        const urlAlias = channelIdentity(channel.url);
        if (urlAlias) aliases.set(urlAlias, key);
        if (!channels.has(key)) channels.set(key, {value: identity, label: channel.name || identity});
    }
    for (const video of captures) {
        const identity = channelIdentity(video.sourceName);
        if (!identity) continue;
        const key = aliases.get(identity) || identity;
        if (!channels.has(key)) channels.set(key, {value: identity, label: video.sourceName.split('/')[0]});
    }
    const duplicates = new Map<string, number>();
    for (const {label} of channels.values()) {
        const name = normalizedName(label);
        duplicates.set(name, (duplicates.get(name) || 0) + 1);
    }
    return Array.from(channels.entries()).map(([identity, {value, label}]): [string, string] =>
        [value, (duplicates.get(normalizedName(label)) || 0) > 1 ? `${label} (${identity})` : label],
    ).sort((a, b) => a[1].localeCompare(b[1], undefined, {sensitivity: 'base'}));
}
