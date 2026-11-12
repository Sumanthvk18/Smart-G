import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { Icon, Notice } from '../components'
import { useLang } from '../i18n'

const WASTE_TYPES = ['wet', 'dry', 'mixed']

// Resize to max 1280px and re-encode as JPEG (~150–250 KB) before upload.
async function compressPhoto(file, maxSide = 1280, quality = 0.72) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function useLocation() {
  const [loc, setLoc] = useState({ state: 'locating' })

  const request = () => {
    if (!navigator.geolocation) return setLoc({ state: 'off' })
    setLoc({ state: 'locating' })
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ state: 'ok', lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => setLoc({ state: 'off' }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }

  useEffect(() => {
    request()
  }, [])
  return [loc, request]
}

export default function Submit({ vehicle, household, onChangeHousehold }) {
  const { t } = useLang()
  const fileInput = useRef(null)
  const [waste, setWaste] = useState('')
  const [photo, setPhoto] = useState('')
  const [loc, retryLocation] = useLocation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [doneAt, setDoneAt] = useState(null)

  async function onPhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again
    if (!file) return
    setError('')
    try {
      setPhoto(await compressPhoto(file))
    } catch {
      setError(t('photoError'))
    }
  }

  async function submit() {
    setBusy(true)
    setError('')
    const res = await api('/add_submission', {
      household_id: household.id,
      vehicle_code: vehicle.code,
      waste_type: waste,
      photo,
      lat: loc.state === 'ok' ? loc.lat : null,
      lng: loc.state === 'ok' ? loc.lng : null,
    })
    setBusy(false)
    if (res.status === 'success') setDoneAt(new Date(res.data.created_at))
    else setError(res.code === 'invalid_photo' ? t('photoError') : t('genericError'))
  }

  function reset() {
    setWaste('')
    setPhoto('')
    setDoneAt(null)
    retryLocation()
  }

  if (doneAt) {
    return (
      <div className="card center-card">
        <div className="done-mark"><Icon name="check" size={34} /></div>
        <h1>{t('doneTitle')}</h1>
        <p className="muted">{t('doneText')}</p>
        <p className="done-time">
          {doneAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · {vehicle.vehicle_no}
        </p>
        <button className="btn btn-secondary btn-block" onClick={reset}>{t('submitAnother')}</button>
      </div>
    )
  }

  const missing = !waste ? t('needWaste') : !photo ? t('needPhoto') : ''

  return (
    <div className="card">
      <h1>{t('handoverTitle')}</h1>

      <div className="household">
        <div className="household-head">
          <span className="label">{t('household')}</span>
          <button type="button" className="link-btn" onClick={onChangeHousehold}>{t('change')}</button>
        </div>
        <dl>
          <div><dt>{t('name')}</dt><dd>{household.name}</dd></div>
          <div><dt>{t('col_meter_no')}</dt><dd>{household.meter_no}</dd></div>
          <div><dt>{t('col_street')}</dt><dd>{household.street}</dd></div>
          <div><dt>{t('address')}</dt><dd>{household.address}</dd></div>
        </dl>
      </div>

      <div className="field">
        <span className="label">{t('wasteType')}</span>
        <div className="waste-options">
          {WASTE_TYPES.map((w) => (
            <button key={w} type="button" className={`waste-option waste-${w} ${waste === w ? 'selected' : ''}`}
              aria-pressed={waste === w} onClick={() => setWaste(w)}>
              <span className="dot" />{t(w)}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label">{t('photo')}</span>
        <input ref={fileInput} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />
        {photo ? (
          <div className="photo-preview">
            <img src={photo} alt="" />
            <button type="button" className="btn btn-secondary btn-small" onClick={() => fileInput.current.click()}>
              <Icon name="camera" size={16} />{t('retake')}
            </button>
          </div>
        ) : (
          <button type="button" className="photo-empty" onClick={() => fileInput.current.click()}>
            <Icon name="camera" size={28} />
            <span className="photo-empty-title">{t('takePhoto')}</span>
            <span className="muted">{t('photoHint')}</span>
          </button>
        )}
      </div>

      <div className="field">
        <span className="label">{t('location')}</span>
        <div className={`location location-${loc.state}`}>
          <Icon name="pin" size={18} />
          <span>
            {loc.state === 'locating' && t('locating')}
            {loc.state === 'ok' && <>{t('located')} <span className="muted">(±{Math.round(loc.accuracy)} m)</span></>}
            {loc.state === 'off' && t('noLocation')}
          </span>
          {loc.state === 'off' && (
            <button type="button" className="link-btn" onClick={retryLocation}>{t('retry')}</button>
          )}
        </div>
      </div>

      {error && <Notice>{error}</Notice>}
      <button className="btn btn-primary btn-block" disabled={!!missing || busy} onClick={submit}>
        {busy ? t('submitting') : t('submit')}
      </button>
      {missing && <p className="hint-center muted">{missing}</p>}
    </div>
  )
}
