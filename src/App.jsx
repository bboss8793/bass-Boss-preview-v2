import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom'
import BassApp from './apps/BassApp'
import ClubDashboard from './apps/ClubDashboard'
import TeamDashboard from './apps/TeamDashboard'
import RegisterPage from './apps/RegisterPage'
import LoginPage from './apps/LoginPage'
import ResetPasswordPage from './apps/ResetPasswordPage'
import LiveFeedPage from './apps/LiveFeedPage'
import SalesPage from './apps/SalesPage'
import JoinFlow from './components/shared/JoinFlow'
import { OrgProvider, useOrg } from './context/OrgContext'

const C = {
  bg: '#0a0900', card: '#111008', border: '#2a2000',
  gold: '#c8a030', goldLight: '#f0c84a', text: '#f0e8c8',
  muted: '#a08040',
}

function NavBar() {
  return (
    <nav className="bg-[#111008] border-b border-[#C8A030] flex w-full sticky top-0 z-50 items-center">
      <Link
        to="/"
        aria-label="Back to Bass Boss home"
        className="flex items-center gap-2 pl-3 pr-2 py-1.5 flex-shrink-0 hover:brightness-110 transition"
      >
        <img src="/Logo-crest.png" alt="" style={{ height: '30px', width: 'auto' }} />
      </Link>
      <div className="flex flex-1">
      {[
        { to: '/app', label: 'On Water', end: true },
        { to: '/club', label: 'Club' },
        { to: '/teams', label: 'Teams' },
      ].map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 text-center py-3 text-sm uppercase tracking-widest font-bold transition-colors border-b-2 ${
              isActive
                ? 'text-[#F0C84A] border-[#F0C84A]'
                : 'text-[#F0E8C8] border-transparent hover:text-[#F0C84A]'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
      </div>
    </nav>
  )
}

function OrgGate({ orgType, children }) {
  const { org, isDirector, memberSession, loading } = useOrg()

  if (loading) {
    return <p className="text-center py-12 text-sm" style={{ color: C.muted }}>Loading…</p>
  }

  // Director is signed in and their org type matches — go straight to dashboard
  if (isDirector && org?.type === orgType) return children

  // Member has a valid, DB-confirmed session for this org type
  if (memberSession && memberSession.orgType === orgType) return children

  // In all other cases (no session, wrong org type, stale session cleared) — show gate
  return <JoinFlow orgType={orgType} />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SalesPage />} />
      <Route path="/live/:tournamentId" element={<LiveFeedPage />} />
      <Route path="/*" element={<GatedApp />} />
    </Routes>
  )
}

function GatedApp() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/app" element={<BassApp />} />
        <Route path="/club" element={<OrgGate orgType="club"><ClubDashboard /></OrgGate>} />
        <Route path="/teams" element={<OrgGate orgType="team"><TeamDashboard /></OrgGate>} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <OrgProvider>
        <div className="min-h-screen bg-[#0a0900] flex flex-col">
          <AppRoutes />
        </div>
      </OrgProvider>
    </BrowserRouter>
  )
}
