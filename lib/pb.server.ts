import 'server-only';

import PocketBase from 'pocketbase';

const pbUrl = process.env.PB_URL;
const pbAdminToken = process.env.PB_ADMIN_TOKEN;

if (!pbUrl) {
  throw new Error('PB_URL is not set');
}

export function getPocketBaseAdminClient() {
  const pb = new PocketBase(pbUrl);

  if (pbAdminToken) {
    pb.authStore.save(pbAdminToken, null);
  }

  return pb;
}
