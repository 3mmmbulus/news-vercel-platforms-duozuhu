import Link from 'next/link';
import { headers } from 'next/headers';
import { rootDomain, protocol } from '@/lib/utils';

export default async function NotFound() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const hostname = host?.split(':')[0];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          域名未绑定
        </h1>
        <p className="text-lg text-gray-600">
          {hostname ? (
            <>当前访问域名 <span className="font-semibold">{hostname}</span> 尚未绑定站点。</>
          ) : (
            '当前访问域名尚未绑定站点。'
          )}
        </p>
        <div className="pt-2">
          <Link
            href={`${protocol}://${rootDomain}`}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            返回平台入口
          </Link>
        </div>
      </div>
    </div>
  );
}
