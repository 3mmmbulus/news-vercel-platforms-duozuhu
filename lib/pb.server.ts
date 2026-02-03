import 'server-only';

import PocketBase from 'pocketbase';

const pbUrl = process.env.PB_URL;
const pbAdminEmail = process.env.PB_ADMIN_EMAIL;
const pbAdminPassword = process.env.PB_ADMIN_PASSWORD;

let pbClient: PocketBase | null = null;
let authPromise: Promise<void> | null = null;

function getClient() {
  if (!pbUrl) {
    return null;
  }

  if (!pbClient) {
    pbClient = new PocketBase(pbUrl);
  }

  return pbClient;
}

async function ensureAdminAuth(pb: PocketBase) {
  if (pb.authStore.isValid) {
    return;
  }

  if (!pbAdminEmail || !pbAdminPassword) {
    throw new Error('PB_ADMIN_EMAIL or PB_ADMIN_PASSWORD is not set');
  }

  if (!authPromise) {
    authPromise = pb.admins
      .authWithPassword(pbAdminEmail, pbAdminPassword)
      .then(() => {
        authPromise = null;
      })
      .catch((error: unknown) => {
        authPromise = null;
        throw error;
      });
  }

  await authPromise;
}

export async function getPocketBaseAdminClient() {
  const pb = getClient();

  if (!pb) {
    return null;
  }

  await ensureAdminAuth(pb);
  return pb;
}
