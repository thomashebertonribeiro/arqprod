import type {
  AttributeDef,
  ProductVariantDetail,
  VariantPriceRow,
  VariantStockRow,
} from '../api/types';
import { useI18n } from '../i18n';
import { formatValue, StatusBadge } from './ui';

export default function VariantsTable({
  variants,
  variantAttrs,
  data,
  onPriceStock,
  onEdit,
  onDelete,
}: {
  variants: ProductVariantDetail[];
  variantAttrs: AttributeDef[];
  data: Record<string, { stock: VariantStockRow[]; prices: VariantPriceRow[] }>;
  onPriceStock?: (variantId: string) => void;
  onEdit?: (variantId: string) => void;
  onDelete?: (variantId: string) => void;
}) {
  const { t, formatCurrency } = useI18n();

  const hasActions = Boolean(onPriceStock || onEdit || onDelete);

  if (variants.length === 0) {
    return (
      <p className="px-5 py-6 text-sm text-gray-400">
        {t('variants.none')}{' '}
        <span className="font-mono text-xs">POST /products/:id/variants</span>.
      </p>
    );
  }

  const hasStock = variants.some((v) => (data[v.id]?.stock.length ?? 0) > 0);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50/70 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <th className="px-5 py-2.5 font-medium">{t('variants.variation')}</th>
              <th className="px-3 py-2.5 font-medium">{t('variants.ean')}</th>
              <th className="px-3 py-2.5 font-medium">{t('variants.weight')}</th>
              <th className="px-3 py-2.5 font-medium">{t('variants.stock')}</th>
              <th className="px-3 py-2.5 font-medium">{t('variants.price')}</th>
              <th className="px-3 py-2.5 font-medium">{t('variants.status')}</th>
              {hasActions && <th className="px-5 py-2.5 font-medium" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {variants.map((v) => {
              const stock = data[v.id]?.stock ?? [];
              const prices = data[v.id]?.prices ?? [];
              const totalStock = stock.reduce((acc, s) => acc + s.disponivel, 0);
              const firstPrice = prices[0];

              return (
                <tr key={v.id} className="text-sm">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{v.sku}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {Object.keys(v.combinacao).length > 0
                        ? Object.entries(v.combinacao)
                            .map(([k, val]) => `${k}: ${val}`)
                            .join(' · ')
                        : Object.keys(v.values).length > 0
                          ? Object.entries(v.values)
                              .map(([k, val]) => `${k}: ${formatValue(t, val)}`)
                              .join(' · ')
                          : t('variants.noCombination')}
                    </p>
                    {variantAttrs.length > 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        {variantAttrs
                          .map((a) => {
                            const raw = v.values[a.chave];
                            return raw !== undefined
                              ? `${a.nome}: ${formatValue(t, raw)}`
                              : null;
                          })
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {v.ean_gtin ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    {v.peso_kg ? `${Number(v.peso_kg).toFixed(3)} kg` : '—'}
                  </td>
                  <td className="px-3 py-3">
                    {stock.length ? (
                      <span
                        className={
                          totalStock === 0 ? 'font-medium text-red-600' : 'text-gray-700'
                        }
                      >
                        {totalStock} {t('variants.inStock')}
                      </span>
                    ) : (
                      <span className="text-gray-400">{t('variants.notTracked')}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    {firstPrice ? (
                      formatCurrency(firstPrice.valor, firstPrice.moeda)
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={v.status === 'ativo' ? 'ativo' : 'inativo'} />
                  </td>
                  {hasActions && (
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {onPriceStock && (
                          <button
                            onClick={() => onPriceStock(v.id)}
                            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                          >
                            {t('variants.priceStock')}
                          </button>
                        )}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(v.id)}
                            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                          >
                            {t('common.edit')}
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(v.id)}
                            className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                          >
                            {t('common.delete')}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasStock && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-2.5 text-xs text-gray-500">
          {t('variants.byWarehouse')}{' '}
          {variants
            .flatMap((v) =>
              (data[v.id]?.stock ?? []).map(
                (s) => `${s.warehouse?.nome ?? '—'} (${s.disponivel})`,
              ),
            )
            .join(' · ')}
        </div>
      )}
    </>
  );
}