/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import knex from 'knex';

const knexInstance = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'ecommerce',
  },
});

async function seed(): Promise<void> {
  const trx = await knexInstance.transaction();

  try {
    // ===============================
    // 1. ROLES
    // ===============================
    await trx('roles')
      .insert([
        { name: 'admin', description: 'Quản trị viên toàn quyền hệ thống' },
        { name: 'user', description: 'Người dùng' },
      ])
      .onConflict('name')
      .ignore();

    // ===============================
    // 2. USERS
    // ===============================
    await trx('users')
      .insert([
        {
          public_id: 'usr_admin_999',
          full_name: 'Nguyễn Quản Trị',
          email: 'admin@ecommerce.com',
          password:
            '$2b$10$TbSnfMFcZswyI4aKMpE1vu2XGm22cdIyLQGlp4c8qA9uf2U4Kf.MK',
          auth_provider: 'local',
          phone_number: '0901234567',
          address: 'Hà Nội, Việt Nam',
        },
        {
          public_id: 'usr_cust_001',
          full_name: 'Trần Khách Hàng',
          email: 'khachhang@gmail.com',
          password:
            '$2b$10$TbSnfMFcZswyI4aKMpE1vu2XGm22cdIyLQGlp4c8qA9uf2U4Kf.MK',
          auth_provider: 'local',
          phone_number: '0987654321',
          address: 'TP.HCM, Việt Nam',
        },
      ])
      .onConflict('email')
      .ignore();

    // ===============================
    // 3. USER ROLES
    // ===============================
    const adminUser = (await trx('users')
      .where('email', 'admin@ecommerce.com')
      .first()) as any;
    const adminRole = (await trx('roles')
      .where('name', 'admin')
      .first()) as any;

    if (adminUser && adminRole) {
      await trx('user_roles')
        .insert({
          user_id: adminUser.id,
          role_id: adminRole.id,
        })
        .onConflict(['user_id', 'role_id'])
        .ignore();
    }

    const customerUser = (await trx('users')
      .where('email', 'khachhang@gmail.com')
      .first()) as any;
    const userRole = (await trx('roles').where('name', 'user').first()) as any;

    if (customerUser && userRole) {
      await trx('user_roles')
        .insert({
          user_id: customerUser.id,
          role_id: userRole.id,
        })
        .onConflict(['user_id', 'role_id'])
        .ignore();
    }

    // ===============================
    // 4. CATEGORIES
    // ===============================
    await trx('categories')
      .insert([
        { name: 'Điện thoại', description: 'Các dòng smartphone mới nhất' },
        { name: 'Laptop', description: 'Máy tính xách tay' },
        { name: 'Phụ kiện', description: 'Tai nghe, sạc' },
        { name: 'Đồng hồ thông minh', description: 'Smartwatch' },
      ])
      .onConflict('name')
      .ignore();

    // ===============================
    // 5. PRODUCTS
    // ===============================
    const phoneCategory = (await trx('categories')
      .where('name', 'Điện thoại')
      .first()) as any;
    const laptopCategory = (await trx('categories')
      .where('name', 'Laptop')
      .first()) as any;
    const accessoryCategory = (await trx('categories')
      .where('name', 'Phụ kiện')
      .first()) as any;

    if (phoneCategory && laptopCategory && accessoryCategory) {
      await trx('products')
        .insert([
          {
            public_id: 'prod_phone_001',
            category_id: phoneCategory.id,
            name: 'iPhone 15 Pro Max',
            description: 'Apple flagship',
            price: 1199.0,
            stock_quantity: 50,
            image_url: '/images/iphone.jpg',
          },
          {
            public_id: 'prod_lap_001',
            category_id: laptopCategory.id,
            name: 'MacBook Pro M3',
            description: 'Laptop Apple',
            price: 1599.0,
            stock_quantity: 15,
            image_url: '/images/macbook.jpg',
          },
          {
            public_id: 'prod_acc_001',
            category_id: accessoryCategory.id,
            name: 'AirPods Pro 2',
            description: 'Tai nghe Apple',
            price: 249.0,
            stock_quantity: 200,
            image_url: '/images/airpods.jpg',
          },
        ])
        .onConflict('public_id')
        .ignore();
    }

    // ✅ commit nếu OK
    await trx.commit();
    console.log('✅ Seed data FULL done');
  } catch (error) {
    // ❌ rollback nếu lỗi
    await trx.rollback();
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    // 🔥 luôn close connection
    await knexInstance.destroy();
  }
}

seed().catch((err: unknown) => {
  console.error('❌ Fatal seed error:', err);
  process.exit(1);
});
