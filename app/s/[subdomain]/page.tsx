import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { SiteHome } from '@/components/site-home';
import {
  getCategoriesBySiteId,
  getLatestItemsBySiteId,
  getSiteByHost
} from '@/lib/tenant.server';
import { rootDomain } from '@/lib/utils';

export async function generateMetadata({
  params
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  await params;
  const requestHeaders = await headers();
  const host =
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const tenant = await getSiteByHost(host);

  if (!tenant?.site) {
    return {
      title: rootDomain
    };
  }

  return {
    title: tenant.site.name || tenant.site.title || tenant.host,
    description:
      tenant.site.description || `Site page for ${tenant.host || rootDomain}`
  };
}

export default async function SubdomainPage({
  params
}: {
  params: Promise<{ subdomain: string }>;
}) {
  await params;
  const requestHeaders = await headers();
  const host =
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const tenant = await getSiteByHost(host);

  if (!tenant?.site || !tenant.host) {
    notFound();
  }

  const [categories, items] = await Promise.all([
    getCategoriesBySiteId(tenant.site.id),
    getLatestItemsBySiteId(tenant.site.id, 12)
  ]);

  return (
    <SiteHome
      host={tenant.host}
      site={tenant.site}
      categories={categories}
      items={items}
    />
  );
}
