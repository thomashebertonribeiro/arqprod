import { api, ApiError, getToken } from './client';
import type {
  AttributeValueRow,
  CategoryAttributeLink,
  NamedRef,
  Paginated,
  ProductAuditRow,
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

export function updateProduct(
  id: string,
  patch: Partial<{
    nome: string;
    descricao: string;
    sku_base: string;
    ean_gtin: string | null;
    ncm: string | null;
    cest: string | null;
    custo: string | null;
    brand_id: string | null;
    manufacturer_id: string | null;
    unidade_venda: string | null;
    data_lancamento: string | null;
    peso_bruto_kg: string | null;
    peso_liquido_kg: string | null;
    altura_cm: string | null;
    largura_cm: string | null;
    profundidade_cm: string | null;
    status: ProductStatus;
  }>,
) {
  return api<ProductDetail>(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function createProduct(input: {
  nome: string;
  descricao?: string;
  sku_base?: string;
  ean_gtin?: string;
  ncm?: string;
  cest?: string;
  custo?: string;
  category_id?: string;
  supplier_id?: string;
  brand_id?: string;
  manufacturer_id?: string;
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

export function uploadProductImage(productId: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return fetch(`/api/products/${productId}/images/upload`, {
    method: 'POST',
    headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    body: form,
  }).then(async (res) => {
    if (!res.ok) {
      let message = `Erro ${res.status}`;
      try {
        const body = (await res.json()) as { message?: string };
        if (body.message) message = body.message;
      } catch {
        /* corpo não-JSON */
      }
      throw new ApiError(res.status, message);
    }
    return (await res.json()) as { id: string; url: string };
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

export function listBrands() {
  return api<{ data: NamedRef[] }>('/brands');
}

export function createBrand(nome: string) {
  return api<NamedRef>('/brands', { method: 'POST', body: JSON.stringify({ nome }) });
}

export function listManufacturers() {
  return api<{ data: NamedRef[] }>('/manufacturers');
}

export function createManufacturer(nome: string) {
  return api<NamedRef>('/manufacturers', { method: 'POST', body: JSON.stringify({ nome }) });
}

export function listChannels() {
  return api<{ data: NamedRef[] }>('/channels');
}

export function listWarehouses() {
  return api<{ data: NamedRef[] }>('/warehouses');
}

export function listTags() {
  return api<{ data: NamedRef[] }>('/tags');
}

export function addProductTags(productId: string, tags: string[]) {
  return api<ProductDetail>(`/products/${productId}/tags`, {
    method: 'POST',
    body: JSON.stringify({ tags }),
  });
}

export function removeProductTag(productId: string, tagId: string) {
  return api<ProductDetail>(`/products/${productId}/tags/${tagId}`, {
    method: 'DELETE',
  });
}

export function duplicateProduct(productId: string) {
  return api<ProductDetail>(`/products/${productId}/duplicate`, { method: 'POST' });
}

export function getProductAudits(productId: string) {
  return api<{ data: ProductAuditRow[] }>(`/products/${productId}/audits`);
}

export function setVariantPrice(variantId: string, channelId: string, valor: number, valorPromocional?: number) {
  return api<{ id: string }>(`/prices/${channelId}/variants/${variantId}`, {
    method: 'POST',
    body: JSON.stringify({ moeda: 'BRL', valor, valor_promocional: valorPromocional }),
  });
}

export function setVariantStock(variantId: string, warehouseId: string, quantidade: number, reservado = 0) {
  return api<{ id: string }>('/stock', {
    method: 'POST',
    body: JSON.stringify({ product_variant_id: variantId, warehouse_id: warehouseId, quantidade, reservado }),
  });
}

export function createVariant(
  productId: string,
  input: { sku: string; ean_gtin?: string; combinacao?: Record<string, string>; peso_kg?: number },
) {
  return api<{ id: string; sku: string }>(`/products/${productId}/variants`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateVariant(
  productId: string,
  variantId: string,
  patch: { sku?: string; ean_gtin?: string | null; status?: 'ativo' | 'inativo' },
) {
  return api<{ id: string; sku: string }>(`/products/${productId}/variants/${variantId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function exportProducts() {
  return fetch('/api/products/export', {
    headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
  }).then(async (res) => {
    if (!res.ok) throw new ApiError(res.status, `Erro ${res.status}`);
    return res.blob();
  });
}

export function importProducts(file: File) {
  const form = new FormData();
  form.append('file', file);
  return fetch('/api/products/import', {
    method: 'POST',
    headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    body: form,
  }).then(async (res) => {
    if (!res.ok) {
      let message = `Erro ${res.status}`;
      try {
        const body = (await res.json()) as { message?: string };
        if (body.message) message = body.message;
      } catch {
        /* corpo não-JSON */
      }
      throw new ApiError(res.status, message);
    }
    return (await res.json()) as { created: number; updated: number; skipped: number };
  });
}