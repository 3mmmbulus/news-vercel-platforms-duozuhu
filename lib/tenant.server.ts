import 'server-only';

import type { RecordModel } from 'pocketbase';
import { getPocketBaseAdminClient } from '@/lib/pb.server';

export type SiteRecord = RecordModel & {
  name?: string;
  title?: string;
  description?: string;
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
  host?: string;
  site: string;
  expand?: {
    site?: SiteRecord;
  };
};

function normalizeHost(host: string | null) {
  if (!host) {
    return null;
  }

  return host.split(':')[0].trim().toLowerCase();
}

export async function getSiteByHost(host: string | null) {
  const normalizedHost = normalizeHost(host);

  if (!normalizedHost) {
    return null;
  }

  const pb = getPocketBaseAdminClient();

  try {
    const domain = await pb
      .collection('domains')
      .getFirstListItem<DomainRecord>(
        `host = ${JSON.stringify(normalizedHost)}`,
        { expand: 'site' }
      );

    const site = domain.expand?.site ?? null;

    if (!site) {
      return null;
    }

    return {
      host: normalizedHost,
      domain,
      site
    };
  } catch (error) {
    return null;
  }
}

export async function getCategoriesBySiteId(siteId: string) {
  if (!siteId) {
    return [] as CategoryRecord[];
  }

  const pb = getPocketBaseAdminClient();
  const categories = await pb.collection('categories').getFullList<CategoryRecord>({
    sort: 'name',
    filter: `site = ${JSON.stringify(siteId)}`
  });

  return categories;
}

export async function getLatestItemsBySiteId(siteId: string, limit = 10) {
  if (!siteId) {
    return [] as ItemRecord[];
  }

  const pb = getPocketBaseAdminClient();
  const items = await pb.collection('items').getList<ItemRecord>(1, limit, {
    sort: '-created',
    filter: `site = ${JSON.stringify(siteId)}`
  });

  return items.items;
}
