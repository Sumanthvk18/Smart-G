import { useState } from 'react'
import { api } from '../api'
import { Notice } from '../components'
import { useLang } from '../i18n'

const FIELDS = [
  { name: 'meter_no', label: 'meter', maxLength: 40, autoCapitalize: 'characters' },
  { name: 'name', label: 'name', maxLength: 80, autoComplete: 'name' },
  { name: 'mobile', label: 'mobile', maxLength: 15, type: 'tel', inputMode: 'numeric', pattern: '[0-9+ \\-]{10,15}', autoComplete: 'tel' },
  { name: 'street', label: 'street', maxLength: 100 },
  { name: 'address', label: 'address', maxLength: 200, autoComplete: 'street-address' },
]

export default function Register({ meter, onDone, onBack }) {
  const { t } = useLang()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [badFields, setBadFields] = useState([])

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setBadFields([])
    const res = await api('/register_household', Object.fromEntries(new FormData(e.target)))
    setBusy(false)
    if (res.status === 'success') return onDone(res.data)
    if (res.code === 'meter_taken') setError(t('meterTaken'))
    else if (res.code === 'invalid_input') {
      setBadFields(res.fields || [])
      setError(t('checkFields'))
    } else setError(t('genericError'))
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h1>{t('registerTitle')}</h1>
      <Notice kind="info">{t('notRegistered')}</Notice>
      {FIELDS.map(({ name, label, ...input }) => (
        <div className="field" key={name}>
          <label htmlFor={name}>{t(label)}</label>
          <input id={name} name={name} required defaultValue={name === 'meter_no' ? meter : undefined}
            autoFocus={name === 'name'} {...input} aria-invalid={badFields.includes(name) || undefined} />
        </div>
      ))}
      {error && <Notice>{error}</Notice>}
      <button className="btn btn-primary btn-block" disabled={busy}>
        {busy ? t('saving') : t('registerBtn')}
      </button>
      <button type="button" className="btn btn-ghost btn-block" onClick={onBack}>{t('back')}</button>
    </form>
  )
}
