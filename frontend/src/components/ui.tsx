import type { ProductStatus } from '../api/types';

export const STATUS_BADGES: Record<
  ProductStatus,
  { label: string; cls: string }
> = {
  ativo: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  rascunho: { label: 'Draft', cls: 'bg-gray-100 text-gray-600 ring-gray-500/20' },
  inativo: { label: 'Inactive', cls: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  descontinuado: { label: 'Discontinued', cls: 'bg-gray-100 text-gray-500 ring-gray-500/10' },
};

export const ALL_STATUSES: ProductStatus[] = [
  'rascunho',
  'ativo',
  'inativo',
  'descontinuado',
];

export const TIPO_LABELS: Record<string, string> = {
  texto: 'Texto',
  numero: 'Número',
  booleano: 'Sim/Não',
  lista: 'Lista',
  lista_multipla: 'Lista múltipla',
  data: 'Data',
};

export function formatValue(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (Array.isArray(valor)) return valor.join(', ');
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  return String(valor);
}

export function StatusBadge({ status }: { status: ProductStatus }) {
  const b = STATUS_BADGES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${b.cls}`}
    >
      {b.label}
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

export function formatCurrency(valor: string, moeda: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: moeda,
  }).format(Number(valor));
}