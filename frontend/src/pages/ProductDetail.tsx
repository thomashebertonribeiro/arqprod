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
import { ALL_STATUSES, StatusBadge, SummaryRow } from '../components/ui';
import AttrRow from '../components/AttrRow';
import Nav from '../components/Nav';
import VariantsTable from '../components/VariantsTable';
import { useI18n } from '../i18n';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { t, formatCurrency, formatDate } = useI18n();
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
  const [comercialEditing, setComercialEditing] = useState(false);
  const [comercialDraft, setComercialDraft] = useState({
    ean_gtin: '',
    ncm: '',
    cest: '',
    custo: '',
  });
  const [comercialSaving, setComercialSaving] = useState(false);
  const [comercialError, setComercialError] = useState('');
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
      setError(err instanceof Error ? err.message : t('detail.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

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
      setUploadError(err instanceof Error ? err.message : t('detail.uploadFailed'));
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
      setError(err instanceof Error ? err.message : t('detail.saveFailed'));
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
      setSaveError(err instanceof Error ? err.message : t('detail.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function saveCommercial() {
    if (!product) return;
    setComercialSaving(true);
    setComercialError('');
    try {
      const updated = await updateProduct(product.id, {
        ean_gtin: comercialDraft.ean_gtin.trim() || null,
        ncm: comercialDraft.ncm.trim() || null,
        cest: comercialDraft.cest.trim() || null,
        custo: comercialDraft.custo.trim() || null,
      });
      setProduct(updated);
      setComercialEditing(false);
    } catch (err) {
      setComercialError(err instanceof Error ? err.message : t('detail.saveFailed'));
    } finally {
      setComercialSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-400">{t('detail.loading')}</div>
      </div>
    );
  }
  if (error && !product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-gray-50">
        <p className="text-sm text-red-500">{error}</p>
        <Link to="/products" className="text-sm text-blue-600 hover:underline">
          {t('detail.back')}
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
              {product.sku ?? product.sku_base ?? t('products.noSku')}
              {product.category ? ` · ${product.category.nome}` : ''}
              {product.supplier ? ` · ${product.supplier.nome}` : ''}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-500">
            {t('products.form.status')}
            <select
              value={product.status}
              disabled={statusBusy}
              onChange={(e) => changeStatus(e.target.value as ProductStatus)}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
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
                    <p className="text-sm text-gray-400">{t('detail.noImages')}</p>
                    <p className="text-xs text-gray-400">{t('detail.imageHint')}</p>
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
                    {uploading ? t('detail.uploading') : t('detail.addImage')}
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
              <h2 className="text-sm font-semibold text-gray-900">{t('detail.description')}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
                {product.descricao || t('detail.noDescription')}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-gray-100 pt-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-gray-400">{t('detail.skuBase')}</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">
                    {product.sku_base ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">{t('detail.origin')}</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">
                    {product.origem_integracao ?? t('detail.manual')}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">{t('detail.createdAt')}</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">
                    {formatDate(product.criado_em)}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Dados comerciais (EAN, NCM, CEST, Custo) */}
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">{t('detail.commercial')}</h2>
                  <p className="mt-0.5 text-xs text-gray-400">{t('detail.commercialHint')}</p>
                </div>
                {!comercialEditing ? (
                  <button
                    onClick={() => {
                      setComercialDraft({
                        ean_gtin: product.ean_gtin ?? '',
                        ncm: product.ncm ?? '',
                        cest: product.cest ?? '',
                        custo: product.custo ?? '',
                      });
                      setComercialError('');
                      setComercialEditing(true);
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    {t('detail.editValues')}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setComercialEditing(false);
                        setComercialError('');
                      }}
                      disabled={comercialSaving}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={saveCommercial}
                      disabled={comercialSaving}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {comercialSaving ? t('common.saving') : t('detail.save')}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-gray-400">{t('detail.ean')}</dt>
                  {comercialEditing ? (
                    <input
                      value={comercialDraft.ean_gtin}
                      onChange={(e) =>
                        setComercialDraft((d) => ({ ...d, ean_gtin: e.target.value }))
                      }
                      placeholder={t('detail.eanPh')}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm font-mono outline-none transition focus:border-blue-500"
                    />
                  ) : (
                    <dd className="mt-0.5 font-mono font-medium text-gray-900">
                      {product.ean_gtin ?? <span className="text-gray-400">—</span>}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-gray-400">{t('detail.ncm')}</dt>
                  {comercialEditing ? (
                    <input
                      value={comercialDraft.ncm}
                      onChange={(e) => setComercialDraft((d) => ({ ...d, ncm: e.target.value }))}
                      placeholder={t('detail.ncmPh')}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm font-mono outline-none transition focus:border-blue-500"
                    />
                  ) : (
                    <dd className="mt-0.5 font-mono font-medium text-gray-900">
                      {product.ncm ?? <span className="text-gray-400">—</span>}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-gray-400">{t('detail.cest')}</dt>
                  {comercialEditing ? (
                    <input
                      value={comercialDraft.cest}
                      onChange={(e) => setComercialDraft((d) => ({ ...d, cest: e.target.value }))}
                      placeholder={t('detail.cestPh')}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm font-mono outline-none transition focus:border-blue-500"
                    />
                  ) : (
                    <dd className="mt-0.5 font-mono font-medium text-gray-900">
                      {product.cest ?? <span className="text-gray-400">—</span>}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-gray-400">{t('detail.cost')}</dt>
                  {comercialEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={comercialDraft.custo}
                      onChange={(e) => setComercialDraft((d) => ({ ...d, custo: e.target.value }))}
                      placeholder={t('detail.costPh')}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none transition focus:border-blue-500"
                    />
                  ) : (
                    <dd className="mt-0.5 font-medium text-gray-900">
                      {product.custo
                        ? formatCurrency(product.custo, 'BRL')
                        : <span className="text-gray-400">—</span>}
                    </dd>
                  )}
                </div>
              </div>
              {comercialError && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {comercialError}
                </p>
              )}
            </section>

            {/* Campos customizados */}
            <section className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    {t('detail.customFields')}
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      {productAttrs.length}{' '}
                      {productAttrs.length === 1 ? t('detail.fieldsCount') : t('detail.fieldsCountPlural')}
                    </span>
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {t('detail.fieldsGlobal')}
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
                    {t('detail.editValues')}
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
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={saveAttributes}
                      disabled={saving}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? t('common.saving') : t('detail.save')}
                    </button>
                  </div>
                )}
              </div>

              {productAttrs.length === 0 ? (
                <p className="px-5 py-6 text-sm text-gray-400">
                  {t('detail.noFields')}{' '}
                  <span className="font-mono text-xs">POST /attributes</span>{' '}
                  {t('detail.noFieldsHint')}{' '}
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
                  {t('detail.variations')}
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {product.variants.length}{' '}
                    {product.variants.length === 1 ? t('detail.variation') : t('detail.variationsPlural')}
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
              <h2 className="mb-4 text-sm font-semibold text-gray-900">{t('detail.summary')}</h2>
              <dl className="space-y-3 text-sm">
                <SummaryRow
                  label={t('detail.inventory')}
                  value={
                    product.inventory.tracked
                      ? `${product.inventory.total_available} ${t('detail.available')}`
                      : t('products.notTracked')
                  }
                  danger={
                    product.inventory.tracked && product.inventory.total_available === 0
                  }
                />
                <SummaryRow label={t('detail.salesChannels')} value={String(product.sales_channels)} />
                <SummaryRow label={t('detail.markets')} value={String(product.markets)} />
                <SummaryRow label={t('detail.space')} value={product.space || '—'} />
                <SummaryRow label={t('detail.vendor')} value={product.supplier?.nome ?? '—'} />
                <SummaryRow label={t('detail.category')} value={product.category?.nome ?? '—'} />
                <SummaryRow label={t('detail.variations')} value={String(product.variant_count)} />
              </dl>
            </div>

            {product.tags.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold text-gray-900">{t('detail.tags')}</h2>
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
              <h2 className="mb-3 text-sm font-semibold text-gray-900">{t('detail.api')}</h2>
              <div className="space-y-1.5 text-xs text-gray-500">
                <p>
                  <span className="font-mono text-gray-700">GET /products/{product.id}</span>
                </p>
                <p>
                  <span className="font-mono text-gray-700">
                    POST /products/{product.id}/attribute-values
                  </span>
                  <br />
                  {t('detail.dynamicFields')}
                </p>
                <p>
                  <span className="font-mono text-gray-700">
                    GET /categories/{product.category_id ?? '…'}/attributes
                  </span>
                  <br />
                  {t('detail.dynamicForm')}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}