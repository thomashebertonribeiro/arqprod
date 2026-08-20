import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  addProductTags,
  createVariant,
  deleteVariant,
  duplicateProduct,
  getProduct,
  getProductAudits,
  getVariantPrices,
  getVariantStock,
  listBrands,
  listCategories,
  listChannels,
  listManufacturers,
  listSuppliers,
  listWarehouses,
  removeProductTag,
  saveProductAttributeValues,
  setVariantPrice,
  setVariantStock,
  updateProduct,
  updateVariant,
  uploadProductImage,
} from '../api/products';
import type {
  AttributeDef,
  NamedRef,
  ProductAuditRow,
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

interface CommercialDraft {
  ean_gtin: string;
  ncm: string;
  cest: string;
  custo: string;
  brand_id: string;
  manufacturer_id: string;
  unidade_venda: string;
  data_lancamento: string;
}

interface PhysicalDraft {
  peso_bruto_kg: string;
  peso_liquido_kg: string;
  altura_cm: string;
  largura_cm: string;
  profundidade_cm: string;
}

const UNIDADES = ['UN', 'CX', 'KG', 'G', 'L', 'ML', 'M', 'M2', 'M3', 'PAR', 'PC']; 

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
  const [comercialDraft, setComercialDraft] = useState<CommercialDraft>({
    ean_gtin: '',
    ncm: '',
    cest: '',
    custo: '',
    brand_id: '',
    manufacturer_id: '',
    unidade_venda: '',
    data_lancamento: '',
  });
  const [comercialSaving, setComercialSaving] = useState(false);
  const [comercialError, setComercialError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [physicalEditing, setPhysicalEditing] = useState(false);
  const [physicalDraft, setPhysicalDraft] = useState<PhysicalDraft>({
    peso_bruto_kg: '',
    peso_liquido_kg: '',
    altura_cm: '',
    largura_cm: '',
    profundidade_cm: '',
  });
  const [physicalSaving, setPhysicalSaving] = useState(false);
  const [physicalError, setPhysicalError] = useState('');

  const [brands, setBrands] = useState<NamedRef[]>([]);
  const [manufacturers, setManufacturers] = useState<NamedRef[]>([]);
  const [categories, setCategories] = useState<{ id: string; nome: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; nome: string }[]>([]);
  const [channels, setChannels] = useState<NamedRef[]>([]);
  const [warehouses, setWarehouses] = useState<NamedRef[]>([]);
  const [audits, setAudits] = useState<ProductAuditRow[]>([]);

  const [newTag, setNewTag] = useState('');
  const [tagBusy, setTagBusy] = useState(false);
  const [dupBusy, setDupBusy] = useState(false);

  const [variantModal, setVariantModal] = useState(false);
  const [variantForm, setVariantForm] = useState({ sku: '', ean_gtin: '', peso_kg: '' });
  const [variantBusy, setVariantBusy] = useState(false);
  const [variantError, setVariantError] = useState('');

  const [psVariantId, setPsVariantId] = useState<string | null>(null);
  const [psSaving, setPsSaving] = useState(false);
  const [psError, setPsError] = useState('');
  const [psPrices, setPsPrices] = useState<Record<string, string>>({});
  const [psStocks, setPsStocks] = useState<Record<string, string>>({});

  const [editVariantId, setEditVariantId] = useState<string | null>(null);
  const [editVariantForm, setEditVariantForm] = useState({
    sku: '',
    ean_gtin: '',
    peso_kg: '',
    status: 'ativo' as 'ativo' | 'inativo',
  });
  const [editVariantBusy, setEditVariantBusy] = useState(false);
  const [editVariantError, setEditVariantError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [p, cats, sups, brs, mans, chs, whs] = await Promise.all([
        getProduct(id),
        listCategories().catch(() => ({ data: [] })),
        listSuppliers().catch(() => ({ data: [] })),
        listBrands().catch(() => ({ data: [] })),
        listManufacturers().catch(() => ({ data: [] })),
        listChannels().catch(() => ({ data: [] })),
        listWarehouses().catch(() => ({ data: [] })),
      ]);
      setProduct(p);
      setSchema(p.fields);
      setDraft(Object.fromEntries(p.attribute_values.map((v) => [v.chave, v.valor])));
      setCategories(cats.data);
      setSuppliers(sups.data);
      setBrands(brs.data);
      setManufacturers(mans.data);
      setChannels(chs.data);
      setWarehouses(whs.data);
      setAudits(
        (await getProductAudits(id).catch(() => ({ data: [] as ProductAuditRow[] }))).data,
      );

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
        brand_id: comercialDraft.brand_id || null,
        manufacturer_id: comercialDraft.manufacturer_id || null,
        unidade_venda: comercialDraft.unidade_venda || null,
        data_lancamento: comercialDraft.data_lancamento || null,
      });
      setProduct(updated);
      setComercialEditing(false);
    } catch (err) {
      setComercialError(err instanceof Error ? err.message : t('detail.saveFailed'));
    } finally {
      setComercialSaving(false);
    }
  }

  async function savePhysical() {
    if (!product) return;
    setPhysicalSaving(true);
    setPhysicalError('');
    try {
      const updated = await updateProduct(product.id, {
        peso_bruto_kg: physicalDraft.peso_bruto_kg.trim() || null,
        peso_liquido_kg: physicalDraft.peso_liquido_kg.trim() || null,
        altura_cm: physicalDraft.altura_cm.trim() || null,
        largura_cm: physicalDraft.largura_cm.trim() || null,
        profundidade_cm: physicalDraft.profundidade_cm.trim() || null,
      });
      setProduct(updated);
      setPhysicalEditing(false);
    } catch (err) {
      setPhysicalError(err instanceof Error ? err.message : t('detail.saveFailed'));
    } finally {
      setPhysicalSaving(false);
    }
  }

  async function addTag() {
    if (!product || !newTag.trim()) return;
    setTagBusy(true);
    try {
      const updated = await addProductTags(product.id, [newTag.trim()]);
      setProduct(updated);
      setNewTag('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('detail.saveFailed'));
    } finally {
      setTagBusy(false);
    }
  }

  async function removeTag(tagId: string) {
    if (!product) return;
    setTagBusy(true);
    try {
      const updated = await removeProductTag(product.id, tagId);
      setProduct(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('detail.saveFailed'));
    } finally {
      setTagBusy(false);
    }
  }

  async function onDuplicate() {
    if (!product) return;
    setDupBusy(true);
    try {
      const copy = await duplicateProduct(product.id);
      window.location.href = `/products/${copy.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('detail.saveFailed'));
    } finally {
      setDupBusy(false);
    }
  }

  async function createNewVariant() {
    if (!product) return;
    setVariantBusy(true);
    setVariantError('');
    try {
      const res = await createVariant(product.id, {
        sku: variantForm.sku.trim(),
        ean_gtin: variantForm.ean_gtin.trim() || undefined,
        peso_kg: variantForm.peso_kg ? Number(variantForm.peso_kg) : undefined,
      });
      await load();
      setVariantModal(false);
      setVariantForm({ sku: '', ean_gtin: '', peso_kg: '' });
      if (res.id) setPsVariantId(res.id);
    } catch (err) {
      setVariantError(err instanceof Error ? err.message : t('detail.saveFailed'));
    } finally {
      setVariantBusy(false);
    }
  }

  function openPsModal(variantId: string) {
    const entry = variantData[variantId];
    const priceMap: Record<string, string> = {};
    const stockMap: Record<string, string> = {};
    for (const ch of channels) {
      const row = entry?.prices.find((p) => p.channelId === ch.id);
      if (row) priceMap[ch.id] = row.valor_promocional ?? row.valor;
    }
    for (const wh of warehouses) {
      const row = entry?.stock.find((s) => s.warehouseId === wh.id);
      if (row) stockMap[wh.id] = String(row.quantidade);
    }
    setPsPrices(priceMap);
    setPsStocks(stockMap);
    setPsError('');
    setPsVariantId(variantId);
  }

  async function savePs() {
    if (!product || !psVariantId) return;
    setPsSaving(true);
    setPsError('');
    try {
      for (const ch of channels) {
        const v = psPrices[ch.id];
        if (v !== undefined && v !== '') {
          await setVariantPrice(psVariantId, ch.id, Number(v));
        }
      }
      for (const wh of warehouses) {
        const v = psStocks[wh.id];
        if (v !== undefined && v !== '') {
          await setVariantStock(psVariantId, wh.id, Number(v));
        }
      }
      await load();
      setPsVariantId(null);
    } catch (err) {
      setPsError(err instanceof Error ? err.message : t('detail.saveFailed'));
    } finally {
      setPsSaving(false);
    }
  }

  function openEditVariant(variantId: string) {
    const v = product?.variants.find((x) => x.id === variantId);
    if (!v) return;
    setEditVariantForm({
      sku: v.sku,
      ean_gtin: v.ean_gtin ?? '',
      peso_kg: v.peso_kg ?? '',
      status: v.status,
    });
    setEditVariantError('');
    setEditVariantId(variantId);
  }

  async function saveEditVariant() {
    if (!product || !editVariantId) return;
    setEditVariantBusy(true);
    setEditVariantError('');
    try {
      await updateVariant(product.id, editVariantId, {
        sku: editVariantForm.sku.trim(),
        ean_gtin: editVariantForm.ean_gtin.trim() || null,
        peso_kg: editVariantForm.peso_kg ? Number(editVariantForm.peso_kg) : null,
        status: editVariantForm.status,
      });
      await load();
      setEditVariantId(null);
    } catch (err) {
      setEditVariantError(err instanceof Error ? err.message : t('detail.saveFailed'));
    } finally {
      setEditVariantBusy(false);
    }
  }

  async function confirmDeleteVariant(variantId: string) {
    if (!product) return;
    const v = product.variants.find((x) => x.id === variantId);
    if (!window.confirm(t('detail.deleteVariantConfirm', { sku: v?.sku ?? '' }))) return;
    try {
      await deleteVariant(product.id, variantId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('detail.saveFailed'));
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
          <div className="flex flex-wrap items-center gap-3">
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
            <button
              onClick={onDuplicate}
              disabled={dupBusy}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              title={t('detail.duplicate')}
            >
              {dupBusy ? (
                <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              ) : (
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-8.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-7.5A2.25 2.25 0 018.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 00-2.25 2.25v6" />
                </svg>
              )}
              {t('detail.duplicate')}
            </button>
          </div>
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
                <div>
                  <dt className="text-xs text-gray-400">{t('detail.createdBy')}</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">
                    {product.criado_por_nome ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">{t('detail.updatedBy')}</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">
                    {product.atualizado_por_nome ?? '—'}
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
                        brand_id: product.brand_id ?? '',
                        manufacturer_id: product.manufacturer_id ?? '',
                        unidade_venda: product.unidade_venda ?? '',
                        data_lancamento: product.data_lancamento ?? '',
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

              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
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
                <div>
                  <dt className="text-xs text-gray-400">{t('detail.brand')}</dt>
                  {comercialEditing ? (
                    <select
                      value={comercialDraft.brand_id}
                      onChange={(e) => setComercialDraft((d) => ({ ...d, brand_id: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-blue-500"
                    >
                      <option value="">—</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <dd className="mt-0.5 font-medium text-gray-900">
                      {product.brand?.nome ?? <span className="text-gray-400">—</span>}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-gray-400">{t('detail.manufacturer')}</dt>
                  {comercialEditing ? (
                    <select
                      value={comercialDraft.manufacturer_id}
                      onChange={(e) =>
                        setComercialDraft((d) => ({ ...d, manufacturer_id: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-blue-500"
                    >
                      <option value="">—</option>
                      {manufacturers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <dd className="mt-0.5 font-medium text-gray-900">
                      {product.manufacturer?.nome ?? <span className="text-gray-400">—</span>}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-gray-400">{t('detail.unit')}</dt>
                  {comercialEditing ? (
                    <select
                      value={comercialDraft.unidade_venda}
                      onChange={(e) =>
                        setComercialDraft((d) => ({ ...d, unidade_venda: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-blue-500"
                    >
                      <option value="">—</option>
                      {UNIDADES.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <dd className="mt-0.5 font-medium text-gray-900">
                      {product.unidade_venda ?? <span className="text-gray-400">—</span>}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-gray-400">{t('detail.launchDate')}</dt>
                  {comercialEditing ? (
                    <input
                      type="date"
                      value={comercialDraft.data_lancamento ?? ''}
                      onChange={(e) =>
                        setComercialDraft((d) => ({ ...d, data_lancamento: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none transition focus:border-blue-500"
                    />
                  ) : (
                    <dd className="mt-0.5 font-medium text-gray-900">
                      {product.data_lancamento
                        ? formatDate(product.data_lancamento)
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

            {/* Dados físicos / logísticos */}
            <section className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">{t('detail.physical')}</h2>
                  <p className="mt-0.5 text-xs text-gray-400">{t('detail.physicalHint')}</p>
                </div>
                {!physicalEditing ? (
                  <button
                    onClick={() => {
                      setPhysicalDraft({
                        peso_bruto_kg: product.peso_bruto_kg ?? '',
                        peso_liquido_kg: product.peso_liquido_kg ?? '',
                        altura_cm: product.altura_cm ?? '',
                        largura_cm: product.largura_cm ?? '',
                        profundidade_cm: product.profundidade_cm ?? '',
                      });
                      setPhysicalError('');
                      setPhysicalEditing(true);
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    {t('detail.editValues')}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setPhysicalEditing(false);
                        setPhysicalError('');
                      }}
                      disabled={physicalSaving}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={savePhysical}
                      disabled={physicalSaving}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {physicalSaving ? t('common.saving') : t('detail.save')}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                {(
                  [
                    ['peso_bruto_kg', t('detail.grossWeight'), 'number'],
                    ['peso_liquido_kg', t('detail.netWeight'), 'number'],
                    ['altura_cm', t('detail.height'), 'number'],
                    ['largura_cm', t('detail.width'), 'number'],
                    ['profundidade_cm', t('detail.depth'), 'number'],
                  ] as const
                ).map(([key, label, type]) => (
                  <div key={key}>
                    <dt className="text-xs text-gray-400">{label}</dt>
                    {physicalEditing ? (
                      <input
                        type={type}
                        step="0.01"
                        min="0"
                        value={physicalDraft[key]}
                        onChange={(e) =>
                          setPhysicalDraft((d) => ({ ...d, [key]: e.target.value }))
                        }
                        placeholder="0"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none transition focus:border-blue-500"
                      />
                    ) : (
                      <dd className="mt-0.5 font-medium text-gray-900">
                        {product[key] ?? <span className="text-gray-400">—</span>}
                        {product[key] && (key === 'altura_cm' || key === 'largura_cm' || key === 'profundidade_cm')
                          ? ' cm'
                          : ''}
                        {product[key] && (key === 'peso_bruto_kg' || key === 'peso_liquido_kg')
                          ? ' kg'
                          : ''}
                      </dd>
                    )}
                  </div>
                ))}
                <div>
                  <dt className="text-xs text-gray-400">{t('detail.cubagem')}</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">
                    {product.cubagem_m3 ? `${product.cubagem_m3} m³` : <span className="text-gray-400">—</span>}
                  </dd>
                </div>
              </div>
              {physicalError && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {physicalError}
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
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  {t('detail.variations')}
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {product.variants.length}{' '}
                    {product.variants.length === 1 ? t('detail.variation') : t('detail.variationsPlural')}
                  </span>
                </h2>
                <button
                  onClick={() => {
                    setVariantForm({ sku: '', ean_gtin: '', peso_kg: '' });
                    setVariantError('');
                    setVariantModal(true);
                  }}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  {t('detail.newVariant')}
                </button>
              </div>
              <VariantsTable
                variants={product.variants}
                variantAttrs={variantAttrs}
                data={variantData}
                onPriceStock={openPsModal}
                onEdit={openEditVariant}
                onDelete={confirmDeleteVariant}
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
                <SummaryRow label={t('detail.brand')} value={product.brand?.nome ?? '—'} />
                <SummaryRow label={t('detail.manufacturer')} value={product.manufacturer?.nome ?? '—'} />
                <SummaryRow label={t('detail.variations')} value={String(product.variant_count)} />
              </dl>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">{t('detail.tags')}</h2>
              {product.tags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {product.tags.map((tagId) => (
                    <span
                      key={tagId}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                    >
                      {tagId}
                      <button
                        onClick={() => removeTag(tagId)}
                        disabled={tagBusy}
                        className="text-gray-400 transition hover:text-red-500 disabled:opacity-40"
                        title={t('detail.removeTag')}
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder={t('detail.newTag')}
                  className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none transition focus:border-blue-500"
                />
                <button
                  onClick={addTag}
                  disabled={tagBusy || !newTag.trim()}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-40"
                >
                  {tagBusy ? t('common.saving') : '+'}
                </button>
              </div>
            </div>

            {audits.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-semibold text-gray-900">{t('detail.history')}</h2>
                <ol className="space-y-3">
                  {audits.slice(0, 12).map((a) => (
                    <li key={a.id} className="text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-700">
                          {(t as (k: string) => string)(`audit.${a.acao}`)}
                        </span>
                        <span className="text-gray-400">{formatDate(a.criado_em)}</span>
                      </div>
                      <p className="mt-0.5 text-gray-500">{a.usuario?.nome ?? '—'}</p>
                    </li>
                  ))}
                </ol>
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

      {variantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">{t('detail.newVariant')}</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-gray-500">{t('detail.variantSku')}</label>
                <input
                  value={variantForm.sku}
                  onChange={(e) => setVariantForm((f) => ({ ...f, sku: e.target.value }))}
                  placeholder={t('detail.variantSkuPh')}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none transition focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">{t('detail.ean')}</label>
                <input
                  value={variantForm.ean_gtin}
                  onChange={(e) => setVariantForm((f) => ({ ...f, ean_gtin: e.target.value }))}
                  placeholder={t('detail.eanPh')}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm font-mono outline-none transition focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">{t('detail.netWeight')} (kg)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={variantForm.peso_kg}
                  onChange={(e) => setVariantForm((f) => ({ ...f, peso_kg: e.target.value }))}
                  placeholder="0.000"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none transition focus:border-blue-500"
                />
              </div>
              {variantError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{variantError}</p>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setVariantModal(false)}
                disabled={variantBusy}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={createNewVariant}
                disabled={variantBusy || !variantForm.sku.trim()}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {variantBusy ? t('common.saving') : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {editVariantId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">{t('detail.editVariant')}</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-gray-500">{t('detail.variantSku')}</label>
                <input
                  value={editVariantForm.sku}
                  onChange={(e) => setEditVariantForm((f) => ({ ...f, sku: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none transition focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">{t('detail.ean')}</label>
                <input
                  value={editVariantForm.ean_gtin}
                  onChange={(e) => setEditVariantForm((f) => ({ ...f, ean_gtin: e.target.value }))}
                  placeholder={t('detail.eanPh')}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm font-mono outline-none transition focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">{t('detail.netWeight')} (kg)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={editVariantForm.peso_kg}
                  onChange={(e) => setEditVariantForm((f) => ({ ...f, peso_kg: e.target.value }))}
                  placeholder="0.000"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none transition focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">{t('variants.status')}</label>
                <select
                  value={editVariantForm.status}
                  onChange={(e) =>
                    setEditVariantForm((f) => ({
                      ...f,
                      status: e.target.value as 'ativo' | 'inativo',
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-blue-500"
                >
                  <option value="ativo">{t('status.ativo')}</option>
                  <option value="inativo">{t('status.inativo')}</option>
                </select>
              </div>
              {editVariantError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {editVariantError}
                </p>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditVariantId(null)}
                disabled={editVariantBusy}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={saveEditVariant}
                disabled={editVariantBusy || !editVariantForm.sku.trim()}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {editVariantBusy ? t('common.saving') : t('detail.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {psVariantId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">{t('detail.priceStock')}</h3>
            {channels.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {t('detail.prices')}
                </h4>
                <div className="mt-2 space-y-2">
                  {channels.map((ch) => (
                    <div key={ch.id} className="flex items-center gap-2 text-sm">
                      <span className="w-32 truncate text-gray-600">{ch.nome}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={psPrices[ch.id] ?? ''}
                        onChange={(e) =>
                          setPsPrices((m) => ({ ...m, [ch.id]: e.target.value }))
                        }
                        placeholder="0,00"
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 font-mono text-sm outline-none transition focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {warehouses.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {t('detail.stock')}
                </h4>
                <div className="mt-2 space-y-2">
                  {warehouses.map((wh) => (
                    <div key={wh.id} className="flex items-center gap-2 text-sm">
                      <span className="w-32 truncate text-gray-600">{wh.nome}</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={psStocks[wh.id] ?? ''}
                        onChange={(e) =>
                          setPsStocks((m) => ({ ...m, [wh.id]: e.target.value }))
                        }
                        placeholder="0"
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none transition focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {psError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{psError}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPsVariantId(null)}
                disabled={psSaving}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={savePs}
                disabled={psSaving}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {psSaving ? t('common.saving') : t('detail.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}