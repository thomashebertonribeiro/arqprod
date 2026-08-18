import { api } from './client';
import type {
  AttributeValueRow,
  CategoryAttributeLink,
  Paginated,
  ProductDetail,
  ProductListItem,
  ProductStatus,
  VariantPriceRow,
  VariantStockRow,
} from './types';

export function login(email: string, senha: string) {
  return api<{ access_token: string; user: { nome: string; papel: string } }>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    },
  );
}

export interface ProductQuery {
  page?: number;
  per_page?: number;
  q?: string;
  status?: string;
  category_id?: string;
}

export function listProducts(query: ProductQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  return api<Paginated<ProductListItem>>(`/products${qs ? `?${qs}` : ''}`);
}

export function getProduct(id: string) {
  return api<ProductDetail>(`/products/${id}`);
}

export function updateProduct(id: string, patch: Partial<{ nome: string; status: ProductStatus }>) {
  return api<ProductDetail>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function createProduct(input: {
  nome: string;
  descricao?: string;
  sku_base?: string;
  category_id?: string;
  supplier_id?: string;
  status?: ProductStatus;
}) {
  return api<ProductDetail>('/products', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteProduct(id: string) {
  return api<{ id: string }>(`/products/${id}`, {
    method: 'DELETE',
  });
}

export function getCategoryAttributes(categoryId: string) {
  return api<CategoryAttributeLink[]>(`/categories/${categoryId}/attributes`);
}

export function saveProductAttributeValues(
  productId: string,
  valores: { atributo: string; valor: unknown }[],
) {
  return api<{ data: AttributeValueRow[] }>(`/products/${productId}/attribute-values`, {
    method: 'POST',
    body: JSON.stringify({ valores }),
  });
}

export function getVariantStock(variantId: string) {
  return api<{ data: VariantStockRow[] }>(`/stock/variant/${variantId}`);
}

export function getVariantPrices(variantId: string) {
  return api<{ data: VariantPriceRow[] }>(`/prices/variant/${variantId}`);
}

export function listCategories() {
  return api<Paginated<{ id: string; nome: string; slug: string }>>('/categories');
}

export function listSuppliers() {
  return api<{ data: { id: string; nome: string }[] }>('/suppliers');
}