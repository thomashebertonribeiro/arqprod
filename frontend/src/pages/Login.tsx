import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setToken } from '../api/client';
import { login } from '../api/products';
import { useI18n } from '../i18n';

export default function Login() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, senha);
      setToken(res.access_token);
      navigate('/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
            A
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Arqprod</h1>
          <p className="mt-1 text-sm text-gray-500">{t('login.subtitle')}</p>
        </div>
        <form
          onSubmit={submit}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="email">
            {t('login.email')}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@exemplo.com"
            className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <label className="mb-1.5 block text-sm font-medium text-gray-700" htmlFor="senha">
            {t('login.password')}
          </label>
          <input
            id="senha"
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t('login.signingIn') : t('login.signIn')}
          </button>
          <p className="mt-4 text-center text-xs text-gray-400">{t('login.seedHint')}</p>
        </form>
      </div>
    </div>
  );
}