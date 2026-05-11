import { Knex } from 'knex';

type IdRow = { id: number };
const PASSWORD_HASH =
  '$2b$10$TbSnfMFcZswyI4aKMpE1vu2XGm22cdIyLQGlp4c8qA9uf2U4Kf.MK'; // hash for "password123"
type RoleRow = IdRow & { name: string };
type UserRow = IdRow & { email: string };
type UserAuthProviderRow = IdRow & {
  user_id: number;
  provider: string;
  provider_id: string;
};
type UserAddressRow = IdRow & {
  user_id: number;
  label: string;
};

function assertRow<T>(row: T | undefined, context: string): T {
  if (!row) {
    throw new Error(`Seed failed: missing row for ${context}`);
  }
  return row;
}

export async function seed(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    await trx('users')
      .insert([
        {
          public_id: 'usr_admin_001',
          full_name: 'Nguyễn Quản Trị',
          email: 'admin@ecommerce.com',
          password: PASSWORD_HASH,
        },
        {
          public_id: 'usr_cust_001',
          full_name: 'Trần Khách Hàng',
          email: 'khachhang@gmail.com',
          password: PASSWORD_HASH,
          phone_number: '0987654321',
        },
      ])
      .onConflict('email')
      .merge(['public_id', 'full_name', 'password', 'phone_number']);

    const roles = await trx<RoleRow>('roles')
      .whereIn('name', ['admin', 'user'])
      .select(['id', 'name']);

    const users = await trx<UserRow>('users')
      .whereIn('email', ['admin@ecommerce.com', 'khachhang@gmail.com'])
      .select(['id', 'email']);

    const adminRole = assertRow(
      roles.find((row) => row.name === 'admin'),
      'roles.admin',
    );
    const userRole = assertRow(
      roles.find((row) => row.name === 'user'),
      'roles.user',
    );
    const adminUser = assertRow(
      users.find((row) => row.email === 'admin@ecommerce.com'),
      'users.admin',
    );
    const customerUser = assertRow(
      users.find((row) => row.email === 'khachhang@gmail.com'),
      'users.customer',
    );

    await trx('user_roles')
      .insert([
        { user_id: adminUser.id, role_id: adminRole.id },
        { user_id: customerUser.id, role_id: userRole.id },
      ])
      .onConflict(['user_id', 'role_id'])
      .ignore();

    const providerExists = await trx<UserAuthProviderRow>('user_auth_providers')
      .where({ provider: 'local', provider_id: 'khachhang@gmail.com' })
      .first('id');

    if (!providerExists) {
      await trx('user_auth_providers').insert({
        user_id: customerUser.id,
        provider: 'local',
        provider_id: 'khachhang@gmail.com',
      });
    }

    const addressExists = await trx<UserAddressRow>('user_addresses')
      .where({ user_id: customerUser.id, label: 'Nhà riêng' })
      .first('id');

    if (!addressExists) {
      await trx('user_addresses').insert({
        user_id: customerUser.id,
        label: 'Nhà riêng',
        recipient_name: 'Trần Khách Hàng',
        phone_number: '0987654321',
        address_line: '123 Đường Lê Lợi',
        ward: 'Bến Thành',
        district: 'Quận 1',
        province: 'TP.HCM',
        is_default: true,
      });
    }
  });
}
