import { NavLink, useNavigate } from 'react-router-dom';
import { clearToken } from '../api/client';
import { useI18n } from '../i18n';

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-800'
  }`;

function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="ml-2 flex items-center rounded-lg bg-gray-100 p-0.5">
      <button
        onClick={() => setLang('pt-BR')}
        className={`rounded-md px-2 py-1 text-xs font-medium transition ${
          lang === 'pt-BR' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
        title="Português (Brasil)"
      >
        PT
      </button>
      <button
        onClick={() => setLang('en')}
        className={`rounded-md px-2 py-1 text-xs font-medium transition ${
          lang === 'en' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
        title="English"
      >
        EN
      </button>
    </div>
  );
}

export default function Nav() {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
            A
          </div>
          <span className="text-sm font-semibold text-gray-900">Arqprod</span>
        </div>
        <nav className="flex items-center gap-1">
          <NavLink to="/products" className={linkCls}>
            {t('nav.products')}
          </NavLink>
          <NavLink to="/settings" className={linkCls}>
            {t('nav.settings')}
          </NavLink>
          <LangSwitch />
          <button
            onClick={() => {
              clearToken();
              navigate('/login');
            }}
            className="ml-2 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-800"
          >
            {t('nav.logout')}
          </button>
        </nav>
      </div>
    </header>
  );
}