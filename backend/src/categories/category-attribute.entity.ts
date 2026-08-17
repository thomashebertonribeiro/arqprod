import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Category } from '../categories/category.entity';
import { Attribute } from '../attributes/attribute.entity';

@Entity('category_attributes')
@Unique('UQ_category_attribute', ['categoryId', 'attributeId'])
export class CategoryAttribute {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'attribute_id' })
  attributeId: string;

  @ManyToOne(() => Attribute, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attribute_id' })
  attribute: Attribute;

  @Column({ name: 'obrigatorio_na_categoria', default: false })
  obrigatorioNaCategoria: boolean;

  @Column({ default: 0 })
  ordem: number;

  @Column({ name: 'herda_de_categoria_pai', default: false })
  herdaDeCategoriaPai: boolean;
}