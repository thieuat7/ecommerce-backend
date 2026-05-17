import { Knex } from 'knex';

type CategoryRow = {
  id: number;
  name: string;
  description?: string;
  parent_id: number | null;
};

async function getOrCreateCategory(
  knex: Knex.Transaction,
  payload: { name: string; description?: string; parent_id?: number | null },
): Promise<CategoryRow> {
  const existing = await knex<CategoryRow>('categories')
    .where({
      name: payload.name,
      parent_id: payload.parent_id ?? null,
    })
    .whereNull('deleted_at')
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
    throw new Error(`Seed failed: cannot create category "${payload.name}"`);
  }

  return created;
}

export async function seed(knex: Knex): Promise<void> {
  await knex.transaction(async (trx) => {
    // === Root categories ===
    const electronics = await getOrCreateCategory(trx, {
      name: 'Thiết bị điện tử',
      description: 'Điện thoại, Laptop, Máy tính bảng, Phụ kiện',
    });

    const fashion = await getOrCreateCategory(trx, {
      name: 'Thời trang',
      description: 'Quần áo, Giày dép, Phụ kiện thời trang',
    });

    const homeAppliances = await getOrCreateCategory(trx, {
      name: 'Thiết bị gia dụng',
      description: 'Đồ điện tử gia dụng thông minh',
    });

    // === Sub-categories of Thiết bị điện tử ===
    await getOrCreateCategory(trx, {
      name: 'Điện thoại di động',
      description: 'Smartphone các hãng',
      parent_id: electronics.id,
    });

    await getOrCreateCategory(trx, {
      name: 'Máy tính xách tay',
      description: 'Laptop văn phòng và gaming',
      parent_id: electronics.id,
    });

    await getOrCreateCategory(trx, {
      name: 'Tablet',
      description: 'Máy tính bảng iPad, Samsung...',
      parent_id: electronics.id,
    });

    await getOrCreateCategory(trx, {
      name: 'Phụ kiện',
      description: 'Ốp lưng, cáp sạc, bao da...',
      parent_id: electronics.id,
    });

    await getOrCreateCategory(trx, {
      name: 'Tai nghe',
      description: 'Tai nghe có dây và không dây',
      parent_id: electronics.id,
    });

    await getOrCreateCategory(trx, {
      name: 'Sạc dự phòng',
      description: 'Pin dự phòng dung lượng lớn',
      parent_id: electronics.id,
    });

    // === Sub-categories of Thời trang ===
    await getOrCreateCategory(trx, {
      name: 'Quần áo nam',
      parent_id: fashion.id,
    });

    await getOrCreateCategory(trx, {
      name: 'Quần áo nữ',
      parent_id: fashion.id,
    });

    // === Sub-categories of Thiết bị gia dụng ===
    await getOrCreateCategory(trx, {
      name: 'Robot hút bụi',
      parent_id: homeAppliances.id,
    });

    console.log('[03_categories] Seeded categories tree successfully.');
  });
}
