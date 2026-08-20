import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createProduct,
  deleteProduct,
  exportProducts,
  importProducts,
  listCategories,
  listSuppliers,
  listProducts,
} from '../api/products';
import Nav from '../components/Nav';
import { STATUS_CLS } from '../components/ui';
import { useI18n } from '../i18n';
import type { Paginated, ProductListItem, ProductStatus } from '../api/types';

const ROWS_OPTIONS = [10, 25, 50];

const NEW_STATUSES: ProductStatus[] = ['rascunho', 'ativo'];

function SearchIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

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

function KebabIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

export default function Products() {
  const navigate = useNavigate();
  const { t, formatCurrency } = useI18n();
  const [data, setData] = useState<Paginated<ProductListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [categories, setCategories] = useState<{ id: string; nome: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; nome: string }[]>([]);
  const [form, setForm] = useState({
    nome: '',
    sku_base: '',
    descricao: '',
    ean_gtin: '',
    ncm: '',
    cest: '',
    custo: '',
    status: 'rascunho' as ProductStatus,
    category_id: '',
    supplier_id: '',
  });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [csvBusy, setCsvBusy] = useState(false);
  const [csvMsg, setCsvMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onDownloadTemplate() {
    const header =
      'nome,sku,ean,ncm,cest,custo,descricao,status,categoria,marca,fabricante,unidade_venda,data_lancamento,peso_bruto_kg,peso_liquido_kg,altura_cm,largura_cm,profundidade_cm';
    const example =
      '"Camiseta Tech Algodão",CAM-TEC-01,7891234567890,6109.10.00,28.010.00,12.50,"Camiseta de algodão penteado",ativo,Moda,Minha Marca,Minha Fabrica,UN,2026-09-01,0.15,0.12,25,20,2';
    const blob = new Blob(['\uFEFF' + header + '\n' + example + '\n'], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo-importacao.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onExport() {
    setCsvBusy(true);
    setCsvMsg('');
    try {
      const blob = await exportProducts();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'produtos.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setCsvMsg(err instanceof Error ? err.message : t('products.csvFailed'));
    } finally {
      setCsvBusy(false);
    }
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCsvBusy(true);
    setCsvMsg('');
    try {
      const res = await importProducts(file);
      setCsvMsg(
        t('products.csvDone', {
          created: res.created,
          updated: res.updated,
          skipped: res.skipped,
        }),
      );
      load();
    } catch (err) {
      setCsvMsg(err instanceof Error ? err.message : t('products.csvFailed'));
    } finally {
      setCsvBusy(false);
    }
  }

  useEffect(() => {
    if (!modalOpen) return;
    listCategories()
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
    listSuppliers()
      .then((res) => setSuppliers(res.data))
      .catch(() => setSuppliers([]));
  }, [modalOpen]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listProducts({
        page,
        per_page: perPage,
        q: debouncedQ || undefined,
        status: statusFilter || undefined,
      });
      setData(res);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('products.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, perPage, debouncedQ, statusFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  const total = data?.meta.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  const allChecked =
    !!data?.data.length && data.data.every((p) => selected.has(p.id));
  const someChecked = !!data && data.data.some((p) => selected.has(p.id)) && !allChecked;

  const toggleAll = () => {
    if (!data) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        data.data.forEach((p) => next.delete(p.id));
      } else {
        data.data.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > (data?.meta.total_pages ?? 1)) return;
    setPage(p);
  };

  const openModal = () => {
    setForm({ nome: '', sku_base: '', descricao: '', ean_gtin: '', ncm: '', cest: '', custo: '', status: 'rascunho', category_id: '', supplier_id: '' });
    setFormError('');
    setModalOpen(true);
  };

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      setFormError(t('products.nameRequired'));
      return;
    }
    setCreating(true);
    setFormError('');
    try {
      const created = await createProduct({
        nome: form.nome.trim(),
        sku_base: form.sku_base.trim() || undefined,
        descricao: form.descricao.trim() || undefined,
        ean_gtin: form.ean_gtin.trim() || undefined,
        ncm: form.ncm.trim() || undefined,
        cest: form.cest.trim() || undefined,
        custo: form.custo.trim() || undefined,
        status: form.status,
        category_id: form.category_id || undefined,
        supplier_id: form.supplier_id || undefined,
      });
      setModalOpen(false);
      navigate(`/products/${created.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('products.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = async (p: ProductListItem) => {
    if (!window.confirm(t('products.deleteConfirm', { nome: p.nome }))) return;
    setDeleting(p.id);
    setMenuOpen(null);
    try {
      await deleteProduct(p.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('products.deleteFailed'));
    } finally {
      setDeleting(null);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            {t('products.title')}
            {data && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                {total} {total === 1 ? t('products.items') : t('products.itemsPlural')}
              </span>
            )}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownloadTemplate}
              className="flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              title={t('products.csvTemplate')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              {t('products.csvTemplate')}
            </button>
            <button
              onClick={onExport}
              disabled={csvBusy}
              className="flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              title={t('products.exportCsv')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {csvBusy ? '…' : t('products.exportCsv')}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={csvBusy}
              className="flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              title={t('products.importCsv')}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3-3-3m0 0-3 3m3-3V15" />
              </svg>
              {csvBusy ? '…' : t('products.importCsv')}
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onImport} />
            <button
              onClick={openModal}
              className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <PlusIcon />
              {t('products.new')}
            </button>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon />
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('products.search')}
                className="h-9 w-64 rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setFiltersOpen((v) => !v)}
                className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${
                  statusFilter
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FilterIcon />
                {t('products.filter')}
              </button>
              {filtersOpen && (
                <div className="absolute right-0 top-11 z-10 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                  <p className="px-2 pb-1 pt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                    {t('products.col.status')}
                  </p>
                  {['', ...NEW_STATUSES, 'inativo', 'descontinuado'].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setStatusFilter(s);
                        setFiltersOpen(false);
                      }}
                      className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${
                        statusFilter === s
                          ? 'bg-blue-50 font-medium text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {s === '' ? t('products.allStatuses') : t(`status.${s}` as never)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {csvMsg && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
            {csvMsg}
          </div>
        )}

        {selected.size > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">
            {selected.size} {t('products.selected')}
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto font-medium text-blue-700 hover:underline"
            >
              {t('products.clearSelection')}
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="w-10 px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = someChecked;
                      }}
                      onChange={toggleAll}
                      className="h-3.5 w-3.5 rounded border-gray-300 accent-blue-600"
                    />
                  </th>
                  <th className="px-3 py-2.5 font-medium">{t('products.col.product')}</th>
                  <th className="px-3 py-2.5 font-medium">{t('products.col.description')}</th>
                  <th className="px-3 py-2.5 font-medium">{t('products.col.ean')}</th>
                  <th className="px-3 py-2.5 font-medium">{t('products.col.ncm')}</th>
                  <th className="px-3 py-2.5 font-medium">{t('products.col.cest')}</th>
                  <th className="px-3 py-2.5 font-medium">{t('products.col.cost')}</th>
                  <th className="px-3 py-2.5 font-medium">{t('products.col.status')}</th>
                  <th className="w-12 px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-sm text-gray-400">
                      {t('products.loading')}
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-sm text-red-500">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && data?.data.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center">
                      <p className="text-sm font-medium text-gray-700">{t('products.empty')}</p>
                      <p className="mt-1 text-sm text-gray-400">{t('products.emptyHint')}</p>
                    </td>
                  </tr>
                )}
                {!loading &&
                  data?.data.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/products/${p.id}`)}
                      className="cursor-pointer transition hover:bg-gray-50/80"
                    >
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleOne(p.id)}
                          className="h-3.5 w-3.5 rounded border-gray-300 accent-blue-600"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                            {p.thumbnail ? (
                              <img
                                src={p.thumbnail.url}
                                alt={p.thumbnail.alt_text ?? p.nome}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[280px] truncate text-sm font-medium text-gray-900">
                              {p.nome}
                            </p>
                            <p className="text-xs text-gray-400">
                              {p.sku ?? t('products.noSku')}
                              {p.variant_count > 1 ? ` · ${p.variant_count} ${t('products.variants')}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[240px] px-3 py-2.5">
                        <p className="truncate text-sm text-gray-500" title={p.descricao ?? undefined}>
                          {p.descricao || <span className="text-gray-400">—</span>}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                        {p.ean_gtin || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                        {p.ncm || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                        {p.cest || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-700">
                        {p.custo ? formatCurrency(p.custo, 'BRL') : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLS[p.status]}`}
                        >
                          {t(`status.${p.status}` as never)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block">
                          <button
                            onClick={() => setMenuOpen(menuOpen === p.id ? null : p.id)}
                            disabled={deleting === p.id}
                            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                            aria-label={t('products.actions')}
                          >
                            {deleting === p.id ? (
                              <span className="block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                            ) : (
                              <KebabIcon />
                            )}
                          </button>
                          {menuOpen === p.id && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setMenuOpen(null)}
                              />
                              <div className="absolute right-0 top-9 z-30 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                                <button
                                  onClick={() => {
                                    setMenuOpen(null);
                                    navigate(`/products/${p.id}`);
                                  }}
                                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                                >
                                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                  </svg>
                                  {t('common.edit')}
                                </button>
                                <button
                                  onClick={() => confirmDelete(p)}
                                  className="flex w-full items-center gap-2 border-t border-gray-100 px-3.5 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                  </svg>
                                  {t('common.delete')}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {t('products.rowsPerPage')}
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500"
              >
                {ROWS_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm tabular-nums text-gray-500">
                {from}–{to} {t('common.of')} {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
                  aria-label={t('products.title')}
                >
                  <ChevronLeft />
                </button>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= (data?.meta.total_pages ?? 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
                  aria-label={t('products.title')}
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
          </div>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{t('products.modal.title')}</h2>
                  <p className="mt-0.5 text-xs text-gray-400">{t('products.modal.subtitle')}</p>
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
                    {t('products.form.name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    autoFocus
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    placeholder={t('products.form.placeholderName')}
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t('products.form.skuBase')}
                    </label>
                    <input
                      value={form.sku_base}
                      onChange={(e) => setForm((f) => ({ ...f, sku_base: e.target.value }))}
                      placeholder={t('products.form.placeholderSku')}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t('products.form.status')}
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, status: e.target.value as ProductStatus }))
                      }
                      className={inputCls}
                    >
                      {NEW_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s === 'rascunho' ? t('products.form.draft') : t('products.form.active')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t('products.form.ean')}
                    </label>
                    <input
                      value={form.ean_gtin}
                      onChange={(e) => setForm((f) => ({ ...f, ean_gtin: e.target.value }))}
                      placeholder={t('products.form.eanPh')}
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t('products.form.ncm')}
                    </label>
                    <input
                      value={form.ncm}
                      onChange={(e) => setForm((f) => ({ ...f, ncm: e.target.value }))}
                      placeholder={t('products.form.ncmPh')}
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t('products.form.cest')}
                    </label>
                    <input
                      value={form.cest}
                      onChange={(e) => setForm((f) => ({ ...f, cest: e.target.value }))}
                      placeholder={t('products.form.cestPh')}
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t('products.form.cost')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.custo}
                      onChange={(e) => setForm((f) => ({ ...f, custo: e.target.value }))}
                      placeholder={t('products.form.costPh')}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t('products.form.category')}
                    </label>
                    <select
                      value={form.category_id}
                      onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="">—</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                      {t('products.form.supplier')}
                    </label>
                    <select
                      value={form.supplier_id}
                      onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="">—</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                    {t('products.form.description')}
                  </label>
                  <textarea
                    value={form.descricao}
                    onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                    rows={3}
                    placeholder={t('products.form.descriptionPlaceholder')}
                    className={`${inputCls} resize-none`}
                  />
                </div>

                {formError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
                )}

                <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    disabled={creating}
                    className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creating ? t('products.form.creating') : t('products.form.create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}