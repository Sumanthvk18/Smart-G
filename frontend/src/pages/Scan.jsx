import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, saveLastMeter } from '../api'
import { Icon, Notice, Spinner } from '../components'
import { useLang } from '../i18n'
import MeterCheck from './MeterCheck'
import Register from './Register'
import Submit from './Submit'

// Resident flow opened from the vehicle QR code: /s/:code
export default function Scan() {
  const { code } = useParams()
  const { t } = useLang()
  const [step, setStep] = useState('loading') // loading | invalid | error | meter | register | submit
  const [vehicle, setVehicle] = useState(null)
  const [household, setHousehold] = useState(null)
  const [newMeter, setNewMeter] = useState('')

  useEffect(() => {
    let cancelled = false
    api('/vehicle_details', { code }).then((v) => {
      if (cancelled) return
      if (v.status === 'success') {
        setVehicle(v.data)
        setStep('meter')
      } else setStep(v.code === 'vehicle_not_found' ? 'invalid' : 'error')
    })
    return () => {
      cancelled = true
    }
  }, [code])

  const selectHousehold = (h) => {
    saveLastMeter(h.meter_no)
    setHousehold(h)
    setStep('submit')
  }

  if (step === 'loading') {
    return <div className="card center-card"><Spinner /></div>
  }
  if (step === 'invalid' || step === 'error') {
    return (
      <div className="card center-card">
        <Notice>{t(step === 'invalid' ? 'invalidQr' : 'genericError')}</Notice>
        {step === 'error' && (
          <button className="btn btn-primary" onClick={() => window.location.reload()}>{t('retry')}</button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="context-row">
        <span className="chip"><Icon name="truck" size={16} />{t('vehicle')}: <strong>{vehicle.vehicle_no}</strong></span>
      </div>
      {step === 'meter' && (
        <MeterCheck
          initialMeter={newMeter}
          onFound={selectHousehold}
          onNotRegistered={(meter) => {
            setNewMeter(meter)
            setStep('register')
          }}
        />
      )}
      {step === 'register' && (
        <Register meter={newMeter} onDone={selectHousehold} onBack={() => setStep('meter')} />
      )}
      {step === 'submit' && (
        <Submit vehicle={vehicle} household={household} onChangeHousehold={() => setStep('meter')} />
      )}
    </>
  )
}
