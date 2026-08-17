import { api } from './client';

export interface CategoryNode {
  id: string;
  nome: string;
  slug: string;
  parentId: string | null;
  ordem: number;
  children?: CategoryNode[];
}

export function listCategories() {
  return api<{ data: CategoryNode[]; meta: { total: number } }>('/categories');
}

export function createCategory(input: {
  nome: string;
  slug: string;
  parent_id?: string;
  ordem?: number;
}) {
  return api<CategoryNode>('/categories', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateCategory(
  id: string,
  patch: Partial<{ nome: string; slug: string; ordem: number }>,
) {
  return api<CategoryNode>(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function deleteCategory(id: string) {
  return api<{ id: string }>(`/categories/${id}`, {
    method: 'DELETE',
  });
}

export function normalizeSlug(nome: string) {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}