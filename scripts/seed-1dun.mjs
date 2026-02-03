import fs from 'fs';
import path from 'path';
import PocketBase from 'pocketbase';

function loadEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const PB_URL = process.env.PB_URL;
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL;
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD;

if (!PB_URL || !PB_ADMIN_EMAIL || !PB_ADMIN_PASSWORD) {
  console.error(
    'Missing env. Required: PB_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD'
  );
  process.exit(1);
}

const pb = new PocketBase(PB_URL);

function fieldMap(fields = []) {
  return new Map(fields.map((field) => [field.name, field]));
}

function pickKnownFields(data, fields, extraKeys = []) {
  const result = {};
  const names = new Set(fields.map((field) => field.name));
  for (const key of extraKeys) {
    names.add(key);
  }
  for (const [key, value] of Object.entries(data)) {
    if (names.has(key) && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function defaultValueForField(field, context) {
  switch (field.type) {
    case 'relation': {
      if (field.name === 'owner') return context.ownerId ?? null;
      if (field.name === 'site') return context.siteId ?? null;
      if (field.name === 'category') return context.categoryId ?? null;
      return null;
    }
    case 'select':
      return Array.isArray(field.values) ? field.values[0] : null;
    case 'text':
    case 'email':
    case 'url':
    case 'editor':
      return `seed-${field.name}`;
    case 'number':
      return 0;
    case 'bool':
      return false;
    case 'date':
    case 'autodate':
      return new Date().toISOString();
    default:
      return null;
  }
}

function ensureRequiredFields(data, fields, context) {
  const result = { ...data };

  for (const field of fields) {
    if (!field.required) {
      continue;
    }

    if (result[field.name] !== undefined && result[field.name] !== null) {
      continue;
    }

    if (field.system) {
      continue;
    }

    const fallback = defaultValueForField(field, context);
    if (fallback === null || fallback === undefined) {
      throw new Error(`Missing required field: ${field.name}`);
    }

    result[field.name] = fallback;
  }

  return result;
}

function pickSelectValue(fields, name, preferred) {
  const field = fields.find((item) => item.name === name);
  if (!field || field.type !== 'select') {
    return undefined;
  }

  if (preferred && Array.isArray(field.values)) {
    const found = field.values.find((value) => value === preferred);
    if (found) {
      return found;
    }
  }

  return Array.isArray(field.values) ? field.values[0] : undefined;
}

async function getCollectionFields(collectionName) {
  try {
    const collection = await pb.collections.getOne(collectionName);
    return collection.fields ?? [];
  } catch (error) {
    console.warn(`[seed] Unable to load schema for ${collectionName}`, error);
    return [];
  }
}

async function upsertRecord({
  collection,
  filter,
  createData,
  updateData
}) {
  try {
    const existing = await pb
      .collection(collection)
      .getFirstListItem(filter);
    if (updateData) {
      return await pb
        .collection(collection)
        .update(existing.id, updateData);
    }
    return existing;
  } catch {
    return await pb.collection(collection).create(createData);
  }
}

async function main() {
  await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
  console.info('[seed] Admin authenticated');

  const usersFields = await getCollectionFields('users');
  const sitesFields = await getCollectionFields('sites');
  const domainsFields = await getCollectionFields('domains');
  const categoriesFields = await getCollectionFields('categories');
  const itemsFields = await getCollectionFields('items');

  const ownerEmail = 'seed-1dun@example.com';
  const ownerPassword = 'seed-1dun-password';

  const ownerData = ensureRequiredFields(
    pickKnownFields(
      {
        email: ownerEmail,
        password: ownerPassword,
        passwordConfirm: ownerPassword,
        name: '1dun Seed Owner'
      },
      usersFields,
      ['passwordConfirm']
    ),
    usersFields,
    {}
  );

  const owner = await upsertRecord({
    collection: 'users',
    filter: `email = ${JSON.stringify(ownerEmail)}`,
    createData: ownerData
  });

  console.info('[seed] Owner ready', { ownerId: owner.id });

  const domainStatus = pickSelectValue(domainsFields, 'status', 'active');

  const seedConfigs = [
    {
      hostname: '1dun.co',
      siteSlug: '1dun-co',
      siteName: '1dun.co 站点',
      metaTitle: '1dun.co 标题',
      metaDescription: '这是 1dun.co 的描述内容，用于测试站点元信息。',
      metaKeywords: '1dun.co,测试,关键词',
      categoryTitle: '1dun.co 分类',
      categorySlug: '1dun-co-category',
      itemTitle: '1dun.co 文章',
      itemSlug: '1dun-co-item'
    },
    {
      hostname: 'www.1dun.co',
      siteSlug: 'www-1dun-co',
      siteName: 'www.1dun.co 站点',
      metaTitle: 'www.1dun.co 标题',
      metaDescription: '这是 www.1dun.co 的描述内容，用于测试站点元信息。',
      metaKeywords: 'www.1dun.co,测试,关键词',
      categoryTitle: 'www.1dun.co 分类',
      categorySlug: 'www-1dun-co-category',
      itemTitle: 'www.1dun.co 文章',
      itemSlug: 'www-1dun-co-item'
    },
    {
      hostname: 'download.1dun.co',
      siteSlug: 'download-1dun-co',
      siteName: 'download.1dun.co 下载站点',
      metaTitle: 'download.1dun.co 下载中心',
      metaDescription: 'download.1dun.co 提供最新客户端与工具下载。',
      metaKeywords: 'download.1dun.co,下载,客户端,工具',
      categoryTitle: 'download.1dun.co 下载分类',
      categorySlug: 'download-1dun-co-category',
      itemTitle: 'download.1dun.co 下载条目',
      itemSlug: 'download-1dun-co-item'
    },
    {
      hostname: '1dun.net',
      siteSlug: '1dun-net',
      siteName: '1dun.net 站点',
      metaTitle: '1dun.net 标题',
      metaDescription: '这是 1dun.net 的描述内容，用于测试站点元信息。',
      metaKeywords: '1dun.net,测试,关键词',
      categoryTitle: '1dun.net 分类',
      categorySlug: '1dun-net-category',
      itemTitle: '1dun.net 文章',
      itemSlug: '1dun-net-item'
    },
    {
      hostname: 'www.1dun.net',
      siteSlug: 'www-1dun-net',
      siteName: 'www.1dun.net 站点',
      metaTitle: 'www.1dun.net 标题',
      metaDescription: '这是 www.1dun.net 的描述内容，用于测试站点元信息。',
      metaKeywords: 'www.1dun.net,测试,关键词',
      categoryTitle: 'www.1dun.net 分类',
      categorySlug: 'www-1dun-net-category',
      itemTitle: 'www.1dun.net 文章',
      itemSlug: 'www-1dun-net-item'
    }
  ];

  for (const seed of seedConfigs) {
    const siteBaseData = {
      owner: owner.id,
      site_slug: seed.siteSlug,
      site_name: seed.siteName,
      name: seed.siteName,
      title: seed.siteName,
      description: seed.metaDescription,
      meta_title: seed.metaTitle,
      meta_description: seed.metaDescription,
      meta_keywords: seed.metaKeywords
    };

    const siteData = ensureRequiredFields(
      pickKnownFields(siteBaseData, sitesFields),
      sitesFields,
      { ownerId: owner.id }
    );

    const site = await upsertRecord({
      collection: 'sites',
      filter: `site_slug = ${JSON.stringify(seed.siteSlug)}`,
      createData: siteData,
      updateData: pickKnownFields(siteBaseData, sitesFields)
    });

    console.info('[seed] Site ready', { siteId: site.id, hostname: seed.hostname });

    const domainBase = {
      hostname: seed.hostname,
      site: site.id,
      status: domainStatus
    };

    const domainData = ensureRequiredFields(
      pickKnownFields(domainBase, domainsFields),
      domainsFields,
      { siteId: site.id }
    );

    await upsertRecord({
      collection: 'domains',
      filter: `hostname = ${JSON.stringify(seed.hostname)}`,
      createData: domainData,
      updateData: pickKnownFields(domainBase, domainsFields)
    });

    console.info('[seed] Domain ready', { hostname: seed.hostname });

    const categoryBase = {
      site: site.id,
      title: seed.categoryTitle,
      slug: seed.categorySlug,
      description: `${seed.categoryTitle} 的描述`
    };

    const categoryData = ensureRequiredFields(
      pickKnownFields(categoryBase, categoriesFields),
      categoriesFields,
      { siteId: site.id }
    );

    const category = await upsertRecord({
      collection: 'categories',
      filter: `site = ${JSON.stringify(site.id)} && slug = ${JSON.stringify(
        seed.categorySlug
      )}`,
      createData: categoryData,
      updateData: pickKnownFields(categoryBase, categoriesFields)
    });

    console.info('[seed] Category ready', { categoryId: category.id });

    const itemBase = {
      site: site.id,
      category: category.id,
      title: seed.itemTitle,
      slug: seed.itemSlug,
      excerpt: `${seed.itemTitle} 的摘要内容`,
      content: `这是一条用于 ${seed.hostname} 的示例内容，方便区分不同域名。`
    };

    const itemData = ensureRequiredFields(
      pickKnownFields(itemBase, itemsFields),
      itemsFields,
      { siteId: site.id, categoryId: category.id }
    );

    const item = await upsertRecord({
      collection: 'items',
      filter: `site = ${JSON.stringify(site.id)} && slug = ${JSON.stringify(
        seed.itemSlug
      )}`,
      createData: itemData,
      updateData: pickKnownFields(itemBase, itemsFields)
    });

    console.info('[seed] Item ready', { itemId: item.id });
  }
}

main()
  .then(() => {
    console.info('[seed] Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[seed] Failed', error);
    process.exit(1);
  });
