import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import AppShell from './components/AppShell'
import Login from './pages/Login'
import Inicio from './pages/Inicio'
import Ficha from './pages/Ficha'
import Sessao from './pages/Sessao'
import Agenda from './pages/Agenda'
import NovaPaciente from './pages/NovaPaciente'
import Numeros from './pages/Numeros'
import Recepcionista from './pages/Recepcionista'

function Rotas() {
  const { session, carregando } = useAuth()

  if (carregando) {
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <p className="muted">Abrindo…</p>
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <Routes>
      {/* O Modo Sessão cobre tudo — sem AppShell, o atendimento É a tela */}
      <Route path="/sessao/:sessaoId" element={<Sessao />} />
      <Route
        path="*"
        element={
          <AppShell>
            <Routes>
              <Route path="/inicio" element={<Inicio />} />
              <Route path="/paciente/:id" element={<Ficha />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/novo" element={<NovaPaciente />} />
              <Route path="/numeros" element={<Numeros />} />
              <Route path="/recepcionista" element={<Recepcionista />} />
              <Route path="*" element={<Navigate to="/inicio" replace />} />
            </Routes>
          </AppShell>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Rotas />
    </AuthProvider>
  )
}
