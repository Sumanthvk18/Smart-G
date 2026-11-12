import { useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import { api } from './api'
import { Header, Icon, ServerGate } from './components'
import { LangProvider, useLang } from './i18n'
import Dashboard from './pages/Dashboard'
import OfficerLogin from './pages/OfficerLogin'
import Scan from './pages/Scan'
import Vehicles from './pages/Vehicles'

function Home() {
  const { t } = useLang()
  return (
    <div className="card center-card">
      <div className="home-icon"><Icon name="qr" size={36} /></div>
      <h1>{t('homeTitle')}</h1>
      <p className="muted">{t('homeText')}</p>
      <Link className="small-link" to="/officer">{t('officerLink')}</Link>
    </div>
  )
}

// officer: null = not checked yet (the tab's first request tells us), true, false
function Officer({ officer, setOfficer }) {
  if (officer === false) return <OfficerLogin onLoggedIn={() => setOfficer(true)} />
  const session = { onAuthed: () => setOfficer(true), onLoggedOut: () => setOfficer(false) }
  return (
    <Routes>
      <Route path="vehicles" element={<Vehicles {...session} />} />
      <Route path="*" element={<Dashboard {...session} />} />
    </Routes>
  )
}

function Layout() {
  const wide = useLocation().pathname.startsWith('/officer')
  const [officer, setOfficer] = useState(null)

  async function logout() {
    await api('/officer_logout')
    setOfficer(false)
  }

  return (
    <>
      <Header wide={wide} onLogout={wide && officer ? logout : null} />
      <main className={`page ${wide ? 'wide' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/s/:code" element={<ServerGate><Scan /></ServerGate>} />
          <Route path="/officer/*"
            element={<ServerGate><Officer officer={officer} setOfficer={setOfficer} /></ServerGate>} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </>
  )
}

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </LangProvider>
  )
}
