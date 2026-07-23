import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { diaPorExtenso } from '../lib/datas'

// Topo de toda tela: wordmark (rota de fuga universal → Início) e,
// fora do Início, o botão "← Início" fixo. Sem menu, sem abas, sem hambúrguer.
export default function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const noInicio = pathname === '/inicio' || pathname === '/'

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <header className="topnav">
        <div className="topnav-inner">
          <div className="row" style={{ gap: 12 }}>
            {!noInicio && (
              <Link
                to="/inicio"
                className="btn btn-ghost"
                style={{ minHeight: 56, padding: '10px 18px' }}
              >
                ← Início
              </Link>
            )}
            <Link to="/inicio" className="wordmark">
              Hilda de Oliveira
            </Link>
          </div>
          <span className="mono small" style={{ color: 'var(--ink-60)' }}>
            {diaPorExtenso(new Date())}
          </span>
        </div>
      </header>
      <main className="wrap" style={{ paddingTop: 24, paddingBottom: 80, flex: 1, width: '100%' }}>
        {children}
      </main>
    </div>
  )
}
