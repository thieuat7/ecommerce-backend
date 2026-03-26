import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1711440000000 implements MigrationInterface {
  name = 'InitialSchema1711440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Kích hoạt Extension pgcrypto
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // 2. Tạo ENUM TYPE cho trạng thái đơn hàng
    await queryRunner.query(`
            CREATE TYPE order_status AS ENUM (
                'PENDING', 'PAID', 'FAILED', 'CANCELLED', 'COMPLETED'
            )
        `);

    // 3. Bảng USERS
    await queryRunner.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
                email VARCHAR(255) NOT NULL UNIQUE,
                name VARCHAR(255) NOT NULL,
                password TEXT NOT NULL,
                current_hashed_refresh_token TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // 4. Bảng PRODUCTS
    await queryRunner.query(`
            CREATE TABLE products (
                id SERIAL PRIMARY KEY,
                public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
                stock INT NOT NULL CHECK (stock >= 0),
                locked_stock INT NOT NULL DEFAULT 0 CHECK (locked_stock >= 0),
                version INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // 5. Bảng ORDERS
    await queryRunner.query(`
            CREATE TABLE orders (
                id SERIAL PRIMARY KEY,
                public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
                user_id INT NOT NULL,
                status order_status NOT NULL DEFAULT 'PENDING',
                total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

    // 6. Bảng ORDER_ITEMS
    await queryRunner.query(`
            CREATE TABLE order_items (
                id SERIAL PRIMARY KEY,
                order_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity INT NOT NULL CHECK (quantity > 0),
                price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
                CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id)
            )
        `);

    // 7. Thêm UNIQUE CONSTRAINT & INDEXES
    await queryRunner.query(
      `ALTER TABLE order_items ADD CONSTRAINT unique_order_product UNIQUE (order_id, product_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_users_public_id ON users(public_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_products_public_id ON products(public_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_orders_user_id ON orders(user_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_orders_public_id ON orders(public_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_order_items_order_id ON order_items(order_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_order_items_product_id ON order_items(product_id)`,
    );

    // 8. SEED DỮ LIỆU TEST
    await queryRunner.query(
      `INSERT INTO users (email, name, password) VALUES ('test@gmail.com', 'Ngo Ta', '123456_hashed')`,
    );
    await queryRunner.query(`
            INSERT INTO products (name, price, stock, version)
            VALUES 
                ('Bàn phím cơ', 1500000.00, 100, 0),
                ('Chuột không dây Logitech', 450000.00, 150, 0),
                ('Màn hình Dell 24 inch', 3500000.00, 50, 0),
                ('Tai nghe Bluetooth Sony', 1200000.00, 200, 0),
                ('Laptop Gaming Asus', 25000000.00, 20, 0),
                ('Bàn di chuột RGB', 250000.00, 300, 0),
                ('Cáp sạc Type-C Anker', 150000.00, 500, 0),
                ('Củ sạc nhanh 20W', 200000.00, 400, 0),
                ('Giá đỡ laptop nhôm', 300000.00, 120, 0),
                ('Balo chống nước', 550000.00, 80, 0),
                ('Ổ cứng SSD 512GB Samsung', 1100000.00, 90, 0),
                ('RAM Corsair DDR4 16GB', 950000.00, 150, 0),
                ('Bàn phím giả cơ', 350000.00, 200, 0),
                ('Webcam Logitech Full HD', 850000.00, 60, 0),
                ('Micro thu âm Rode', 1400000.00, 40, 0),
                ('Loa vi tính 2.1', 750000.00, 70, 0),
                ('USB 64GB Kingston', 120000.00, 600, 0),
                ('Hub chuyển đổi USB Type-C', 650000.00, 110, 0),
                ('Tay cầm chơi game Xbox', 1800000.00, 85, 0),
                ('Ghế công thái học', 3200000.00, 30, 0)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Hủy theo thứ tự ngược lại để không bị lỗi khóa ngoại (Foreign Key)
    await queryRunner.query(`DROP TABLE order_items`);
    await queryRunner.query(`DROP TABLE orders`);
    await queryRunner.query(`DROP TABLE products`);
    await queryRunner.query(`DROP TABLE users`);
    await queryRunner.query(`DROP TYPE order_status`);
  }
}
