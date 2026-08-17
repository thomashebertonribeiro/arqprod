import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { ApiKey } from '../api-keys/api-key.entity';
import { Category } from '../categories/category.entity';
import { Attribute } from '../attributes/attribute.entity';
import { AttributeGroup } from '../attribute-groups/attribute-group.entity';
import { Product } from '../products/product.entity';
import { Channel } from '../channels/channel.entity';
import { Warehouse } from '../warehouses/warehouse.entity';
import { Tag } from '../tags/tag.entity';
import { Supplier } from '../suppliers/supplier.entity';
import { Integration } from '../integrations/integration.entity';
import { Webhook } from '../webhooks/webhook.entity';

export type OrganizationPlan = 'free' | 'pro' | 'enterprise';
export type OrganizationStatus = 'ativo' | 'suspenso' | 'cancelado';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column({ unique: true })
  slug: string;

  @Column({ default: 'free' })
  plano: OrganizationPlan;

  @Column({ default: 'ativo' })
  status: OrganizationStatus;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  configuracoes: Record<string, unknown>;

  @CreateDateColumn({ name: 'criado_em' })
  criadoEm: Date;

  @OneToMany(() => User, (u) => u.organization)
  users: User[];

  @OneToMany(() => ApiKey, (k) => k.organization)
  apiKeys: ApiKey[];

  @OneToMany(() => Category, (c) => c.organization)
  categories: Category[];

  @OneToMany(() => Attribute, (a) => a.organization)
  attributes: Attribute[];

  @OneToMany(() => AttributeGroup, (g) => g.organization)
  attributeGroups: AttributeGroup[];

  @OneToMany(() => Product, (p) => p.organization)
  products: Product[];

  @OneToMany(() => Channel, (c) => c.organization)
  channels: Channel[];

  @OneToMany(() => Warehouse, (w) => w.organization)
  warehouses: Warehouse[];

  @OneToMany(() => Tag, (t) => t.organization)
  tags: Tag[];

  @OneToMany(() => Supplier, (s) => s.organization)
  suppliers: Supplier[];

  @OneToMany(() => Integration, (i) => i.organization)
  integrations: Integration[];

  @OneToMany(() => Webhook, (w) => w.organization)
  webhooks: Webhook[];
}