import type { Knex } from 'knex';

// Phụ thuộc: 1680000000001-CreateEnums (auth_provider_enum)
export const up = async (knex: Knex): Promise<void> => {
  // ─── roles ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('roles', (table: Knex.TableBuilder): void => {
    table.increments('id').primary();
    table.string('name', 50).notNullable().unique();
    table.text('description');
    table.timestamps(true, true);
  });

  // ─── users ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('users', (table: Knex.TableBuilder): void => {
    table.increments('id').primary();
    table.string('public_id', 50).notNullable().unique();
    table.string('full_name', 100).notNullable();
    table.index('full_name');
    table.string('email', 100).notNullable().unique();
    table.index('email');
    table.string('password', 255);
    table.string('phone_number', 20);
    table.text('current_hashed_refresh_token');
    table.timestamps(true, true);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('deleted_at');
  });

  // ─── user_roles (junction) ────────────────────────────────────────────────
  await knex.schema.createTable(
    'user_roles',
    (table: Knex.TableBuilder): void => {
      table
        .integer('user_id')
        .references('id')
        .inTable('users')
        .notNullable()
        .onDelete('CASCADE');
      table
        .integer('role_id')
        .references('id')
        .inTable('roles')
        .notNullable()
        .onDelete('CASCADE');
      table.primary(['user_id', 'role_id']);
    },
  );

  // ─── user_auth_providers ──────────────────────────────────────────────────
  await knex.schema.createTable(
    'user_auth_providers',
    (table: Knex.TableBuilder): void => {
      table.increments('id').primary();
      table
        .integer('user_id')
        .references('id')
        .inTable('users')
        .notNullable()
        .onDelete('CASCADE');
      table.specificType('provider', 'auth_provider_enum').notNullable();
      table.string('provider_id', 255).notNullable();
      table.jsonb('provider_data');
      table.timestamps(true, true);
      table.unique(['provider', 'provider_id']);
      table.index('user_id');
    },
  );
};

export const down = async (knex: Knex): Promise<void> => {
  // Xóa theo thứ tự ngược (child → parent)
  await knex.schema.dropTableIfExists('user_auth_providers');
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('roles');
};
