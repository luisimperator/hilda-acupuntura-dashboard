// Cabeçalho persistente do Modo Sessão (spec §3): nome + frase-objetivo +
// selos de cautela SEMPRE visíveis, trilho de bolinhas, "← Voltar" sempre
// presente, "chegou com N · corrigir" e o selo discreto "✓ guardado".

import { selosCautela, type Paciente, type Sessao } from '../../lib/tipos'
import { ROTULO_PASSO } from './tiposSessao'

type Props = {
  paciente: Paciente
  sessao: Sessao
  passos: string[]
  indice: number
  guardado: boolean
  aoVoltar: () => void
  aoAbrirFicha: () => void
  aoSair: () => void
  aoCorrigirEva: () => void
}

export default function CabecalhoSessao({
  paciente,
  sessao,
  passos,
  indice,
  guardado,
  aoVoltar,
  aoAbrirFicha,
  aoSair,
  aoCorrigirEva,
}: Props) {
  const selos = selosCautela(paciente)

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(239,230,216,0.96)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--hairline)',
      }}
    >
      <div className="wrap" style={{ maxWidth: 760, padding: '10px 20px 12px' }}>
        <div className="row-between" style={{ gap: 10 }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ minWidth: 56, paddingLeft: 18, paddingRight: 18 }}
            onClick={aoVoltar}
          >
            ← Voltar
          </button>
          <div
            className="progress-dots"
            style={{ justifyContent: 'center', flex: 1, gap: 5 }}
            role="img"
            aria-label={`passo ${indice + 1} de ${passos.length}: ${ROTULO_PASSO[passos[indice]] ?? ''}`}
          >
            {passos.map((p, i) => (
              <span
                key={p}
                className="progress-dot"
                data-done={i < indice}
                style={{
                  width: 12,
                  height: 12,
                  ...(i === indice ? { borderColor: 'var(--jade)', borderWidth: 3, background: 'var(--card)' } : {}),
                }}
              />
            ))}
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="btn btn-ghost" style={{ minHeight: 56 }} onClick={aoAbrirFicha}>
              ver ficha ›
            </button>
            <button
              type="button"
              className="btn"
              style={{ minHeight: 56, color: 'var(--ink-60)', textDecoration: 'underline' }}
              onClick={aoSair}
            >
              sair
            </button>
          </div>
        </div>

        <div className="row" style={{ flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>{paciente.nome}</span>
          {sessao.eva_pre != null && (
            <button
              type="button"
              onClick={aoCorrigirEva}
              className="pill pill-jade"
              style={{ cursor: 'pointer', minHeight: 36 }}
            >
              chegou com {sessao.eva_pre} · corrigir
            </button>
          )}
          <span
            className="small"
            aria-live="polite"
            style={{ color: 'var(--jade)', fontWeight: 600, opacity: guardado ? 1 : 0, transition: 'opacity 0.4s' }}
          >
            ✓ guardado
          </span>
        </div>

        {(paciente.objetivo_frase || selos.length > 0) && (
          <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {paciente.objetivo_frase && (
              <span className="small" style={{ fontStyle: 'italic' }}>
                “{paciente.objetivo_frase}”
              </span>
            )}
            {selos.map((s) => (
              <span key={s.chave} className="pill pill-red" style={{ whiteSpace: 'normal', fontSize: 13.5 }}>
                ⚠ {s.rotulo}
              </span>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
