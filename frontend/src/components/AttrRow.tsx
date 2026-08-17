import type { CategoryAttributeLink } from '../api/types';
import { formatValue, TIPO_LABELS } from './ui';

export default function AttrRow({
  link,
  editing,
  value,
  onChange,
}: {
  link: CategoryAttributeLink;
  editing: boolean;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const attr = link.attribute;
  const rule = attr.validationRules[0];
  const required = rule?.obrigatorio || link.obrigatorio_na_categoria;
  const activeOptions = attr.options.filter((o) => o.status === 'ativo');
  const inputCls =
    'w-56 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

  let input: React.ReactNode = null;
  if (editing) {
    switch (attr.tipoDado) {
      case 'texto':
        input = (
          <input
            type="text"
            value={typeof value === 'string' ? value : ''}
            maxLength={rule?.tamanho_max ?? undefined}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`${attr.nome}…`}
            className={inputCls}
          />
        );
        break;
      case 'numero':
        input = (
          <input
            type="number"
            step="any"
            value={typeof value === 'number' ? value : value === '' ? '' : String(value ?? '')}
            min={rule?.valor_min ? Number(rule.valor_min) : undefined}
            max={rule?.valor_max ? Number(rule.valor_max) : undefined}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={attr.nome}
            className="w-40 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        );
        break;
      case 'booleano':
        input = (
          <select
            value={
              value === undefined || value === null || value === ''
                ? ''
                : value
                  ? 'true'
                  : 'false'
            }
            onChange={(e) => onChange(e.target.value === '' ? '' : e.target.value === 'true')}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">—</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        );
        break;
      case 'data':
        input = (
          <input
            type="date"
            value={
              typeof value === 'string' && value
                ? value.slice(0, 10)
                : ''
            }
            onChange={(e) => onChange(e.target.value)}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        );
        break;
      case 'lista':
        input = (
          <select
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">—</option>
            {activeOptions.map((o) => (
              <option key={o.id} value={o.valor}>
                {o.valor}
              </option>
            ))}
          </select>
        );
        break;
      case 'lista_multipla': {
        const arr = Array.isArray(value) ? (value as string[]) : [];
        input = (
          <div className="flex max-w-sm flex-wrap gap-2">
            {activeOptions.map((o) => {
              const checked = arr.includes(o.valor);
              return (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm transition ${
                    checked
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={checked}
                    onChange={() =>
                      onChange(
                        checked
                          ? arr.filter((v) => v !== o.valor)
                          : [...arr, o.valor],
                      )
                    }
                  />
                  {o.valor}
                </label>
              );
            })}
          </div>
        );
        break;
      }
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{attr.nome}</span>
          {required && (
            <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-red-600">
              Obrigatório
            </span>
          )}
          {link.herdado && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
              Herdado
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-400">
          <span className="font-mono">{attr.chave}</span> ·{' '}
          {TIPO_LABELS[attr.tipoDado] ?? attr.tipoDado}
          {rule?.valor_min != null && rule?.valor_max != null
            ? ` · ${rule.valor_min}–${rule.valor_max}`
            : ''}
        </p>
      </div>
      {editing ? (
        input
      ) : (
        <span className="max-w-[50%] truncate text-right text-sm text-gray-700">
          {value === undefined || value === null || value === ''
            ? <span className="text-gray-300">—</span>
            : formatValue(value)}
        </span>
      )}
    </div>
  );
}