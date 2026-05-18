// attribute.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AttributeValue } from './attribute-value.entity';

@Entity('attributes')
export class Attribute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string; // Ví dụ: 'color', 'storage'

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName: string; // Ví dụ: 'Màu sắc', 'Bộ nhớ'

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  // ===============================
  // RELATIONS
  // ===============================
  @OneToMany(() => AttributeValue, (attrValue) => attrValue.attribute)
  values: AttributeValue[];
}
