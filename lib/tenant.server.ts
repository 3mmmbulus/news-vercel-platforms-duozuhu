import 'server-only';

import type { RecordModel } from 'pocketbase';
import { getPocketBaseAdminClient } from '@/lib/pb.server';

export type SiteRecord = RecordModel & {
  name?: string;
  title?: string;
  description?: string;
  site_name?: string;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
};

export type CategoryRecord = RecordModel & {
  name?: string;
  title?: string;
};

export type ItemRecord = RecordModel & {
  title?: string;
  name?: string;
  url?: string;
  created?: string;
  publishedAt?: string;
};

type DomainRecord = RecordModel & {
  hostname?: string;
  site: string;
  expand?: {
    site?: SiteRecord;
  };
};

type SiteByHostResult =
  | {
      host: string;
      domain: DomainRecord;
      site: SiteRecord;
    }
  | null;

const HOST_CACHE_TTL_MS = 60_000;
const hostCache = new Map<
  string,
  { expiresAt: number; value: SiteByHostResult }
>();

function getCachedHost(host: string): SiteByHostResult | undefined {
  const cached = hostCache.get(host);

  if (!cached) {
    return undefined;
  }

  if (cached.expiresAt < Date.now()) {
    hostCache.delete(host);
    return undefined;
  }

  return cached.value;
}

function setCachedHost(host: string, value: SiteByHostResult) {
  hostCache.set(host, {
    value,
    expiresAt: Date.now() + HOST_CACHE_TTL_MS
  });
}

export function resolveHostFromHeaders(requestHeaders: Headers | null) {
  if (!requestHeaders) {
    return null;
  }

  const rawHost =
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');

  if (!rawHost) {
    return null;
  }

  const firstHost = rawHost.split(',')[0]?.trim();

  if (!firstHost) {
    return null;
  }

  let hostOnly = firstHost;

  if (hostOnly.startsWith('[')) {
    const closingIndex = hostOnly.indexOf(']');
    if (closingIndex !== -1) {
      hostOnly = hostOnly.slice(0, closingIndex + 1);
    }
  } else {
    hostOnly = hostOnly.split(':')[0];
  }

  return hostOnly.trim().toLowerCase();
}

function normalizeHost(host: string | null) {
  if (!host) {
    return null;
  }

  return host.split(':')[0].trim().toLowerCase();
}

export async function getSiteByHost(host: string | null) {
  const normalizedHost = normalizeHost(host);

  if (!normalizedHost) {
    console.warn('[tenant] missing host header');
    return null;
  }

  const cached = getCachedHost(normalizedHost);

  if (cached !== undefined) {
    console.info('[tenant] cache hit', { host: normalizedHost });
    return cached;
  }

  console.info('[tenant] cache miss', { host: normalizedHost });

  const pb = await getPocketBaseAdminClient();

  if (!pb) {
    console.warn('[tenant] PB not configured', { host: normalizedHost });
    return null;
  }

  try {
    const statusFilter =
      process.env.NODE_ENV === 'production'
        ? ' && (status = "active" || status = "verified")'
        : '';
    const domain = await pb
      .collection('domains')
      .getFirstListItem<DomainRecord>(
        `hostname = ${JSON.stringify(normalizedHost)}${statusFilter}`,
        { expand: 'site' }
      );

    const site = domain.expand?.site ?? null;

    if (!site) {
      console.warn('[tenant] domain found but site missing', {
        host: normalizedHost,
        domainId: domain.id
      });
      return null;
    }

    console.info('[tenant] resolved host', {
      host: normalizedHost,
      siteId: site.id
    });

    const result = {
      host: normalizedHost,
      domain,
      site
    };

    setCachedHost(normalizedHost, result);
    return result;
  } catch (error) {
    console.warn('[tenant] host not matched', { host: normalizedHost });
    return null;
  }
}

export async function getCategoriesBySiteId(siteId: string) {
  if (!siteId) {
    return [] as CategoryRecord[];
  }

  try {
    const pb = await getPocketBaseAdminClient();

    if (!pb) {
      return [] as CategoryRecord[];
    }

    const categories = await pb
      .collection('categories')
      .getFullList<CategoryRecord>({
        sort: 'name',
        filter: `site = ${JSON.stringify(siteId)}`
      });

    return categories;
  } catch {
    return [] as CategoryRecord[];
  }
}

export async function getLatestItemsBySiteId(siteId: string, limit = 10) {
  if (!siteId) {
    return [] as ItemRecord[];
  }

  try {
    const pb = await getPocketBaseAdminClient();

    if (!pb) {
      return [] as ItemRecord[];
    }

    const items = await pb.collection('items').getList<ItemRecord>(1, limit, {
      sort: '-created',
      filter: `site = ${JSON.stringify(siteId)}`
    });

    return items.items;
  } catch {
    return [] as ItemRecord[];
  }
}
