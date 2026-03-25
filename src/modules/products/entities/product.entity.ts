import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  VersionColumn,
  Check,
} from 'typeorm';

@Entity('products')
@Check(`"price" >= 0`)
@Check(`"stock" >= 0`)
@Check(`"locked_stock" >= 0`)
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'uuid',
    unique: true,
    default: () => 'gen_random_uuid()',
  })
  public_id: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  name: string;

  @Column({
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  price: number;

  @Column({
    type: 'int',
  })
  stock: number;

  @Column({
    type: 'int',
    default: 0,
  })
  locked_stock: number;

  @VersionColumn({
    type: 'int',
    default: 0,
  })
  version: number;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;
}
