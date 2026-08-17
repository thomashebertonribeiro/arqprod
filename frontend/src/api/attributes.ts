import { api } from './client';
import type { AttributeDef, Paginated } from './types';

export interface AttributeQuery {
  nivel?: string;
  status?: string;
  tipo_dado?: string;
  page?: number;
  per_page?: number;
}

export function listAttributes(query: AttributeQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  return api<Paginated<AttributeDef>>(`/attributes${qs ? `?${qs}` : ''}`);
}

export function createAttribute(input: {
  nome: string;
  chave: string;
  tipo_dado: AttributeDef['tipoDado'];
  nivel: AttributeDef['nivel'];
  regra_validacao?: {
    obrigatorio?: boolean;
    valor_min?: number;
    valor_max?: number;
    tamanho_max?: number;
    regex?: string;
    mensagem_erro?: string;
  };
  opcoes?: { valor: string }[];
}) {
  return api<AttributeDef>('/attributes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAttribute(
  id: string,
  patch: Partial<{ nome: string; status: 'ativo' | 'arquivado' }>,
) {
  return api<AttributeDef>(`/attributes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function archiveAttribute(id: string) {
  return api<{ id: string; status: string }>(`/attributes/${id}/archive`, {
    method: 'POST',
  });
}

export function addAttributeOption(id: string, valor: string) {
  return api<{ id: string; valor: string }>(`/attributes/${id}/options`, {
    method: 'POST',
    body: JSON.stringify({ valor }),
  });
}

export function listCategoryLinks(categoryId: string) {
  return api<
    { id: string; origem_categoria_id: string; attribute: { id: string } }[]
  >(`/categories/${categoryId}/attributes`);
}

export function linkAttributeToCategory(categoryId: string, attributeId: string) {
  return api<unknown>(`/categories/${categoryId}/attributes`, {
    method: 'POST',
    body: JSON.stringify({ attribute_id: attributeId }),
  });
}

export function unlinkAttributeFromCategory(categoryId: string, attributeId: string) {
  return api<unknown>(`/categories/${categoryId}/attributes/${attributeId}`, {
    method: 'DELETE',
  });
}