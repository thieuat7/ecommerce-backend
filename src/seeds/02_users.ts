import { Knex } from 'knex';

type IdRow = { id: number };
type RoleRow = IdRow & { name: string };
type UserRow = IdRow & { email: string };

const PASSWORD_HASH =
  '$2b$10$TbSnfMFcZswyI4aKMpE1vu2XGm22cdIyLQGlp4c8qA9uf2U4Kf.MK'; // hash for "password123"

function assertRow<T>(row: T | undefined, context: string): T {
  if (!row) {
    throw new Error(`Seed failed: missing row for ${context}`);
  }
  return row;
}

export async function seed(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    // Insert users
    await trx('users')
      .insert([
        {
          public_id: 'usr_admin_001',
          full_name: 'Nguyễn Quản Trị',
          email: 'admin@ecommerce.com',
          password: PASSWORD_HASH,
          phone_number: '0901234567',
          is_active: true,
        },
        {
          public_id: 'usr_cust_001',
          full_name: 'Trần Khách Hàng',
          email: 'khachhang@gmail.com',
          password: PASSWORD_HASH,
          phone_number: '0987654321',
          is_active: true,
        },
        {
          public_id: 'usr_cust_002',
          full_name: 'Lê Văn Bình',
          email: 'levanbinh@gmail.com',
          password: PASSWORD_HASH,
          phone_number: '0912345678',
          is_active: true,
        },
      ])
      .onConflict('email')
      .merge([
        'public_id',
        'full_name',
        'password',
        'phone_number',
        'is_active',
      ]);

    const roles = await trx<RoleRow>('roles')
      .whereIn('name', ['admin', 'user'])
      .select(['id', 'name']);

    const users = await trx<UserRow>('users')
      .whereIn('email', [
        'admin@ecommerce.com',
        'khachhang@gmail.com',
        'levanbinh@gmail.com',
      ])
      .select(['id', 'email']);

    const adminRole = assertRow(
      roles.find((r) => r.name === 'admin'),
      'roles.admin',
    );
    const userRole = assertRow(
      roles.find((r) => r.name === 'user'),
      'roles.user',
    );
    const adminUser = assertRow(
      users.find((u) => u.email === 'admin@ecommerce.com'),
      'users.admin',
    );
    const customer1 = assertRow(
      users.find((u) => u.email === 'khachhang@gmail.com'),
      'users.customer1',
    );
    const customer2 = assertRow(
      users.find((u) => u.email === 'levanbinh@gmail.com'),
      'users.customer2',
    );

    // Gán roles
    await trx('user_roles')
      .insert([
        { user_id: adminUser.id, role_id: adminRole.id },
        { user_id: customer1.id, role_id: userRole.id },
        { user_id: customer2.id, role_id: userRole.id },
      ])
      .onConflict(['user_id', 'role_id'])
      .ignore();

    // Auth providers cho local login
    await trx('user_auth_providers')
      .insert([
        {
          user_id: customer1.id,
          provider: 'local',
          provider_id: 'khachhang@gmail.com',
        },
        {
          user_id: customer2.id,
          provider: 'local',
          provider_id: 'levanbinh@gmail.com',
        },
      ])
      .onConflict(['provider', 'provider_id'])
      .ignore();

    // Địa chỉ mặc định cho customer1
    const addr1Exists = await trx<IdRow>('user_addresses')
      .where({ user_id: customer1.id, label: 'Nhà riêng' })
      .first();

    if (!addr1Exists) {
      await trx('user_addresses').insert({
        user_id: customer1.id,
        label: 'Nhà riêng',
        recipient_name: 'Trần Khách Hàng',
        phone_number: '0987654321',
        address_line: '123 Đường Lê Lợi',
        ward: 'Bến Thành',
        district: 'Quận 1',
        province: 'TP.HCM',
        country: 'Vietnam',
        is_default: true,
      });
    }

    // Địa chỉ cho customer2
    const addr2Exists = await trx<IdRow>('user_addresses')
      .where({ user_id: customer2.id, label: 'Văn phòng' })
      .first();

    if (!addr2Exists) {
      await trx('user_addresses').insert({
        user_id: customer2.id,
        label: 'Văn phòng',
        recipient_name: 'Lê Văn Bình',
        phone_number: '0912345678',
        address_line: '45 Đường Nguyễn Huệ',
        ward: 'Phường Bến Nghé',
        district: 'Quận 1',
        province: 'TP.HCM',
        country: 'Vietnam',
        is_default: true,
      });
    }

    console.log(
      '[02_users] Seeded 3 users (admin, customer1, customer2) with roles & addresses.',
    );
  });
}
