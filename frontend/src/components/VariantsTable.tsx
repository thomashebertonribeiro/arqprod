import type {
  AttributeDef,
  ProductVariantDetail,
  VariantPriceRow,
  VariantStockRow,
} from '../api/types';
import { formatCurrency, formatValue, StatusBadge } from './ui';

export default function VariantsTable({
  variants,
  variantAttrs,
  data,
}: {
  variants: ProductVariantDetail[];
  variantAttrs: AttributeDef[];
  data: Record<string, { stock: VariantStockRow[]; prices: VariantPriceRow[] }>;
}) {
  if (variants.length === 0) {
    return (
      <p className="px-5 py-6 text-sm text-gray-400">
        Nenhuma variação. Crie via{' '}
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
              <th className="px-5 py-2.5 font-medium">Variação</th>
              <th className="px-3 py-2.5 font-medium">EAN</th>
              <th className="px-3 py-2.5 font-medium">Peso</th>
              <th className="px-3 py-2.5 font-medium">Estoque</th>
              <th className="px-3 py-2.5 font-medium">Preço</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
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
                              .map(([k, val]) => `${k}: ${formatValue(val)}`)
                              .join(' · ')
                          : 'Sem combinação'}
                    </p>
                    {variantAttrs.length > 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        {variantAttrs
                          .map((a) => {
                            const raw = v.values[a.chave];
                            return raw !== undefined
                              ? `${a.nome}: ${formatValue(raw)}`
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
                        {totalStock} in stock
                      </span>
                    ) : (
                      <span className="text-gray-400">Not tracked</span>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasStock && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-2.5 text-xs text-gray-500">
          Estoque por armazém:{' '}
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