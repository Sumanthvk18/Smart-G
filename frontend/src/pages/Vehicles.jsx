import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import { api, AuthError } from '../api'
import { Icon, Notice, OfficerTabs, Spinner } from '../components'
import { useLang } from '../i18n'

const VEHICLE_NO = /^[A-Za-z0-9 -]{4,20}$/

// The sticker is read by residents, so it always shows both languages.
const STICKER_TEXT = ['Scan to hand over your waste', 'ಕಸ ಹಸ್ತಾಂತರಿಸಲು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ']

const scanUrl = (code) => `${window.location.origin}/s/${code}`

function useQr(url, width) {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    QRCode.toDataURL(url, { width, margin: 2, errorCorrectionLevel: 'M' }).then(setSrc)
  }, [url, width])
  return src
}

// QR with the vehicle number underneath, as one PNG.
async function downloadPng(vehicle) {
  const qr = new Image()
  qr.src = await QRCode.toDataURL(scanUrl(vehicle.code), { width: 900, margin: 2, errorCorrectionLevel: 'M' })
  await qr.decode()

  const canvas = document.createElement('canvas')
  canvas.width = 900
  canvas.height = 1020
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(qr, 0, 0)
  ctx.fillStyle = '#000'
  ctx.font = 'bold 64px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(vehicle.vehicle_no, 450, 950)

  const link = document.createElement('a')
  link.download = `QR-${vehicle.vehicle_no.replace(/[^A-Z0-9]/g, '')}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

export default function Vehicles({ onAuthed, onLoggedOut }) {
  const { t } = useLang()
  const [vehicles, setVehicles] = useState(null)
  const [vehicleNo, setVehicleNo] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null) // { kind, text }
  const [printing, setPrinting] = useState(null) // { vehicle, src }

  async function call(path, body) {
    try {
      return await api(path, body)
    } catch (e) {
      if (e instanceof AuthError) onLoggedOut()
      return null
    }
  }

  useEffect(() => {
    call('/list_vehicles').then((res) => {
      if (!res) return
      if (res.status === 'success') {
        setVehicles(res.data)
        onAuthed()
      } else setMessage({ kind: 'error', text: t('genericError') })
    })
  }, [])

  async function print(vehicle) {
    const src = await QRCode.toDataURL(scanUrl(vehicle.code), { width: 900, margin: 2, errorCorrectionLevel: 'M' })
    setPrinting({ vehicle, src })
  }

  // Print once the sticker's QR image is ready, then remove the sticker.
  useEffect(() => {
    if (!printing) return
    const done = () => setPrinting(null)
    window.addEventListener('afterprint', done, { once: true })
    const img = document.querySelector('.print-sheet img')
    img.decode().catch(() => {}).then(() => window.print())
    return () => window.removeEventListener('afterprint', done)
  }, [printing])

  async function add(e) {
    e.preventDefault()
    if (!VEHICLE_NO.test(vehicleNo.trim())) {
      setMessage({ kind: 'error', text: t('invalidVehicleNo') })
      return
    }
    setSaving(true)
    setMessage(null)
    const res = await call('/add_vehicle', { vehicle_no: vehicleNo })
    setSaving(false)
    if (!res) return
    if (res.status === 'success') {
      setVehicles((list) => [res.data, ...list])
      setVehicleNo('')
      setMessage({ kind: 'info', text: t('vehicleAdded', { no: res.data.vehicle_no }) })
    } else if (res.code === 'vehicle_exists') {
      setMessage({ kind: 'error', text: t('vehicleExists') })
    } else if (res.code === 'invalid_input') {
      setMessage({ kind: 'error', text: t('invalidVehicleNo') })
    } else {
      setMessage({ kind: 'error', text: t('genericError') })
    }
  }

  if (!vehicles) {
    return (
      <div className="dashboard">
        <OfficerTabs />
        <div className="card center-card">{message ? <Notice>{message.text}</Notice> : <Spinner />}</div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <OfficerTabs />
      <section className="card">
        <h2>{t('addVehicle')}</h2>
        <p className="muted">{t('addVehicleHint')}</p>
        <form className="add-vehicle" onSubmit={add} noValidate>
          <label className="label" htmlFor="vehicle-no">{t('vehicleNo')}</label>
          <div className="add-vehicle-row">
            <input id="vehicle-no" value={vehicleNo} maxLength={20} placeholder="KA 01 AB 5678"
              autoComplete="off" autoCapitalize="characters"
              aria-invalid={message?.kind === 'error' ? 'true' : undefined}
              onChange={(e) => setVehicleNo(e.target.value.toUpperCase())} />
            <button className="btn btn-primary" disabled={saving || !vehicleNo.trim()}>
              {saving ? t('adding') : t('add')}
            </button>
          </div>
        </form>
        {message && <Notice kind={message.kind}>{message.text}</Notice>}
      </section>

      <h2 className="section-title">{t('vehiclesList')}<span className="count-badge">{vehicles.length}</span></h2>
      {vehicles.length === 0 ? (
        <p className="muted empty">{t('noVehicles')}</p>
      ) : (
        <div className="vehicle-grid">
          {vehicles.map((v) => (
            <VehicleCard key={v.code} vehicle={v} onPrint={() => print(v)} />
          ))}
        </div>
      )}

      {printing && createPortal(<Sticker {...printing} />, document.body)}
    </div>
  )
}

function VehicleCard({ vehicle, onPrint }) {
  const { t } = useLang()
  const url = scanUrl(vehicle.code)
  const qr = useQr(url, 360)
  return (
    <section className="card vehicle-card">
      <div className="vehicle-qr">{qr ? <img src={qr} alt={`QR ${vehicle.vehicle_no}`} /> : <Spinner />}</div>
      <div className="vehicle-no">{vehicle.vehicle_no}</div>
      <a className="vehicle-link" href={url} target="_blank" rel="noreferrer">{url.replace(/^https?:\/\//, '')}</a>
      <div className="vehicle-actions">
        <button className="btn btn-secondary btn-small" onClick={() => downloadPng(vehicle)}>{t('downloadPng')}</button>
        <button className="btn btn-secondary btn-small" onClick={onPrint}><Icon name="qr" size={16} />{t('print')}</button>
      </div>
    </section>
  )
}

function Sticker({ vehicle, src }) {
  return (
    <div className="print-sheet">
      <p className="sticker-title">{STICKER_TEXT[0]}</p>
      <p className="sticker-title">{STICKER_TEXT[1]}</p>
      <img src={src} alt="" />
      <p className="sticker-vehicle">{vehicle.vehicle_no}</p>
      <p className="sticker-foot">Smart Garbage · Hongasandra Ward (Pilot)</p>
    </div>
  )
}
