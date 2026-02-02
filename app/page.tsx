import Link from 'next/link';
import { headers } from 'next/headers';
import { SubdomainForm } from './subdomain-form';
import { SiteHome } from '@/components/site-home';
import {
  getCategoriesBySiteId,
  getLatestItemsBySiteId,
  getSiteByHost
} from '@/lib/tenant.server';
import { rootDomain } from '@/lib/utils';

export default async function HomePage() {
  const host = headers().get('host');
  const rootHost = rootDomain.split(':')[0].toLowerCase();
  const incomingHost = host?.split(':')[0].toLowerCase();

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
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4 relative">
      <div className="absolute top-4 right-4">
        <Link
          href="/admin"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Admin
        </Link>
      </div>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            {rootDomain}
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Create your own subdomain with a custom emoji
          </p>
        </div>

        <div className="mt-8 bg-white shadow-md rounded-lg p-6">
          <SubdomainForm />
        </div>
      </div>
    </div>
  );
}
