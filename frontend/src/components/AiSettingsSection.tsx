import { useCallback, useEffect, useState } from 'react';
import {
  listAiModels, createAiModel, updateAiModel, deleteAiModel,
  listAiRouting, createAiRouting,
  listAiPrompts, createAiPrompt,
  seedAiAll,
} from '../api/products';
import { useI18n } from '../i18n';

type Tab = 'models' | 'routing' | 'prompts';

export default function AiSettingsSection() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('models');
  const [models, setModels] = useState<any[]>([]);
  const [routing, setRouting] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showModelForm, setShowModelForm] = useState(false);
  const [modelForm, setModelForm] = useState({ name: '', provider: 'ollama', modelIdentifier: '', baseUrl: 'http://localhost:11434', contextWindow: 4096, costPer1kInput: 0, costPer1kOutput: 0 });

  const [showRoutingForm, setShowRoutingForm] = useState(false);
  const [routingForm, setRoutingForm] = useState({ taskType: 'extraction', modelPriority: '' });

  const [showPromptForm, setShowPromptForm] = useState(false);
  const [promptForm, setPromptForm] = useState({ name: '', taskType: 'extraction', systemPrompt: '', userPromptTemplate: '', outputSchema: '{}' });
  const [editingPrompt, setEditingPrompt] = useState<any>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [m, r, p] = await Promise.all([
        listAiModels().catch(() => []),
        listAiRouting().catch(() => []),
        listAiPrompts().catch(() => []),
      ]);
      setModels(Array.isArray(m) ? m : (m as any)?.data ?? []);
      setRouting(Array.isArray(r) ? r : (r as any)?.data ?? []);
      setPrompts(Array.isArray(p) ? p : (p as any)?.data ?? []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleSeedAll() {
    setSeeding(true);
    setError('');
    setSuccess('');
    try {
      await seedAiAll();
      setSuccess(t('settings.ai.seedSuccess'));
      await loadAll();
    } catch (err: any) {
      setError(err.message ?? t('settings.ai.seedError'));
    } finally {
      setSeeding(false);
    }
  }

  async function handleCreateModel() {
    setError('');
    try {
      await createAiModel(modelForm);
      setShowModelForm(false);
      setModelForm({ name: '', provider: 'ollama', modelIdentifier: '', baseUrl: 'http://localhost:11434', contextWindow: 4096, costPer1kInput: 0, costPer1kOutput: 0 });
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteModel(id: string) {
    if (!confirm(t('settings.ai.confirmDelete'))) return;
    try {
      await deleteAiModel(id);
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleCreateRouting() {
    setError('');
    try {
      const modelIds = routingForm.modelPriority.split(',').map((s) => s.trim()).filter(Boolean);
      await createAiRouting({ taskType: routingForm.taskType, modelPriority: modelIds });
      setShowRoutingForm(false);
      setRoutingForm({ taskType: 'extraction', modelPriority: '' });
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleCreatePrompt() {
    setError('');
    try {
      let schema = {};
      try { schema = JSON.parse(promptForm.outputSchema); } catch { schema = {}; }
      await createAiPrompt({
        ...promptForm,
        outputSchema: schema,
        inputVariables: [],
      });
      setShowPromptForm(false);
      setPromptForm({ name: '', taskType: 'extraction', systemPrompt: '', userPromptTemplate: '', outputSchema: '{}' });
      await loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const providers = ['ollama', 'openai', 'anthropic', 'vllm', 'openai-compatible'];
  const taskTypes = ['classification', 'extraction', 'vision', 'generation', 'readiness'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{t('settings.ai.title')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('settings.ai.description')}</p>
        </div>
        <button
          onClick={handleSeedAll}
          disabled={seeding}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700 disabled:opacity-40"
        >
          {seeding ? t('common.saving') : t('settings.ai.seedAll')}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <nav className="flex gap-1 rounded-lg bg-gray-100 p-1">
        {(['models', 'routing', 'prompts'] as Tab[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t(`settings.ai.tab.${key}`)}
          </button>
        ))}
      </nav>

      {loading ? (
        <p className="text-sm text-gray-400">{t('common.loading')}</p>
      ) : (
        <>
          {/* ==================== MODELS ==================== */}
          {tab === 'models' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowModelForm(!showModelForm)}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  + {t('settings.ai.addModel')}
                </button>
              </div>

              {showModelForm && (
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <h4 className="mb-3 text-sm font-semibold text-gray-900">{t('settings.ai.newModel')}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">{t('settings.ai.model.name')}</label>
                      <input value={modelForm.name} onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">{t('settings.ai.model.provider')}</label>
                      <select value={modelForm.provider} onChange={(e) => setModelForm({ ...modelForm, provider: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
                        {providers.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">{t('settings.ai.model.identifier')}</label>
                      <input value={modelForm.modelIdentifier} onChange={(e) => setModelForm({ ...modelForm, modelIdentifier: e.target.value })} placeholder="qwen2.5:14b" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">{t('settings.ai.model.baseUrl')}</label>
                      <input value={modelForm.baseUrl} onChange={(e) => setModelForm({ ...modelForm, baseUrl: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">{t('settings.ai.model.contextWindow')}</label>
                      <input type="number" value={modelForm.contextWindow} onChange={(e) => setModelForm({ ...modelForm, contextWindow: Number(e.target.value) })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">{t('settings.ai.model.costInput')}</label>
                      <input type="number" step="0.001" value={modelForm.costPer1kInput} onChange={(e) => setModelForm({ ...modelForm, costPer1kInput: Number(e.target.value) })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">{t('settings.ai.model.costOutput')}</label>
                      <input type="number" step="0.001" value={modelForm.costPer1kOutput} onChange={(e) => setModelForm({ ...modelForm, costPer1kOutput: Number(e.target.value) })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={handleCreateModel} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">{t('detail.save')}</button>
                    <button onClick={() => setShowModelForm(false)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">{t('common.cancel')}</button>
                  </div>
                </div>
              )}

              {models.length === 0 ? (
                <p className="text-sm text-gray-400">{t('settings.ai.noModels')}</p>
              ) : (
                <div className="space-y-2">
                  {models.map((m) => (
                    <div key={m.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{m.name}</p>
                        <p className="text-xs text-gray-500">{m.provider} · {m.modelIdentifier} · ctx {m.context_window}</p>
                        <p className="text-xs text-gray-400">{m.baseUrl}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${m.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {m.enabled ? t('settings.ai.enabled') : t('settings.ai.disabled')}
                        </span>
                        <button onClick={() => handleDeleteModel(m.id)} className="text-xs text-red-500 hover:text-red-700">{t('detail.mlDelete')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== ROUTING ==================== */}
          {tab === 'routing' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowRoutingForm(!showRoutingForm)}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  + {t('settings.ai.addRouting')}
                </button>
              </div>

              {showRoutingForm && (
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <h4 className="mb-3 text-sm font-semibold text-gray-900">{t('settings.ai.newRouting')}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">{t('settings.ai.routing.taskType')}</label>
                      <select value={routingForm.taskType} onChange={(e) => setRoutingForm({ ...routingForm, taskType: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500">
                        {taskTypes.map((tt) => <option key={tt} value={tt}>{tt}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">{t('settings.ai.routing.modelIds')}</label>
                      <input value={routingForm.modelPriority} onChange={(e) => setRoutingForm({ ...routingForm, modelPriority: e.target.value })} placeholder="uuid1, uuid2" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                      <p className="mt-1 text-xs text-gray-400">{t('settings.ai.routing.modelIdsHint')}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={handleCreateRouting} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">{t('detail.save')}</button>
                    <button onClick={() => setShowRoutingForm(false)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">{t('common.cancel')}</button>
                  </div>
                </div>
              )}

              {routing.length === 0 ? (
                <p className="text-sm text-gray-400">{t('settings.ai.noRouting')}</p>
              ) : (
                <div className="space-y-2">
                  {routing.map((r) => (
                    <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{r.taskType}</p>
                          <p className="text-xs text-gray-500">
                            {t('settings.ai.routing.priority')}: {Array.isArray(r.modelPriority) ? r.modelPriority.join(' → ') : '—'}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${r.fallbackEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {r.fallbackEnabled ? 'Fallback ON' : 'Fallback OFF'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== PROMPTS ==================== */}
          {tab === 'prompts' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => { setShowPromptForm(!showPromptForm); setEditingPrompt(null); }}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  + {t('settings.ai.addPrompt')}
                </button>
              </div>

              {(showPromptForm || editingPrompt) && (
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <h4 className="mb-3 text-sm font-semibold text-gray-900">
                    {editingPrompt ? t('settings.ai.editPrompt') : t('settings.ai.newPrompt')}
                  </h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">{t('settings.ai.prompt.name')}</label>
                        <input
                          value={editingPrompt?.name ?? promptForm.name}
                          onChange={(e) => editingPrompt ? setEditingPrompt({ ...editingPrompt, name: e.target.value }) : setPromptForm({ ...promptForm, name: e.target.value })}
                          disabled={!!editingPrompt}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">{t('settings.ai.prompt.taskType')}</label>
                        <select
                          value={editingPrompt?.taskType ?? promptForm.taskType}
                          onChange={(e) => editingPrompt ? setEditingPrompt({ ...editingPrompt, taskType: e.target.value }) : setPromptForm({ ...promptForm, taskType: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                        >
                          {taskTypes.map((tt) => <option key={tt} value={tt}>{tt}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">{t('settings.ai.prompt.system')}</label>
                      <textarea
                        rows={4}
                        value={editingPrompt?.systemPrompt ?? promptForm.systemPrompt}
                        onChange={(e) => editingPrompt ? setEditingPrompt({ ...editingPrompt, systemPrompt: e.target.value }) : setPromptForm({ ...promptForm, systemPrompt: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">{t('settings.ai.prompt.userTemplate')}</label>
                      <textarea
                        rows={4}
                        value={editingPrompt?.userPromptTemplate ?? promptForm.userPromptTemplate}
                        onChange={(e) => editingPrompt ? setEditingPrompt({ ...editingPrompt, userPromptTemplate: e.target.value }) : setPromptForm({ ...promptForm, userPromptTemplate: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">{t('settings.ai.prompt.outputSchema')}</label>
                      <textarea
                        rows={3}
                        value={editingPrompt?.outputSchema ? JSON.stringify(editingPrompt.outputSchema, null, 2) : promptForm.outputSchema}
                        onChange={(e) => editingPrompt ? setEditingPrompt({ ...editingPrompt, outputSchema: e.target.value }) : setPromptForm({ ...promptForm, outputSchema: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={editingPrompt ? () => { setEditingPrompt(null); setShowPromptForm(false); } : handleCreatePrompt} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                      {editingPrompt ? t('common.close') : t('detail.save')}
                    </button>
                    <button onClick={() => { setShowPromptForm(false); setEditingPrompt(null); }} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">{t('common.cancel')}</button>
                  </div>
                </div>
              )}

              {prompts.length === 0 ? (
                <p className="text-sm text-gray-400">{t('settings.ai.noPrompts')}</p>
              ) : (
                <div className="space-y-2">
                  {prompts.map((p) => (
                    <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.name} <span className="text-xs text-gray-400">v{p.version}</span></p>
                          <p className="text-xs text-gray-500">{p.taskType}</p>
                          <p className="mt-1 text-xs text-gray-400 line-clamp-2">{p.systemPrompt?.slice(0, 120)}…</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${p.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {p.active ? t('settings.ai.active') : t('settings.ai.inactive')}
                          </span>
                          <button onClick={() => { setEditingPrompt(p); setShowPromptForm(true); }} className="text-xs text-blue-500 hover:text-blue-700">{t('detail.mlSync')}</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
