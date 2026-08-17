export type ProductStatus = 'rascunho' | 'ativo' | 'inativo' | 'descontinuado';

export interface ProductListItem {
  id: string;
  nome: string;
  sku_base: string | null;
  sku: string | null;
  status: ProductStatus;
  category: { id: string; nome: string } | null;
  category_id: string | null;
  supplier: { id: string; nome: string } | null;
  supplier_id: string | null;
  origem_integracao: string | null;
  criado_em: string;
  atualizado_em: string;
  thumbnail: { url: string; alt_text: string | null } | null;
  inventory: { total_available: number; tracked: boolean };
  sales_channels: number;
  markets: number;
  space: string;
  variant_count: number;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export type AttributeDataType =
  | 'texto'
  | 'numero'
  | 'booleano'
  | 'lista'
  | 'lista_multipla'
  | 'data';

export interface AttributeValidationRule {
  obrigatorio: boolean;
  valor_min: string | null;
  valor_max: string | null;
  tamanho_max: number | null;
  regex: string | null;
  mensagem_erro: string | null;
}

export interface AttributeOption {
  id: string;
  valor: string;
  ordem: number;
  status: 'ativo' | 'arquivado';
}

export interface AttributeDef {
  id: string;
  nome: string;
  chave: string;
  tipoDado: AttributeDataType;
  nivel: 'produto' | 'variacao';
  status: 'ativo' | 'arquivado';
  validationRules: AttributeValidationRule[];
  options: AttributeOption[];
}

export interface CategoryAttributeLink {
  id: string;
  herdado: boolean;
  origem_categoria_id: string;
  obrigatorio_na_categoria: boolean;
  ordem: number;
  attribute: AttributeDef;
}

export interface AttributeValueRow {
  id: string;
  atributo_id: string;
  chave: string;
  nome: string;
  tipo_dado: string;
  valor: unknown;
  atualizado_em: string;
}

export interface ProductVariantDetail {
  id: string;
  sku: string;
  ean_gtin: string | null;
  combinacao: Record<string, string>;
  peso_kg: string | null;
  status: 'ativo' | 'inativo';
  criado_em: string;
  values: Record<string, unknown>;
}

export interface ProductDetail {
  id: string;
  nome: string;
  sku_base: string | null;
  sku: string | null;
  status: ProductStatus;
  category: { id: string; nome: string } | null;
  category_id: string | null;
  supplier: { id: string; nome: string } | null;
  supplier_id: string | null;
  origem_integracao: string | null;
  criado_em: string;
  atualizado_em: string;
  thumbnail: { url: string; alt_text: string | null } | null;
  inventory: { total_available: number; tracked: boolean };
  sales_channels: number;
  markets: number;
  space: string;
  variant_count: number;
  descricao: string | null;
  atributos: Record<string, unknown>;
  images: { id: string; url: string; alt_text: string | null; ordem: number }[];
  tags: string[];
  attribute_values: AttributeValueRow[];
  variants: ProductVariantDetail[];
  fields: AttributeDef[];
}

export interface VariantStockRow {
  id: string;
  productVariantId: string;
  warehouseId: string;
  warehouse: { id: string; nome: string } | null;
  quantidade: number;
  reservado: number;
  disponivel: number;
  atualizadoEm: string;
}

export interface VariantPriceRow {
  id: string;
  productVariantId: string;
  channelId: string;
  channel: { id: string; nome: string } | null;
  moeda: string;
  valor: string;
  valor_promocional: string | null;
}