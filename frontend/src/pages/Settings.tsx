import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addAttributeOption,
  archiveAttribute,
  createAttribute,
  linkAttributeToCategory,
  listAttributes,
  listCategoryLinks,
  unlinkAttributeFromCategory,
  updateAttribute,
} from '../api/attributes';
import { listCategories } from '../api/products';
import type { AttributeDef, AttributeDataType, Paginated } from '../api/types';
import CategoriesSection from '../components/CategoriesSection';
import Nav from '../components/Nav';

const TIPOS: { value: AttributeDataType; label: string }[] = [
  { value: 'texto', label: 'Texto' },
  { value: 'numero', label: 'Número' },
  { value: 'booleano', label: 'Sim/Não' },
  { value: 'lista', label: 'Lista' },
  { value: 'lista_multipla', label: 'Lista múltipla' },
  { value: 'data', label: 'Data' },
];

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function normalizeChave(nome: string) {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export default function Settings() {
  const [tab, setTab] = useState<'campos' | 'categorias'>('campos');
  const [data, setData] = useState<Paginated<AttributeDef> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nivelFilter, setNivelFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    chave: '',
    tipo_dado: 'texto' as AttributeDataType,
    nivel: 'produto' as AttributeDef['nivel'],
    obrigatorio: false,
    valor_min: '',
    valor_max: '',
    tamanho_max: '',
    mensagem_erro: '',
    opcoes: [''] as string[],
  });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const [editAttr, setEditAttr] = useState<AttributeDef | null>(null);
  const [editNome, setEditNome] = useState('');
  const [newOption, setNewOption] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [categories, setCategories] = useState<{ id: string; nome: string }[]>([]);
  const [linkedCatIds, setLinkedCatIds] = useState<Set<string>>(new Set());
  const [linksLoading, setLinksLoading] = useState(false);
  const [toggleBusy, setToggleBusy] = useState('');

  useEffect(() => {
    if (!editAttr) return;
    setLinksLoading(true);
    listCategories()
      .then((res) => {
        setCategories(res.data);
        return res.data.map((c) => c.id);
      })
      .then((ids) => Promise.all(ids.map((cid) => listCategoryLinks(cid).catch(() => []))))
      .then((results) => {
        const linked = new Set<string>();
        results.forEach((links) => {
          links.forEach((l) => {
            if (l.attribute?.id === editAttr.id) linked.add(l.origem_categoria_id);
          });
        });
        setLinkedCatIds(linked);
      })
      .catch(() => setLinkedCatIds(new Set()))
      .finally(() => setLinksLoading(false));
  }, [editAttr]);

  const toggleCategoryLink = async (catId: string) => {
    if (!editAttr || toggleBusy) return;
    setToggleBusy(catId);
    try {
      if (linkedCatIds.has(catId)) {
        await unlinkAttributeFromCategory(catId, editAttr.id);
        setLinkedCatIds((prev) => {
          const next = new Set(prev);
          next.delete(catId);
          return next;
        });
      } else {
        await linkAttributeToCategory(catId, editAttr.id);
        setLinkedCatIds((prev) => new Set(prev).add(catId));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar vínculo');
    } finally {
      setToggleBusy('');
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listAttributes({ nivel: nivelFilter || undefined });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar campos');
    } finally {
      setLoading(false);
    }
  }, [nivelFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const needsOptions = form.tipo_dado === 'lista' || form.tipo_dado === 'lista_multipla';

  const openModal = () => {
    setForm({
      nome: '',
      chave: '',
      tipo_dado: 'texto',
      nivel: 'produto',
      obrigatorio: false,
      valor_min: '',
      valor_max: '',
      tamanho_max: '',
      mensagem_erro: '',
      opcoes: [''],
    });
    setFormError('');
    setModalOpen(true);
  };

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      setFormError('Informe o nome do campo');
      return;
    }
    if (!form.chave.trim()) {
      setFormError('Informe a chave do campo');
      return;
    }
    if (needsOptions && form.opcoes.filter((o) => o.trim()).length === 0) {
      setFormError('Campos lista exigem ao menos uma opção');
      return;
    }
    setCreating(true);
    setFormError('');
    try {
      await createAttribute({
        nome: form.nome.trim(),
        chave: form.chave.trim(),
        tipo_dado: form.tipo_dado,
        nivel: form.nivel,
        regra_validacao: {
          obrigatorio: form.obrigatorio,
          ...(form.valor_min !== '' ? { valor_min: Number(form.valor_min) } : {}),
          ...(form.valor_max !== '' ? { valor_max: Number(form.valor_max) } : {}),
          ...(form.tamanho_max !== '' ? { tamanho_max: Number(form.tamanho_max) } : {}),
          ...(form.mensagem_erro.trim() ? { mensagem_erro: form.mensagem_erro.trim() } : {}),
        },
        ...(needsOptions
          ? { opcoes: form.opcoes.filter((o) => o.trim()).map((o) => ({ valor: o.trim() })) }
          : {}),
      });
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Falha ao criar campo');
    } finally {
      setCreating(false);
    }
  };

  const saveEdit = async () => {
    if (!editAttr) return;
    setEditBusy(true);
    try {
      await updateAttribute(
        editAttr.id,
        editNome.trim()
          ? { nome: editNome.trim() }
          : { status: editAttr.status === 'ativo' ? 'arquivado' : 'ativo' },
      );
      setEditAttr(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setEditBusy(false);
    }
  };

  const addOption = async (attr: AttributeDef) => {
    if (!newOption.trim()) return;
    setEditBusy(true);
    try {
      await addAttributeOption(attr.id, newOption.trim());
      setNewOption('');
      setEditAttr(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao adicionar opção');
    } finally {
      setEditBusy(false);
    }
  };

  const archive = async (attr: AttributeDef) => {
    if (!window.confirm(`Arquivar o campo "${attr.nome}"? Produtos existentes não são afetados.`)) return;
    try {
      await archiveAttribute(attr.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao arquivar');
    }
  };

  const total = data?.meta.total ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">Configurações</h1>
            <p className="mt-1 text-sm text-gray-500">
              Campos customizados do catálogo e hierarquia de categorias.
            </p>
          </div>
          <div className="flex rounded-lg bg-gray-200/60 p-1">
            <button
              onClick={() => setTab('campos')}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                tab === 'campos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Campos
            </button>
            <button
              onClick={() => setTab('categorias')}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                tab === 'categorias' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Categorias
            </button>
          </div>
        </div>

        {tab === 'categorias' && <CategoriesSection />}

        {tab === 'campos' && (
        <>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Campos do produto
              <span className="ml-2 text-sm font-normal text-gray-400">
                {total} {total === 1 ? 'campo' : 'campos'}
              </span>
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Defina os campos customizados do catálogo — sem migração de banco, tudo em JSONB.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={nivelFilter}
              onChange={(e) => setNivelFilter(e.target.value)}
              className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
            >
              <option value="">Todos os níveis</option>
              <option value="produto">Produto</option>
              <option value="variacao">Variação</option>
            </select>
            <button
              onClick={openModal}
              className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <PlusIcon />
              Novo campo
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2.5 font-medium">Campo</th>
                  <th className="px-3 py-2.5 font-medium">Tipo</th>
                  <th className="px-3 py-2.5 font-medium">Nível</th>
                  <th className="px-3 py-2.5 font-medium">Regras</th>
                  <th className="px-3 py-2.5 font-medium">Opções</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-sm text-gray-400">
                      Carregando campos…
                    </td>
                  </tr>
                )}
                {!loading && error && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-sm text-red-500">
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && total === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <p className="text-sm font-medium text-gray-700">Nenhum campo cadastrado</p>
                      <p className="mt-1 text-sm text-gray-400">
                        Clique em "Novo campo" para criar o primeiro.
                      </p>
                    </td>
                  </tr>
                )}
                {!loading &&
                  data?.data.map((attr) => (
                    <tr key={attr.id} className="text-sm transition hover:bg-gray-50/80">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{attr.nome}</p>
                        <p className="font-mono text-xs text-gray-400">{attr.chave}</p>
                      </td>
                      <td className="px-3 py-3 text-gray-700">
                        {TIPOS.find((t) => t.value === attr.tipoDado)?.label ?? attr.tipoDado}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                            attr.nivel === 'produto'
                              ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
                              : 'bg-purple-50 text-purple-700 ring-purple-600/20'
                          }`}
                        >
                          {attr.nivel === 'produto' ? 'Produto' : 'Variação'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600">
                        {attr.validationRules[0]?.obrigatorio ? (
                          <span className="font-medium text-red-600">Obrigatório</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                        {attr.validationRules[0]?.valor_min != null &&
                          attr.validationRules[0]?.valor_max != null && (
                            <span className="text-gray-400">
                              {' '}
                              · {attr.validationRules[0].valor_min}–{attr.validationRules[0].valor_max}
                            </span>
                          )}
                      </td>
                      <td className="max-w-[220px] px-3 py-3">
                        {attr.options.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {attr.options.slice(0, 3).map((o) => (
                              <span
                                key={o.id}
                                className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                              >
                                {o.valor}
                              </span>
                            ))}
                            {attr.options.length > 3 && (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                                +{attr.options.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                            attr.status === 'ativo'
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                              : 'bg-gray-100 text-gray-500 ring-gray-500/20'
                          }`}
                        >
                          {attr.status === 'ativo' ? 'Ativo' : 'Arquivado'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditAttr(attr);
                              setEditNome(attr.nome);
                              setNewOption('');
                              setError('');
                            }}
                            className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                          >
                            Editar
                          </button>
                          {attr.status === 'ativo' && (
                            <button
                              onClick={() => archive(attr)}
                              className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                            >
                              Arquivar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

      {/* ------------------------------------------------ modal novo campo */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Novo campo</h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  O campo entra no formulário dos produtos com essa categoria
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Fechar"
              >
                <XIcon />
              </button>
            </div>

            <form onSubmit={submitNew} className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    autoFocus
                    value={form.nome}
                    onChange={(e) => {
                      const nome = e.target.value;
                      setForm((f) => ({
                        ...f,
                        nome,
                        chave: f.chave === '' || f.chave === normalizeChave(f.nome) ? normalizeChave(nome) : f.chave,
                      }));
                    }}
                    placeholder="Ex: Voltagem"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                    Chave <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.chave}
                    onChange={(e) => setForm((f) => ({ ...f, chave: e.target.value }))}
                    placeholder="voltagem"
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                    Tipo
                  </label>
                  <select
                    value={form.tipo_dado}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        tipo_dado: e.target.value as AttributeDataType,
                        opcoes: [''],
                      }))
                    }
                    className={inputCls}
                  >
                    {TIPOS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                    Nível
                  </label>
                  <select
                    value={form.nivel}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nivel: e.target.value as AttributeDef['nivel'] }))
                    }
                    className={inputCls}
                  >
                    <option value="produto">Produto</option>
                    <option value="variacao">Variação</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Regras de validação
                </p>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.obrigatorio}
                    onChange={(e) => setForm((f) => ({ ...f, obrigatorio: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                  />
                  Campo obrigatório
                </label>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Valor mínimo</label>
                    <input
                      type="number"
                      value={form.valor_min}
                      onChange={(e) => setForm((f) => ({ ...f, valor_min: e.target.value }))}
                      disabled={form.tipo_dado !== 'numero'}
                      placeholder={form.tipo_dado === 'numero' ? 'Ex: 0' : 'Só p/ número'}
                      className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-300`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Valor máximo</label>
                    <input
                      type="number"
                      value={form.valor_max}
                      onChange={(e) => setForm((f) => ({ ...f, valor_max: e.target.value }))}
                      disabled={form.tipo_dado !== 'numero'}
                      placeholder={form.tipo_dado === 'numero' ? 'Ex: 500' : 'Só p/ número'}
                      className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-300`}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Tam. máx. (texto)</label>
                    <input
                      type="number"
                      value={form.tamanho_max}
                      onChange={(e) => setForm((f) => ({ ...f, tamanho_max: e.target.value }))}
                      disabled={form.tipo_dado !== 'texto'}
                      placeholder={form.tipo_dado === 'texto' ? 'Ex: 120' : 'Só p/ texto'}
                      className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-300`}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="mb-1 block text-xs text-gray-400">
                    Mensagem de erro personalizada
                  </label>
                  <input
                    value={form.mensagem_erro}
                    onChange={(e) => setForm((f) => ({ ...f, mensagem_erro: e.target.value }))}
                    placeholder="Ex: Informe uma voltagem válida"
                    className={inputCls}
                  />
                </div>
              </div>

              {needsOptions && (
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Opções <span className="text-red-500">*</span>
                  </p>
                  <div className="space-y-2">
                    {form.opcoes.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          value={opt}
                          onChange={(e) =>
                            setForm((f) => {
                              const opcoes = [...f.opcoes];
                              opcoes[i] = e.target.value;
                              return { ...f, opcoes };
                            })
                          }
                          placeholder={`Opção ${i + 1}`}
                          className={inputCls}
                        />
                        {form.opcoes.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                opcoes: f.opcoes.filter((_, idx) => idx !== i),
                              }))
                            }
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-red-500"
                            aria-label="Remover opção"
                          >
                            <XIcon />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, opcoes: [...f.opcoes, ''] }))}
                    className="mt-2 flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    <PlusIcon />
                    Adicionar opção
                  </button>
                </div>
              )}

              {formError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
              )}

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={creating}
                  className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? 'Criando…' : 'Criar campo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------ modal editar */}
      {editAttr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Editar campo: {editAttr.nome}
                </h2>
                <p className="mt-0.5 font-mono text-xs text-gray-400">
                  {editAttr.chave} · chave imutável
                </p>
              </div>
              <button
                onClick={() => setEditAttr(null)}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Fechar"
              >
                <XIcon />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Nome
                </label>
                <input value={editNome} onChange={(e) => setEditNome(e.target.value)} className={inputCls} />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Status</p>
                  <p className="text-xs text-gray-400">
                    {editAttr.status === 'ativo' ? 'Ativo — usado nos formulários' : 'Arquivado'}
                  </p>
                </div>
                <button
                  onClick={saveEdit}
                  disabled={editBusy}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
                    editAttr.status === 'ativo'
                      ? 'border border-red-200 text-red-600 hover:bg-red-50'
                      : 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  {editBusy
                    ? '…'
                    : editAttr.status === 'ativo'
                      ? 'Arquivar campo'
                      : 'Reativar campo'}
                </button>
              </div>

              <div className="rounded-lg border border-gray-200 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Categorias vinculadas
                </p>
                <p className="mb-2 text-xs text-gray-400">
                  O campo aparece no formulário dos produtos destas categorias.
                </p>
                {linksLoading ? (
                  <p className="text-sm text-gray-400">Carregando categorias…</p>
                ) : categories.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhuma categoria cadastrada.</p>
                ) : (
                  <div className="space-y-1.5">
                    {categories.map((c) => {
                      const linked = linkedCatIds.has(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition hover:bg-gray-50"
                        >
                          <span className="font-medium text-gray-800">{c.nome}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{linked ? 'Vinculado' : 'Não vinculado'}</span>
                            <button
                              type="button"
                              onClick={() => toggleCategoryLink(c.id)}
                              disabled={toggleBusy === c.id || editAttr.status === 'arquivado'}
                              className={`relative h-5 w-9 rounded-full transition disabled:opacity-40 ${
                                linked ? 'bg-blue-600' : 'bg-gray-300'
                              }`}
                              aria-label={`Vincular ${c.nome}`}
                            >
                              <span
                                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
                                  linked ? 'left-4.5' : 'left-0.5'
                                }`}
                              />
                            </button>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {(editAttr.tipoDado === 'lista' || editAttr.tipoDado === 'lista_multipla') && (
                <div className="rounded-lg border border-gray-200 p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Adicionar opção
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addOption(editAttr);
                        }
                      }}
                      placeholder="Ex: 220V"
                      className={inputCls}
                    />
                    <button
                      onClick={() => addOption(editAttr)}
                      disabled={editBusy || !newOption.trim()}
                      className="shrink-0 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      Adicionar
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {editAttr.options.map((o) => (
                      <span
                        key={o.id}
                        className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                      >
                        {o.valor}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  onClick={() => setEditAttr(null)}
                  disabled={editBusy}
                  className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-40"
                >
                  Fechar
                </button>
                <button
                  onClick={saveEdit}
                  disabled={editBusy || !editNome.trim()}
                  className="rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  Salvar nome
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
        )}
      </main>
    </div>
  );
}