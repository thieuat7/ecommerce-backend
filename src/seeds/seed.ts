// src/seeds/seed.ts
import { AppDataSource } from '../data-source';
import { QueryRunner } from 'typeorm';

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  const queryRunner: QueryRunner = AppDataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // ===============================
    // 1. ROLES
    // ===============================
    await queryRunner.query(`
      INSERT INTO roles (name, description) VALUES
      ('admin', 'Quản trị viên toàn quyền hệ thống'),
      ('user', 'Người dùng')
      ON CONFLICT (name) DO NOTHING;
    `);

    // ===============================
    // 2. USERS
    // ===============================
    await queryRunner.query(`
      INSERT INTO users (public_id, full_name, email, password, auth_provider, phone_number, address)
      VALUES
      ('usr_admin_999', 'Nguyễn Quản Trị', 'admin@ecommerce.com', '$2b$10$TbSnfMFcZswyI4aKMpE1vu2XGm22cdIyLQGlp4c8qA9uf2U4Kf.MK', 'local', '0901234567', 'Hà Nội, Việt Nam'),
      ('usr_cust_001', 'Trần Khách Hàng', 'khachhang@gmail.com', '$2b$10$TbSnfMFcZswyI4aKMpE1vu2XGm22cdIyLQGlp4c8qA9uf2U4Kf.MK', 'local', '0987654321', 'TP.HCM, Việt Nam')
      ON CONFLICT (email) DO NOTHING;
    `);

    // ===============================
    // 3. USER ROLES
    // ===============================
    await queryRunner.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT u.id, r.id
      FROM users u, roles r
      WHERE u.email = 'admin@ecommerce.com' AND r.name = 'admin'
      ON CONFLICT (user_id, role_id) DO NOTHING;;
    `);

    await queryRunner.query(`
      INSERT INTO user_roles (user_id, role_id)
      SELECT u.id, r.id
      FROM users u, roles r
      WHERE u.email = 'khachhang@gmail.com' AND r.name = 'user'
      ON CONFLICT (user_id, role_id) DO NOTHING;
    `);

    // ===============================
    // 4. CATEGORIES
    // ===============================
    await queryRunner.query(`
      INSERT INTO categories (name, description) VALUES
      ('Điện thoại', 'Các dòng smartphone mới nhất'),
      ('Laptop', 'Máy tính xách tay'),
      ('Phụ kiện', 'Tai nghe, sạc'),
      ('Đồng hồ thông minh', 'Smartwatch')
      ON CONFLICT (name) DO NOTHING;
    `);

    // ===============================
    // 5. PRODUCTS
    // ===============================
    await queryRunner.query(`
      INSERT INTO products (public_id, category_id, name, description, price, stock_quantity, image_url)
      VALUES
      ('prod_phone_001', (SELECT id FROM categories WHERE name='Điện thoại'), 'iPhone 15 Pro Max', 'Apple flagship', 1199.00, 50, '/images/iphone.jpg'),
      ('prod_lap_001', (SELECT id FROM categories WHERE name='Laptop'), 'MacBook Pro M3', 'Laptop Apple', 1599.00, 15, '/images/macbook.jpg'),
      ('prod_acc_001', (SELECT id FROM categories WHERE name='Phụ kiện'), 'AirPods Pro 2', 'Tai nghe Apple', 249.00, 200, '/images/airpods.jpg')
      ON CONFLICT (public_id) DO NOTHING;
    `);

    // ✅ commit nếu OK
    await queryRunner.commitTransaction();

    console.log('✅ Seed data FULL done');
  } catch (error) {
    // ❌ rollback nếu lỗi
    await queryRunner.rollbackTransaction();
    console.error('❌ Seed failed:', error);
  } finally {
    // 🔥 luôn release
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

seed().catch((err: unknown) => {
  console.error('❌ Fatal seed error:', err);
  process.exit(1);
});
