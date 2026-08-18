import type { ProductStatus } from '../api/types';
import { useI18n } from '../i18n';
import type { Dict } from '../i18n';

export const STATUS_CLS: Record<ProductStatus, string> = {
  ativo: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rascunho: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  inativo: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  descontinuado: 'bg-gray-100 text-gray-500 ring-gray-500/10',
};

export const ALL_STATUSES: ProductStatus[] = [
  'rascunho',
  'ativo',
  'inativo',
  'descontinuado',
];

export function tipoLabel(t: (k: keyof Dict) => string, tipo: string): string {
  const key = `tipo.${tipo}` as keyof Dict;
  return (t as (k: string) => string)(key) === key ? tipo : t(key);
}

export function formatValue(t: (k: keyof Dict) => string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (Array.isArray(valor)) return valor.join(', ');
  if (typeof valor === 'boolean') return valor ? t('common.yes') : t('common.no');
  return String(valor);
}

export function StatusBadge({ status }: { status: ProductStatus }) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_CLS[status]}`}
    >
      {t(`status.${status}`)}
    </span>
  );
}

export function SummaryRow({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`font-medium ${danger ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </dd>
    </div>
  );
}