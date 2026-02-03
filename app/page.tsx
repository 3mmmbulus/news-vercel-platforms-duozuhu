import Link from 'next/link';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { SiteHome } from '@/components/site-home';
import {
  getCategoriesBySiteId,
  getLatestItemsBySiteId,
  getSiteByHost,
  resolveHostFromHeaders
} from '@/lib/tenant.server';
import { rootDomain } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const hostname = resolveHostFromHeaders(requestHeaders);
  const host = hostname ? hostname : null;

  if (!hostname) {
    return {
      title: rootDomain
    };
  }

  const tenant = await getSiteByHost(host);

  if (!tenant?.site) {
    return {
      title: rootDomain
    };
  }

  const title =
    tenant.site.meta_title || tenant.site.site_name || tenant.host || hostname;
  const description = tenant.site.meta_description || undefined;
  const keywords = tenant.site.meta_keywords || undefined;

  return {
    title,
    description,
    keywords
  };
}

export default async function HomePage() {
  const requestHeaders = await headers();
  const host = resolveHostFromHeaders(requestHeaders);
  const rootHost = rootDomain.split(':')[0].toLowerCase();
  const incomingHost = host?.toLowerCase();

  if (incomingHost && incomingHost !== rootHost) {
    const tenant = await getSiteByHost(host);

    if (tenant?.site && tenant.host) {
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
          showRootLink={false}
        />
      );
    }

    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white p-6 relative">
      <div className="absolute top-4 right-4">
        <Link
          href="/admin"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Admin
        </Link>
      </div>

      <div className="w-full max-w-2xl space-y-6 text-center">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            Platform
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            {rootDomain}
          </h1>
          <p className="text-lg text-gray-600">
            平台入口页：根据访问域名自动加载对应站点内容。
          </p>
        </div>
        <div className="mx-auto flex flex-wrap justify-center gap-4">
          <Link
            href="/admin"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            进入管理后台
          </Link>
          <a
            href="https://hub.erel.cc"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
          >
            前往 PocketBase
          </a>
        </div>
      </div>
    </div>
  );
}
