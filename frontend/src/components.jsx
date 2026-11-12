import { useCallback, useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { waitForServer } from './api'
import { useLang } from './i18n'

// Small inline icons (stroke follows currentColor).
const paths = {
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  truck: 'M3 6h11v10H3zM14 10h4l3 3v3h-7M7.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  home: 'M4 11l8-7 8 7v9H4zM10 20v-5h4v5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z',
  alert: 'M12 8v5M12 16.5v.5M10.3 3.9L2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  close: 'M6 6l12 12M18 6L6 18',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  chevron: 'M6 9l6 6 6-6',
  left: 'M15 6l-6 6 6 6',
  right: 'M9 6l6 6-6 6',
  logout: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  filter: 'M4 7h16M7 12h10M10 17h4',
}

export function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />
}

export function Header({ wide, onLogout }) {
  const { lang, setLang, t } = useLang()
  return (
    <header className="topbar">
      <div className={`topbar-inner ${wide ? 'wide' : ''}`}>
        <div className="brand">
          <img src="/favicon.svg" alt="" width="32" height="32" />
          <div>
            <div className="brand-name">{t('appName')}</div>
            <div className="brand-sub">{t('ward')}</div>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="lang-toggle" role="group" aria-label="Language">
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
            <button className={lang === 'kn' ? 'on' : ''} onClick={() => setLang('kn')}>ಕನ್ನಡ</button>
          </div>
          {onLogout && (
            <button className="btn btn-secondary btn-small" onClick={onLogout} aria-label={t('logout')}>
              <Icon name="logout" size={16} /><span className="hide-sm">{t('logout')}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

// Officer tabs, with page controls (e.g. the date filter) on the right.
export function OfficerTabs({ children }) {
  const { t } = useLang()
  return (
    <div className="tabs-bar">
      <nav className="tabs">
        <NavLink end to="/officer">{t('dashboard')}</NavLink>
        <NavLink to="/officer/vehicles">{t('vehiclesTab')}</NavLink>
      </nav>
      {children}
    </div>
  )
}

export function Notice({ kind = 'error', children }) {
  return <div className={`notice notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>
}

// Waits for the (possibly sleeping) backend, then renders children.
export function ServerGate({ children }) {
  const { t } = useLang()
  const [state, setState] = useState('waking')

  const connect = useCallback(async () => {
    setState('waking')
    setState((await waitForServer()) ? 'ready' : 'down')
  }, [])

  useEffect(() => {
    connect()
  }, [connect])

  if (state === 'ready') return children
  if (state === 'down') {
    return (
      <div className="card center-card">
        <Notice>{t('serverDown')}</Notice>
        <button className="btn btn-primary" onClick={connect}>{t('retry')}</button>
      </div>
    )
  }
  return (
    <div className="card center-card">
      <Spinner />
      <p className="lead">{t('connecting')}</p>
      <p className="muted">{t('connectingHint')}</p>
    </div>
  )
}
