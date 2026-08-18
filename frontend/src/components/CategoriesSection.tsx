import { useCallback, useEffect, useState } from 'react';
import {
  createCategory,
  deleteCategory,
  listCategories,
  normalizeSlug,
  updateCategory,
  type CategoryNode,
} from '../api/categories';
import { useI18n } from '../i18n';

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

function flatList(nodes: CategoryNode[]): CategoryNode[] {
  const out: CategoryNode[] = [];
  const walk = (list: CategoryNode[], depth: number) => {
    for (const n of list) {
      out.push({ ...n, __depth: depth } as CategoryNode);
      if (n.children?.length) walk(n.children, depth + 1);
    }
  };
  walk(nodes, 0);
  return out;
}

export default function CategoriesSection() {
  const { t } = useI18n();
  const [data, setData] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', slug: '', parent_id: '', ordem: '' });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const [editCat, setEditCat] = useState<CategoryNode | null>(null);
  const [editForm, setEditForm] = useState({ nome: '', slug: '', ordem: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listCategories();
      setData(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('categories.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openModal = () => {
    setForm({ nome: '', slug: '', parent_id: '', ordem: '' });
    setFormError('');
    setModalOpen(true);
  };

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      setFormError(t('categories.form.nameRequired'));
      return;
    }
    if (!form.slug.trim()) {
      setFormError(t('categories.form.slugRequired'));
      return;
    }
    setBusy(true);
    setFormError('');
    try {
      await createCategory({
        nome: form.nome.trim(),
        slug: form.slug.trim(),
        parent_id: form.parent_id || undefined,
        ordem: form.ordem !== '' ? Number(form.ordem) : undefined,
      });
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('categories.createFailed'));
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (cat: CategoryNode) => {
    setEditCat(cat);
    setEditForm({ nome: cat.nome, slug: cat.slug, ordem: String(cat.ordem) });
    setFormError('');
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCat || !editForm.nome.trim() || !editForm.slug.trim()) return;
    setBusy(true);
    setFormError('');
    try {
      await updateCategory(editCat.id, {
        nome: editForm.nome.trim(),
        slug: editForm.slug.trim(),
        ...(editForm.ordem !== '' ? { ordem: Number(editForm.ordem) } : {}),
      });
      setEditCat(null);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('categories.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (cat: CategoryNode) => {
    const msg =
      (cat.children?.length ?? 0) > 0
        ? t('categories.deleteConfirmChildren', { nome: cat.nome })
        : t('categories.deleteConfirm', { nome: cat.nome });
    if (!window.confirm(msg)) return;
    try {
      await deleteCategory(cat.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('categories.deleteFailed'));
    }
  };

  const total = data.length;
  const rows = flatList(data);
  const allCats = rows;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('categories.title')}
            <span className="ml-2 text-sm font-normal text-gray-400">
              {total} {total === 1 ? t('categories.count') : t('categories.countPlural')}
            </span>
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">{t('categories.subtitle')}</p>
        </div>
        <button
          onClick={openModal}
          className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <PlusIcon />
          {t('categories.new')}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/70 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2.5 font-medium">{t('categories.col.category')}</th>
              <th className="px-3 py-2.5 font-medium">{t('categories.col.slug')}</th>
              <th className="px-3 py-2.5 font-medium">{t('categories.col.order')}</th>
              <th className="px-4 py-2.5 text-right font-medium">{t('categories.col.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-16 text-center text-sm text-gray-400">
                  {t('categories.loading')}
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={4} className="px-4 py-16 text-center text-sm text-red-500">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && total === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-16 text-center">
                  <p className="text-sm font-medium text-gray-700">{t('categories.empty')}</p>
                  <p className="mt-1 text-sm text-gray-400">{t('categories.emptyHint')}</p>
                </td>
              </tr>
            )}
            {!loading && rows.map((cat) => (
              <tr key={cat.id} className="text-sm transition hover:bg-gray-50/80">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5" style={{ paddingLeft: `${(cat as CategoryNode & { __depth: number }).__depth * 20}px` }}>
                    {(cat as CategoryNode & { __depth: number }).__depth > 0 && <ChevronRight />}
                    <span className="font-medium text-gray-900">{cat.nome}</span>
                    {(cat.children?.length ?? 0) > 0 && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                        {cat.children?.length}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 font-mono text-xs text-gray-500">{cat.slug}</td>
                <td className="px-3 py-3 text-gray-600">{cat.ordem}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(cat)}
                      className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => remove(cat)}
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------------ modal nova categoria */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{t('categories.modal.title')}</h2>
                <p className="mt-0.5 text-xs text-gray-400">{t('categories.modal.immutableSlug')}</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label={t('common.close')}
              >
                <XIcon />
              </button>
            </div>

            <form onSubmit={submitNew} className="space-y-4 px-5 py-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('categories.form.name')} <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={form.nome}
                  onChange={(e) => {
                    const nome = e.target.value;
                    setForm((f) => ({
                      ...f,
                      nome,
                      slug: f.slug === '' || f.slug === normalizeSlug(f.nome) ? normalizeSlug(nome) : f.slug,
                    }));
                  }}
                  placeholder={t('categories.form.namePh')}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('categories.form.slug')} <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="eletronicos"
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                    {t('categories.form.parent')}
                  </label>
                  <select
                    value={form.parent_id}
                    onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
                    className={inputCls}
                  >
                    <option value="">{t('categories.form.root')}</option>
                    {allCats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                    {t('categories.form.order')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.ordem}
                    onChange={(e) => setForm((f) => ({ ...f, ordem: e.target.value }))}
                    placeholder="0"
                    className={inputCls}
                  />
                </div>
              </div>

              {formError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
              )}

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={busy}
                  className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? t('categories.form.creating') : t('categories.form.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ modal editar */}
      {editCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{t('categories.edit.title')}</h2>
                <p className="mt-0.5 text-xs text-gray-400">{t('categories.edit.slugHint')}</p>
              </div>
              <button
                onClick={() => setEditCat(null)}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label={t('common.close')}
              >
                <XIcon />
              </button>
            </div>

            <form onSubmit={saveEdit} className="space-y-4 px-5 py-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('categories.form.name')}
                </label>
                <input
                  value={editForm.nome}
                  onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                    {t('categories.form.slug')}
                  </label>
                  <input
                    value={editForm.slug}
                    onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                    {t('categories.form.order')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.ordem}
                    onChange={(e) => setEditForm((f) => ({ ...f, ordem: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>

              {formError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
              )}

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditCat(null)}
                  disabled={busy}
                  className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={busy || !editForm.nome.trim() || !editForm.slug.trim()}
                  className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? t('categories.edit.saving') : t('categories.edit.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}