import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1680000000000 implements MigrationInterface {
  name = 'InitSchema1680000000000';

  // ==========================================
  // HÀM UP: CHẠY ĐỂ TẠO CƠ SỞ DỮ LIỆU
  // ==========================================
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            -- A. TẠO CÁC KIỂU DỮ LIỆU ENUM
            CREATE TYPE auth_provider_enum AS ENUM ('local', 'google', 'facebook', 'apple');
            CREATE TYPE order_status_enum AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
            CREATE TYPE payment_method_enum AS ENUM ('cod', 'credit_card', 'bank_transfer', 'e_wallet', 'momo');
            CREATE TYPE payment_status_enum AS ENUM ('pending', 'completed', 'failed', 'refunded');

            -- B. TẠO HÀM TỰ ĐỘNG CẬP NHẬT updated_at
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            -- 1. ROLES
            CREATE TABLE roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TRIGGER update_roles_modtime BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

            -- 2. USERS
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                public_id VARCHAR(50) UNIQUE NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NULL,
                auth_provider auth_provider_enum DEFAULT 'local',
                provider_id VARCHAR(255) NULL,
                phone_number VARCHAR(20),
                address TEXT,
                current_hashed_refresh_token TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL,
                UNIQUE (auth_provider, provider_id)
            );
            CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

            -- 3. USER ROLES (N-N)
            CREATE TABLE user_roles (
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                role_id INT REFERENCES roles(id) ON DELETE CASCADE,
                PRIMARY KEY (user_id, role_id)
            );

            -- 4. CATEGORIES
            CREATE TABLE categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TRIGGER update_categories_modtime BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

            -- 5. PRODUCTS
            CREATE TABLE products (
                id SERIAL PRIMARY KEY,
                public_id VARCHAR(50) UNIQUE NOT NULL,
                category_id INT REFERENCES categories(id) ON DELETE SET NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
                stock_quantity INT DEFAULT 0 CHECK (stock_quantity >= 0),
                image_url VARCHAR(255),
                version INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL
            );
            CREATE TRIGGER update_products_modtime BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            CREATE INDEX idx_products_category_id ON products(category_id);

            -- 6. ORDERS
            CREATE TABLE orders (
                id SERIAL PRIMARY KEY,
                order_code VARCHAR(50) UNIQUE NOT NULL,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
                status order_status_enum DEFAULT 'pending',
                shipping_address TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP NULL
            );
            CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            CREATE INDEX idx_orders_user_id ON orders(user_id);

            -- 7. ORDER ITEMS
            CREATE TABLE order_items (
                id SERIAL PRIMARY KEY,
                order_id INT REFERENCES orders(id) ON DELETE CASCADE,
                product_id INT REFERENCES products(id) ON DELETE NO ACTION,
                quantity INT NOT NULL CHECK (quantity > 0),
                price_at_purchase DECIMAL(10, 2) NOT NULL CHECK (price_at_purchase >= 0),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (order_id, product_id)
            );
            CREATE INDEX idx_order_items_product_id ON order_items(product_id);

            -- 8. PAYMENTS
            CREATE TABLE payments (
                id SERIAL PRIMARY KEY,
                public_id VARCHAR(50) UNIQUE NOT NULL,
                order_id INT REFERENCES orders(id) ON DELETE CASCADE,
                amount DECIMAL(10, 2) NOT NULL,
                payment_method payment_method_enum NOT NULL,
                payment_status payment_status_enum DEFAULT 'pending',
                transaction_id VARCHAR(100) UNIQUE,
                momo_trans_id VARCHAR(100),
                paid_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TRIGGER update_payments_modtime BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            CREATE INDEX idx_payments_order_id ON payments(order_id);
        `);
  }

  // ==========================================
  // HÀM DOWN: CHẠY KHI MUỐN ROLLBACK/HOÀN TÁC
  // ==========================================
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            -- 1. Xóa các bảng theo thứ tự từ dưới lên trên (để không vi phạm Foreign Key)
            DROP TABLE IF EXISTS payments CASCADE;
            DROP TABLE IF EXISTS order_items CASCADE;
            DROP TABLE IF EXISTS orders CASCADE;
            DROP TABLE IF EXISTS products CASCADE;
            DROP TABLE IF EXISTS categories CASCADE;
            DROP TABLE IF EXISTS user_roles CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
            DROP TABLE IF EXISTS roles CASCADE;

            -- 2. Xóa hàm trigger
            DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

            -- 3. Xóa các kiểu dữ liệu ENUM
            DROP TYPE IF EXISTS payment_status_enum CASCADE;
            DROP TYPE IF EXISTS payment_method_enum CASCADE;
            DROP TYPE IF EXISTS order_status_enum CASCADE;
            DROP TYPE IF EXISTS auth_provider_enum CASCADE;
        `);
  }
}
