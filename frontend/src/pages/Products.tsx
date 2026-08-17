import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearToken } from '../api/client';
import { listProducts } from '../api/products';
import type { Paginated, ProductListItem } from '../api/types';

const ROWS_OPTIONS = [10, 25, 50];

const STATUS_BADGES: Record<ProductListItem['status'], { label: string; cls: string }> = {
  ativo: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  rascunho: { label: 'Draft', cls: 'bg-gray-100 text-gray-600 ring-gray-500/20' },
  inativo: { label: 'Inactive', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  descontinuado: { label: 'Discontinued', cls: 'bg-gray-100 text-gray-500 ring-gray-500/10' },
};

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

export default function Products() {
  const navigate = useNavigate();
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
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
      setError(err instanceof Error ? err.message : 'Falha ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, [page, perPage, debouncedQ, statusFilter]);

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

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
              A
            </div>
            <span className="text-sm font-semibold text-gray-900">Arqprod</span>
          </div>
          <button
            onClick={() => {
              clearToken();
              navigate('/login');
            }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Products
            {data && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                {total} {total === 1 ? 'item' : 'items'}
              </span>
            )}
          </h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon />
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products"
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
                Filter
              </button>
              {filtersOpen && (
                <div className="absolute right-0 top-11 z-10 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                  <p className="px-2 pb-1 pt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                    Status
                  </p>
                  {['', 'ativo', 'rascunho', 'inativo', 'descontinuado'].map((s) => (
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
                      {s === '' ? 'All statuses' : STATUS_BADGES[s as ProductListItem['status']].label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-800">
            {selected.size} selected
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto font-medium text-blue-700 hover:underline"
            >
              Clear selection
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
                  <th className="px-3 py-2.5 font-medium">Product</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Inventory</th>
                  <th className="px-3 py-2.5 font-medium">Sales channels</th>
                  <th className="px-3 py-2.5 font-medium">Markets</th>
                  <th className="px-3 py-2.5 font-medium">Category</th>
                  <th className="px-3 py-2.5 font-medium">Space</th>
                  <th className="px-3 py-2.5 font-medium">Vendor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-sm text-gray-400">
                      Loading products…
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-sm text-red-500">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && data?.data.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <p className="text-sm font-medium text-gray-700">No products found</p>
                      <p className="mt-1 text-sm text-gray-400">
                        Try adjusting your search or filters.
                      </p>
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
                              {p.sku ?? 'Sem SKU'}
                              {p.variant_count > 1 ? ` · ${p.variant_count} variants` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_BADGES[p.status].cls}`}
                        >
                          {STATUS_BADGES[p.status].label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        {p.inventory.tracked ? (
                          <span
                            className={`text-sm ${
                              p.inventory.total_available === 0
                                ? 'font-medium text-red-600'
                                : 'text-gray-700'
                            }`}
                          >
                            {p.inventory.total_available} in stock
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">
                            Inventory not tracked
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-700">
                        {p.sales_channels > 0 ? p.sales_channels : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-700">
                        {p.markets > 0 ? p.markets : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-700">
                        {p.category?.nome ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-700">
                        {p.space || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-sm text-gray-700">
                        {p.supplier?.nome ?? <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              Rows per page
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
                {from}–{to} of {total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
                  aria-label="Previous page"
                >
                  <ChevronLeft />
                </button>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= (data?.meta.total_pages ?? 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
                  aria-label="Next page"
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}