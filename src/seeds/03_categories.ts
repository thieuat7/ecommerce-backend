import { Knex } from 'knex';

type CategoryRow = {
  id: number;
  name: string;
  description?: string;
  parent_id: number | null;
};

async function getOrCreateCategory(
  knex: Knex.Transaction,
  payload: { name: string; description?: string; parent_id?: number },
): Promise<CategoryRow> {
  const existing = await knex<CategoryRow>('categories')
    .where({ name: payload.name, parent_id: payload.parent_id ?? null })
    .first(['id', 'name', 'description', 'parent_id']);

  if (existing) {
    return existing;
  }

  const [created] = await knex<CategoryRow>('categories')
    .insert({
      name: payload.name,
      description: payload.description,
      parent_id: payload.parent_id ?? null,
    })
    .returning(['id', 'name', 'description', 'parent_id']);

  if (!created) {
    throw new Error(`Seed failed: cannot create category ${payload.name}`);
  }

  return created;
}

export async function seed(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    const electronics = await getOrCreateCategory(trx, {
      name: 'Thiết bị điện tử',
      description: 'Điện thoại, Laptop, Phụ kiện',
    });

    await getOrCreateCategory(trx, {
      name: 'Thời trang',
      description: 'Quần áo, Giày dép',
    });

    await getOrCreateCategory(trx, {
      name: 'Điện thoại di động',
      parent_id: electronics.id,
    });

    await getOrCreateCategory(trx, {
      name: 'Máy tính xách tay',
      parent_id: electronics.id,
    });

    await getOrCreateCategory(trx, {
      name: 'Tablet',
      parent_id: electronics.id,
    });

    await getOrCreateCategory(trx, {
      name: 'Phụ kiện',
      parent_id: electronics.id,
    });

    await getOrCreateCategory(trx, {
      name: 'Tai nghe',
      parent_id: electronics.id,
    });

    await getOrCreateCategory(trx, {
      name: 'Sạc dự phòng',
      parent_id: electronics.id,
    });
  });
}
