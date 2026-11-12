import { useState } from 'react'
import { api } from '../api'
import { Icon, Notice } from '../components'
import { useLang } from '../i18n'

export default function OfficerLogin({ onLoggedIn }) {
  const { t } = useLang()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await api('/officer_login', Object.fromEntries(new FormData(e.target)))
    setBusy(false)
    if (res.status === 'success') onLoggedIn()
    else setError(res.code === 'invalid_login' ? t('invalidLogin') : t('genericError'))
  }

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1>{t('loginTitle')}</h1>
        <p className="muted">{t('loginHint')}</p>
        <div className="field">
          <label htmlFor="email">{t('email')}</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="field">
          <label htmlFor="password">{t('password')}</label>
          <div className="password-field">
            <input id="password" name="password" type={showPassword ? 'text' : 'password'}
              autoComplete="current-password" required />
            <button type="button" className="icon-btn" onClick={() => setShowPassword(!showPassword)}
              aria-label={t(showPassword ? 'hidePassword' : 'showPassword')} aria-pressed={showPassword}>
              <Icon name={showPassword ? 'eyeOff' : 'eye'} />
            </button>
          </div>
        </div>
        {error && <Notice>{error}</Notice>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? t('loggingIn') : t('login')}</button>
      </form>
    </div>
  )
}
