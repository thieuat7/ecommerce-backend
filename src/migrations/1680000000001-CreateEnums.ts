import type { Knex } from 'knex';

// Tạo tất cả PostgreSQL ENUM types dùng chung toàn hệ thống.
// DROP ... CASCADE trong down() để tránh lỗi FK khi rollback tuần tự.
export const up = async (knex: Knex): Promise<void> => {
  await knex.raw(`
    DROP TYPE IF EXISTS auth_provider_enum CASCADE;
    CREATE TYPE auth_provider_enum AS ENUM ('local', 'google', 'facebook', 'apple');

    DROP TYPE IF EXISTS order_status_enum CASCADE;
    CREATE TYPE order_status_enum AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');

    DROP TYPE IF EXISTS payment_method_enum CASCADE;
    CREATE TYPE payment_method_enum AS ENUM ('cod', 'credit_card', 'bank_transfer', 'e_wallet', 'momo');

    DROP TYPE IF EXISTS payment_status_enum CASCADE;
    CREATE TYPE payment_status_enum AS ENUM ('pending', 'completed', 'failed', 'refunded');

    DROP TYPE IF EXISTS stock_log_action_enum CASCADE;
    CREATE TYPE stock_log_action_enum AS ENUM ('in', 'out', 'adjustment');
  `);
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.raw(`
    DROP TYPE IF EXISTS payment_status_enum CASCADE;
    DROP TYPE IF EXISTS payment_method_enum CASCADE;
    DROP TYPE IF EXISTS order_status_enum CASCADE;
    DROP TYPE IF EXISTS stock_log_action_enum CASCADE;
    DROP TYPE IF EXISTS auth_provider_enum CASCADE;
  `);
};
