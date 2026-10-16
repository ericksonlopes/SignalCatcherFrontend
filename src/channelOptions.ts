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

function registerSaved(
    saved: ContentSource[],
    channels: Map<string, {value: string; label: string}>,
    aliases: Map<string, string>,
    names: Map<string, Set<string>>,
) {
    for (const channel of saved) {
        const key = channelIdentity(channel.channelId);
        if (!key) continue;
        channels.set(key, {value: channel.channelId.replace(/^@/, ''), label: channel.name || channel.channelId});
        for (const alias of [channel.channelId, channel.url, channel.channelUrl || '']) {
            const identity = channelIdentity(alias);
            if (identity) aliases.set(identity, key);
        }
        const name = normalizedName(channel.name);
        if (name) {
            const set = names.get(name) || new Set();
            set.add(key);
            names.set(name, set);
        }
    }
}

function resolveMonitoredKey(
    channel: ContentSource,
    identity: string,
    aliases: Map<string, string>,
    names: Map<string, Set<string>>,
): string {
    const existing = aliases.get(identity);
    if (existing) return existing;
    const matchingNames = names.get(normalizedName(channel.name));
    if (matchingNames?.size === 1) {
        return Array.from(matchingNames)[0];
    }
    return identity;
}

function registerMonitored(
    monitored: ContentSource[],
    channels: Map<string, {value: string; label: string}>,
    aliases: Map<string, string>,
    names: Map<string, Set<string>>,
) {
    for (const channel of monitored) {
        const identity = channelIdentity(channel.channelId || channel.url);
        if (!identity) continue;
        const key = resolveMonitoredKey(channel, identity, aliases, names);
        aliases.set(identity, key);
        const urlAlias = channelIdentity(channel.url);
        if (urlAlias) aliases.set(urlAlias, key);
        if (!channels.has(key)) channels.set(key, {value: identity, label: channel.name || identity});
    }
}

function registerCaptures(
    captures: CapturedVideo[],
    channels: Map<string, {value: string; label: string}>,
    aliases: Map<string, string>,
) {
    for (const video of captures) {
        const identity = channelIdentity(video.sourceName);
        if (!identity) continue;
        const key = aliases.get(identity) || identity;
        if (!channels.has(key)) channels.set(key, {value: identity, label: video.sourceName.split('/')[0]});
    }
}

function formatChannelOptions(channels: Map<string, {value: string; label: string}>): [string, string][] {
    const duplicates = new Map<string, number>();
    for (const {label} of channels.values()) {
        const name = normalizedName(label);
        duplicates.set(name, (duplicates.get(name) || 0) + 1);
    }
    return Array.from(channels.entries()).map(([identity, {value, label}]): [string, string] => {
        const count = duplicates.get(normalizedName(label)) || 0;
        const formattedLabel = count > 1 ? `${label} (${identity})` : label;
        return [value, formattedLabel];
    }).sort((a, b) => a[1].localeCompare(b[1], undefined, {sensitivity: 'base'}));
}

export function buildChannelOptions(saved: ContentSource[], monitored: ContentSource[], captures: CapturedVideo[]) {
    const channels = new Map<string, {value: string; label: string}>();
    const aliases = new Map<string, string>();
    const names = new Map<string, Set<string>>();

    registerSaved(saved, channels, aliases, names);
    registerMonitored(monitored, channels, aliases, names);
    registerCaptures(captures, channels, aliases);

    return formatChannelOptions(channels);
}
