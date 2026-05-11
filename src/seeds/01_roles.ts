import { Knex } from 'knex';

const TABLES_TO_TRUNCATE = [
  'cart_items',
  'carts',
  'payments',
  'order_items',
  'orders',
  'stock_logs',
  'product_images',
  'product_attributes',
  'products',
  'user_addresses',
  'categories',
  'user_auth_providers',
  'user_roles',
  'users',
  'roles',
];

function ensureNonProductionDestructiveSeed(): void {
  const currentEnv = (
    process.env.NODE_ENV ||
    process.env.KNEX_ENV ||
    ''
  ).toLowerCase();
  const allowProductionReset =
    process.env.ALLOW_PRODUCTION_SEED_RESET === 'true' ||
    process.env.ALLOW_PROD_SEED_RESET === 'true';

  if (currentEnv === 'production' && !allowProductionReset) {
    throw new Error(
      'Refusing to run destructive seed in production. Set ALLOW_PRODUCTION_SEED_RESET=true to override intentionally.',
    );
  }
}

export async function seed(knex: Knex): Promise<void> {
  ensureNonProductionDestructiveSeed();

  await knex.transaction(async (trx) => {
    const truncateSql = `TRUNCATE TABLE ${TABLES_TO_TRUNCATE.map(
      (tableName) => `"${tableName}"`,
    ).join(', ')} RESTART IDENTITY CASCADE`;

    await trx.raw(truncateSql);

    await trx('roles')
      .insert([
        { name: 'admin', description: 'Quản trị viên hệ thống' },
        { name: 'user', description: 'Khách hàng mua sắm' },
      ])
      .onConflict('name')
      .merge(['description']);
  });
}
