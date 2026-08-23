import { useCallback, useEffect, useState } from 'react';
import { getMlAuthStatus, saveMlCredentials } from '../api/products';
import { useI18n } from '../i18n';

export default function MlSettingsSection() {
  const { t } = useI18n();
  const [configured, setConfigured] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const status = await getMlAuthStatus() as any;
      setConfigured(status.configured);
      setUserId(status.userId ?? null);
      setNickname(status.nickname ?? null);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  async function handleSave() {
    if (!accessToken.trim()) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await saveMlCredentials({
        access_token: accessToken.trim(),
        refresh_token: refreshToken.trim() || undefined,
        client_id: clientId.trim() || undefined,
        client_secret: clientSecret.trim() || undefined,
      });
      setSuccess(t('settings.ml.saveSuccess'));
      setAccessToken('');
      setRefreshToken('');
      setClientId('');
      setClientSecret('');
      await loadStatus();
    } catch (err: any) {
      setError(err.message ?? t('settings.ml.saveError'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{t('settings.ml.title')}</h3>
        <p className="mt-1 text-sm text-gray-500">{t('settings.ml.description')}</p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">{t('common.loading')}</div>
      ) : configured ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-green-900">{t('settings.ml.connected')}</p>
              <p className="text-xs text-green-700">
                {nickname ?? t('settings.ml.unknownUser')}
                {userId ? ` (ID: ${userId})` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setConfigured(false); setAccessToken(''); }}
            className="mt-4 rounded-lg border border-green-300 px-3 py-1.5 text-sm text-green-700 transition hover:bg-green-100"
          >
            {t('settings.ml.reconfigure')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">{t('settings.ml.howToGet')}</h4>
            <ol className="space-y-2 text-sm text-gray-600">
              <li>1. {t('settings.ml.step1')}</li>
              <li>2. {t('settings.ml.step2')}</li>
              <li>3. {t('settings.ml.step3')}</li>
              <li>4. {t('settings.ml.step4')}</li>
            </ol>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">{t('settings.ml.credentials')}</h4>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">{t('settings.ml.accessToken')} *</label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="APP_USR-..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">{t('settings.ml.refreshToken')}</label>
                <input
                  type="password"
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder="TG-..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">{t('settings.ml.clientId')}</label>
                  <input
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="123456789"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">{t('settings.ml.clientSecret')}</label>
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="abc123..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            {success && <p className="mt-3 text-sm text-green-600">{success}</p>}

            <button
              onClick={handleSave}
              disabled={saving || !accessToken.trim()}
              className="mt-4 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-yellow-600 disabled:opacity-40"
            >
              {saving ? t('common.saving') : t('settings.ml.save')}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h4 className="mb-3 text-sm font-semibold text-gray-900">{t('settings.ml.webhookTitle')}</h4>
        <p className="text-sm text-gray-600">{t('settings.ml.webhookDescription')}</p>
        <div className="mt-2 rounded-lg bg-gray-50 p-3">
          <code className="text-xs text-gray-700">
            POST https://seu-dominio.com/api/ml/webhook
          </code>
        </div>
        <p className="mt-2 text-xs text-gray-400">{t('settings.ml.webhookHint')}</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h4 className="mb-3 text-sm font-semibold text-gray-900">{t('settings.ml.syncTitle')}</h4>
        <p className="text-sm text-gray-600">{t('settings.ml.syncDescription')}</p>
        <ul className="mt-2 space-y-1 text-sm text-gray-500">
          <li>• {t('settings.ml.syncAutoPrice')}</li>
          <li>• {t('settings.ml.syncAutoStock')}</li>
          <li>• {t('settings.ml.syncCron')}</li>
        </ul>
      </div>
    </div>
  );
}
