import { useState } from 'react';
import type { NamedRef } from '../api/types';
import { useI18n } from '../i18n';

export default function RefListSection({
  title,
  subtitle,
  empty,
  items,
  onCreate,
  creating,
}: {
  title: string;
  subtitle: string;
  empty: string;
  items: NamedRef[];
  onCreate: (nome: string) => Promise<void>;
  creating?: boolean;
}) {
  const { t } = useI18n();
  const [nome, setNome] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!nome.trim() || busy || creating) return;
    setBusy(true);
    setError('');
    try {
      await onCreate(nome.trim());
      setNome('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.loadFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {title}
            <span className="ml-2 text-sm font-normal text-gray-400">{items.length}</span>
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="flex w-72 items-center gap-2">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={t('settings.ref.newPh')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            onClick={submit}
            disabled={busy || creating || !nome.trim()}
            className="shrink-0 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {busy || creating ? t('common.saving') : t('settings.ref.add')}
          </button>
        </div>
      </div>
      {error && (
        <p className="border-b border-red-100 bg-red-50 px-5 py-2.5 text-sm text-red-600">{error}</p>
      )}
      {items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-gray-400">{empty}</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <span className="font-medium text-gray-900">{item.nome}</span>
              <span className="font-mono text-xs text-gray-400">{item.id.slice(0, 8)}…</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}