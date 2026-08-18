import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getProduct,
  getVariantPrices,
  getVariantStock,
  saveProductAttributeValues,
  updateProduct,
  uploadProductImage,
} from '../api/products';
import type {
  AttributeDef,
  ProductDetail as ProductDetailType,
  ProductStatus,
  VariantPriceRow,
  VariantStockRow,
} from '../api/types';
import { ALL_STATUSES, STATUS_BADGES, StatusBadge, SummaryRow } from '../components/ui';
import AttrRow from '../components/AttrRow';
import Nav from '../components/Nav';
import VariantsTable from '../components/VariantsTable';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductDetailType | null>(null);
  const [schema, setSchema] = useState<AttributeDef[]>([]);
  const [variantData, setVariantData] = useState<
    Record<string, { stock: VariantStockRow[]; prices: VariantPriceRow[] }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusBusy, setStatusBusy] = useState(false);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const p = await getProduct(id);
      setProduct(p);
      setSchema(p.fields);
      setDraft(Object.fromEntries(p.attribute_values.map((v) => [v.chave, v.valor])));

      const entries = await Promise.all(
        p.variants.map(async (v) => {
          const [stock, prices] = await Promise.all([
            getVariantStock(v.id).catch(() => ({ data: [] as VariantStockRow[] })),
            getVariantPrices(v.id).catch(() => ({ data: [] as VariantPriceRow[] })),
          ]);
          return [v.id, { stock: stock.data, prices: prices.data }] as const;
        }),
      );
      setVariantData(Object.fromEntries(entries));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar produto');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !id) return;
    setUploading(true);
    setUploadError('');
    try {
      await uploadProductImage(id, file);
      await load();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Falha no upload');
    } finally {
      setUploading(false);
    }
  };

  const productAttrs = useMemo(
    () => schema.filter((a) => a.nivel === 'produto'),
    [schema],
  );
  const variantAttrs = useMemo(
    () => schema.filter((a) => a.nivel === 'variacao'),
    [schema],
  );

  async function changeStatus(next: ProductStatus) {
    if (!product || next === product.status) return;
    setStatusBusy(true);
    try {
      const updated = await updateProduct(product.id, { status: next });
      setProduct(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar status');
    } finally {
      setStatusBusy(false);
    }
  }

  async function saveAttributes() {
    if (!product) return;
    setSaving(true);
    setSaveError('');
    try {
      const valores = productAttrs
        .filter((a) => draft[a.chave] !== undefined)
        .map((a) => ({ atributo: a.chave, valor: draft[a.chave] }));
      const res = await saveProductAttributeValues(product.id, valores);
      setProduct((prev) => (prev ? { ...prev, attribute_values: res.data } : prev));
      setDraft(Object.fromEntries(res.data.map((v) => [v.chave, v.valor])));
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-400">Loading product…</div>
      </div>
    );
  }
  if (error && !product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-gray-50">
        <p className="text-sm text-red-500">{error}</p>
        <Link to="/products" className="text-sm text-blue-600 hover:underline">
          ← Voltar para a listagem
        </Link>
      </div>
    );
  }
  if (!product) return null;

  const mainImage = product.images[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />

      <div className="mx-auto max-w-7xl px-6 pt-4">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                {product.nome}
              </h1>
              <StatusBadge status={product.status} />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {product.sku ?? product.sku_base ?? 'Sem SKU'}
              {product.category ? ` · ${product.category.nome}` : ''}
              {product.supplier ? ` · ${product.supplier.nome}` : ''}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-500">
            Status
            <select
              value={product.status}
              disabled={statusBusy}
              onChange={(e) => changeStatus(e.target.value as ProductStatus)}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_BADGES[s].label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ------------------------------- coluna principal */}
          <div className="space-y-6 lg:col-span-2">
            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {mainImage ? (
                  <div className="flex h-64 items-center justify-center bg-gray-100">
                    <img
                      src={mainImage.url}
                      alt={mainImage.alt_text ?? product.nome}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-48 flex-col items-center justify-center gap-1.5 bg-gray-50">
                    <p className="text-sm text-gray-400">Nenhuma imagem cadastrada</p>
                    <p className="text-xs text-gray-400">JPEG ou PNG · 1200x1200px · RGB</p>
                  </div>
                )}
                <div className="flex items-center gap-2 border-t border-gray-100 p-3">
                  {product.images.map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt={img.alt_text ?? ''}
                      className="h-14 w-14 rounded-lg border border-gray-200 object-cover"
                    />
                  ))}
                  <label
                    title="JPEG ou PNG, exatamente 1200x1200px, espaço de cor RGB"
                    className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    {uploading ? (
                      <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    )}
                    {uploading ? 'Enviando…' : 'Adicionar imagem'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      disabled={uploading}
                      onChange={onPickImage}
                    />
                  </label>
                </div>
                {uploadError && (
                  <div className="border-t border-gray-100 bg-red-50 px-4 py-2 text-xs text-red-600">
                    {uploadError}
                  </div>
                )}
              </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-900">Descrição</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
                {product.descricao || 'Sem descrição.'}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-gray-100 pt-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-gray-400">SKU base</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">
                    {product.sku_base ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Origem</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">
                    {product.origem_integracao ?? 'Manual'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Criado em</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">
                    {new Date(product.criado_em).toLocaleDateString('pt-BR')}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Campos customizados */}
            <section className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Campos customizados
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      {productAttrs.length} {productAttrs.length === 1 ? 'campo' : 'campos'}
                    </span>
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Campos globais — aparecem em todos os produtos
                  </p>
                </div>
                {!editing ? (
                  <button
                    onClick={() => {
                      setDraft(
                        Object.fromEntries(
                          product.attribute_values.map((v) => [v.chave, v.valor]),
                        ),
                      );
                      setSaveError('');
                      setEditing(true);
                    }}
                    disabled={productAttrs.length === 0}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                  >
                    Editar valores
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setDraft(
                          Object.fromEntries(
                            product.attribute_values.map((v) => [v.chave, v.valor]),
                          ),
                        );
                        setEditing(false);
                        setSaveError('');
                      }}
                      disabled={saving}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveAttributes}
                      disabled={saving}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Salvando…' : 'Salvar'}
                    </button>
                  </div>
                )}
              </div>

              {productAttrs.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400">
                  Nenhum campo customizado vinculado a esta categoria. Crie campos em{' '}
                  <span className="font-mono text-xs">POST /attributes</span> e vincule via{' '}
                  <span className="font-mono text-xs">POST /categories/:id/attributes</span>.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {productAttrs.map((attr) => (
                    <AttrRow
                      key={attr.id}
                      attr={attr}
                      editing={editing}
                      value={draft[attr.chave]}
                      onChange={(v) =>
                        setDraft((prev) => ({ ...prev, [attr.chave]: v }))
                      }
                    />
                  ))}
                </div>
              )}
              {saveError && (
                <p className="border-t border-red-100 bg-red-50 px-5 py-2.5 text-sm text-red-600">
                  {saveError}
                </p>
              )}
            </section>

            {/* Variações */}
            <section className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  Variações
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {product.variants.length}{' '}
                    {product.variants.length === 1 ? 'variação' : 'variações'}
                  </span>
                </h2>
              </div>
              <VariantsTable
                variants={product.variants}
                variantAttrs={variantAttrs}
                data={variantData}
              />
            </section>
          </div>

          {/* ------------------------------- sidebar */}
          <aside className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold text-gray-900">Resumo</h2>
              <dl className="space-y-3 text-sm">
                <SummaryRow
                  label="Inventory"
                  value={
                    product.inventory.tracked
                      ? `${product.inventory.total_available} available`
                      : 'Not tracked'
                  }
                  danger={
                    product.inventory.tracked && product.inventory.total_available === 0
                  }
                />
                <SummaryRow label="Sales channels" value={String(product.sales_channels)} />
                <SummaryRow label="Markets" value={String(product.markets)} />
                <SummaryRow label="Space" value={product.space || '—'} />
                <SummaryRow label="Vendor" value={product.supplier?.nome ?? '—'} />
                <SummaryRow label="Category" value={product.category?.nome ?? '—'} />
                <SummaryRow label="Variações" value={String(product.variant_count)} />
              </dl>
            </div>

            {product.tags.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold text-gray-900">Tags</h2>
                <div className="flex flex-wrap gap-1.5">
                  {product.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">API</h2>
              <div className="space-y-1.5 text-xs text-gray-500">
                <p>
                  <span className="font-mono text-gray-700">GET /products/{product.id}</span>
                </p>
                <p>
                  <span className="font-mono text-gray-700">
                    POST /products/{product.id}/attribute-values
                  </span>
                  <br />
                  Campos dinâmicos, sem migração de schema.
                </p>
                <p>
                  <span className="font-mono text-gray-700">
                    GET /categories/{product.category_id ?? '…'}/attributes
                  </span>
                  <br />
                  Formulário dinâmico da categoria.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}