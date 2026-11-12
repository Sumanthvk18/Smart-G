import { useState } from 'react'
import { api } from '../api'
import { Notice } from '../components'
import { useLang } from '../i18n'

const FIELDS = [
  { name: 'meter_no', label: 'meter', maxLength: 40, autoCapitalize: 'characters' },
  { name: 'name', label: 'name', maxLength: 80, autoComplete: 'name' },
  { name: 'mobile', label: 'mobile' },
  { name: 'street', label: 'street', maxLength: 100 },
  { name: 'address', label: 'address', maxLength: 200, autoComplete: 'street-address' },
]

// Keeps the 10-digit number from typed or pasted text: "+91 98765 43210", "098765 43210", …
function tenDigits(text) {
  let digits = text.replace(/\D/g, '')
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2)
  else if (digits.length > 10 && digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(0, 10)
}

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
      setError(res.fields?.includes('mobile') ? t('mobileInvalid') : t('checkFields'))
    } else setError(t('genericError'))
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h1>{t('registerTitle')}</h1>
      <Notice kind="info">{t('notRegistered')}</Notice>
      {FIELDS.map(({ name, label, ...input }) => (
        <div className="field" key={name}>
          <label htmlFor={name}>{t(label)}</label>
          {name === 'mobile' ? (
            <div className="input-prefix">
              <span>+91</span>
              <input id="mobile" name="mobile" type="tel" inputMode="numeric" autoComplete="tel-national"
                required pattern="[6-9][0-9]{9}" placeholder="98765 43210"
                aria-invalid={badFields.includes('mobile') || undefined}
                onInput={(e) => {
                  e.target.value = tenDigits(e.target.value)
                  e.target.setCustomValidity('')
                }}
                onInvalid={(e) => e.target.setCustomValidity(t('mobileInvalid'))} />
            </div>
          ) : (
            <input id={name} name={name} required defaultValue={name === 'meter_no' ? meter : undefined}
              autoFocus={name === 'name'} {...input} aria-invalid={badFields.includes(name) || undefined} />
          )}
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
