import { useState } from 'react';
import type { NamedRef } from '../api/types';
import { useI18n } from '../i18n';

export default function RefListSection({
  title,
  subtitle,
  empty,
  items,
  onCreate,
  onUpdate,
  onDelete,
  creating,
}: {
  title: string;
  subtitle: string;
  empty: string;
  items: NamedRef[];
  onCreate: (nome: string) => Promise<void>;
  onUpdate: (id: string, nome: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  creating?: boolean;
}) {
  const { t } = useI18n();
  const [nome, setNome] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState('');

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

  async function saveEdit() {
    if (!editingId || !editingNome.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await onUpdate(editingId, editingNome.trim());
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.loadFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: NamedRef) {
    if (!window.confirm(t('settings.ref.deleteConfirm', { nome: item.nome }))) return;
    setBusy(true);
    setError('');
    try {
      await onDelete(item.id);
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
            <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              {editingId === item.id ? (
                <>
                  <input
                    value={editingNome}
                    onChange={(e) => setEditingNome(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        saveEdit();
                      }
                    }}
                    className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 outline-none transition focus:border-blue-500"
                  />
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={saveEdit}
                      disabled={busy || !editingNome.trim()}
                      className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {busy ? t('common.saving') : t('common.save')}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="font-medium text-gray-900">{item.nome}</span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingId(item.id);
                        setEditingNome(item.nome);
                        setError('');
                      }}
                      disabled={busy}
                      className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => remove(item)}
                      disabled={busy}
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}