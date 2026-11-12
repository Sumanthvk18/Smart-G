import { useState } from 'react'
import { api, getLastMeter } from '../api'
import { Notice } from '../components'
import { useLang } from '../i18n'

// Step 1 on every scan: registered meter -> household filled in, otherwise -> registration.
export default function MeterCheck({ initialMeter, onFound, onNotRegistered }) {
  const { t } = useLang()
  const [meter, setMeter] = useState(() => initialMeter || getLastMeter())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await api('/household_by_meter', { meter_no: meter })
    setBusy(false)
    if (res.status === 'success') onFound(res.data)
    else if (res.code === 'household_not_found') onNotRegistered(meter.trim())
    else setError(t('genericError'))
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h1>{t('meterTitle')}</h1>
      <p className="muted">{t('meterHint')}</p>
      <div className="field">
        <label htmlFor="meter_no">{t('meter')}</label>
        <input id="meter_no" value={meter} onChange={(e) => setMeter(e.target.value)}
          maxLength={40} required autoFocus autoCapitalize="characters" />
      </div>
      {error && <Notice>{error}</Notice>}
      <button className="btn btn-primary btn-block" disabled={busy || !meter.trim()}>
        {busy ? t('checking') : t('continue')}
      </button>
    </form>
  )
}
