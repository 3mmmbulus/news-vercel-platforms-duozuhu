import Link from 'next/link';
import { protocol, rootDomain } from '@/lib/utils';
import type {
  CategoryRecord,
  ItemRecord,
  SiteRecord
} from '@/lib/tenant.server';

function resolveSiteTitle(site: SiteRecord, host: string) {
  return site.name || site.title || host;
}

function resolveSiteDescription(site: SiteRecord) {
  return site.description || 'Latest updates from this site';
}

function resolveCategoryLabel(category: CategoryRecord) {
  return category.name || category.title || category.id;
}

function resolveItemTitle(item: ItemRecord) {
  return item.title || item.name || item.id;
}

function resolveItemDate(item: ItemRecord) {
  const dateValue = item.publishedAt || item.created;

  if (!dateValue) {
    return null;
  }

  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString();
}

export function SiteHome({
  host,
  site,
  categories,
  items,
  showRootLink = true
}: {
  host: string;
  site: SiteRecord;
  categories: CategoryRecord[];
  items: ItemRecord[];
  showRootLink?: boolean;
}) {
  const siteTitle = resolveSiteTitle(site, host);
  const siteDescription = resolveSiteDescription(site);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-blue-50 to-white p-4">
      {showRootLink && (
        <div className="absolute top-4 right-4">
          <Link
            href={`${protocol}://${rootDomain}`}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {rootDomain}
          </Link>
        </div>
      )}

      <div className="mx-auto w-full max-w-5xl space-y-10 pt-16">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            {siteTitle}
          </h1>
          <p className="text-lg text-gray-600">{siteDescription}</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Categories</h2>
          {categories.length === 0 ? (
            <p className="text-gray-500">No categories yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <span
                  key={category.id}
                  className="rounded-full bg-white px-4 py-2 text-sm text-gray-700 shadow-sm"
                >
                  {resolveCategoryLabel(category)}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">Latest items</h2>
          {items.length === 0 ? (
            <p className="text-gray-500">No items yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item) => {
                const itemDate = resolveItemDate(item);
                const itemTitle = resolveItemTitle(item);

                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-2">
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-semibold text-blue-600 hover:underline"
                        >
                          {itemTitle}
                        </a>
                      ) : (
                        <div className="text-base font-semibold text-gray-900">
                          {itemTitle}
                        </div>
                      )}
                      {itemDate && (
                        <span className="text-sm text-gray-500">{itemDate}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
