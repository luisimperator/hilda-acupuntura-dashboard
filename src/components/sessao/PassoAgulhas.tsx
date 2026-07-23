// Passo 5 — AGULHAS & RETENÇÃO (spec §3.1): stepper, cronômetro 25/30 min
// com aviso sonoro suave, e a conferência de biossegurança que BLOQUEIA a
// conclusão se retiradas < colocadas (tela cinnabar).

import { useEffect, useRef, useState } from 'react'
import { tocarAvisoSuave, type CtxSessao } from './tiposSessao'

function Stepper({
  valor,
  aoMudar,
  rotulo,
}: {
  valor: number
  aoMudar: (n: number) => void
  rotulo: string
}) {
  return (
    <div className="row" style={{ justifyContent: 'center', gap: 20 }} role="group" aria-label={rotulo}>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ minWidth: 64, minHeight: 64, fontSize: 30 }}
        aria-label={`menos uma (${rotulo})`}
        onClick={() => aoMudar(Math.max(0, valor - 1))}
      >
        −
      </button>
      <span className="num-display" style={{ fontSize: 56, minWidth: 90, textAlign: 'center' }}>
        {valor}
      </span>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ minWidth: 64, minHeight: 64, fontSize: 30 }}
        aria-label={`mais uma (${rotulo})`}
        onClick={() => aoMudar(valor + 1)}
      >
        +
      </button>
    </div>
  )
}

type EstadoTimer = { fimMs: number; durMin: 25 | 30 } | null

export default function PassoAgulhas({ ctx }: { ctx: CtxSessao }) {
  const { sessao, ultimaSessao } = ctx
  const chaveTimer = `hilda-timer-${sessao.id}`

  const [colocadas, setColocadas] = useState<number>(
    sessao.agulhas_colocadas ?? ultimaSessao?.agulhas_colocadas ?? 0,
  )
  const [fase, setFase] = useState<'retencao' | 'conferencia' | 'divergencia'>(
    sessao.agulhas_conferidas ? 'conferencia' : 'retencao',
  )
  const [retiradas, setRetiradas] = useState<number>(sessao.agulhas_retiradas ?? colocadas)

  const [timer, setTimer] = useState<EstadoTimer>(() => {
    try {
      const cru = localStorage.getItem(chaveTimer)
      return cru ? (JSON.parse(cru) as EstadoTimer) : null
    } catch {
      return null
    }
  })
  const [, setTicque] = useState(0)
  const avisou = useRef(false)

  useEffect(() => {
    const id = window.setInterval(() => setTicque((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const restanteMs = timer ? timer.fimMs - Date.now() : null
  useEffect(() => {
    if (restanteMs != null && restanteMs <= 0 && !avisou.current) {
      avisou.current = true
      tocarAvisoSuave()
    }
  }, [restanteMs])

  function mudarTimer(novo: EstadoTimer) {
    setTimer(novo)
    avisou.current = false
    try {
      if (novo) localStorage.setItem(chaveTimer, JSON.stringify(novo))
      else localStorage.removeItem(chaveTimer)
    } catch {
      // sem localStorage, o cronômetro só vive nesta tela — tudo bem
    }
  }

  function comecarTimer(durMin: 25 | 30) {
    mudarTimer({ fimMs: Date.now() + durMin * 60000, durMin })
  }

  function alternarDuracao() {
    if (!timer) return
    const novaDur: 25 | 30 = timer.durMin === 25 ? 30 : 25
    mudarTimer({ durMin: novaDur, fimMs: timer.fimMs + (novaDur - timer.durMin) * 60000 })
  }

  function mostradorTimer(): string {
    if (restanteMs == null) return '25:00'
    const s = Math.max(0, Math.round(restanteMs / 1000))
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  function mudarColocadas(n: number) {
    setColocadas(n)
    ctx.atualizarSessao({ agulhas_colocadas: n })
  }

  function mudarRetiradas(n: number) {
    setRetiradas(n)
    ctx.atualizarSessao({ agulhas_retiradas: n })
  }

  function conferido() {
    mudarTimer(null)
    ctx.atualizarSessao({ agulhas_retiradas: retiradas, agulhas_conferidas: true })
    ctx.avancar()
  }

  // ---------- tela de divergência: BLOQUEIA até bater a conta ----------
  if (fase === 'divergencia' && retiradas !== colocadas) {
    const faltam = colocadas - retiradas
    return (
      <section
        className="stack-lg card"
        style={{ background: 'var(--cinnabar)', color: '#fff', textAlign: 'center' }}
      >
        <h2 style={{ color: '#fff' }}>
          {faltam > 0
            ? `Falta ${faltam} ${faltam === 1 ? 'agulha' : 'agulhas'} — confira antes de continuar`
            : 'Retirou mais do que colocou? Corrija a contagem.'}
        </h2>
        <p style={{ fontSize: 20 }}>
          Colocou {colocadas} · retirou {retiradas}
        </p>
        <div className="card stack" style={{ background: '#fffdf9', color: 'var(--ink)' }}>
          <p style={{ fontWeight: 600 }}>Agulhas retiradas</p>
          <Stepper valor={retiradas} aoMudar={mudarRetiradas} rotulo="agulhas retiradas" />
          <hr className="divider" />
          <p style={{ fontWeight: 600 }}>Se contou errado na colocação, corrija aqui</p>
          <Stepper valor={colocadas} aoMudar={mudarColocadas} rotulo="agulhas colocadas" />
        </div>
        <p style={{ fontSize: 18 }}>A conta precisa bater para a sessão poder ser concluída.</p>
      </section>
    )
  }

  if (fase === 'divergencia' && retiradas === colocadas) {
    return (
      <section className="stack-lg" style={{ textAlign: 'center' }}>
        <h2>Agora confere.</h2>
        <p style={{ fontSize: 22 }}>
          {colocadas} colocadas · {retiradas} retiradas
        </p>
        <button type="button" className="btn btn-primary btn-xl" onClick={conferido}>
          Conferido — {retiradas} de {colocadas} ✓
        </button>
      </section>
    )
  }

  // ---------- conferência ----------
  if (fase === 'conferencia') {
    return (
      <section className="stack-lg" style={{ textAlign: 'center' }}>
        <h2>Conferiu?</h2>
        <p style={{ fontSize: 24 }}>
          Colocou <strong>{colocadas}</strong>, retirou <strong>{colocadas}</strong>.
        </p>
        <button
          type="button"
          className="btn btn-primary btn-xl"
          onClick={() => {
            setRetiradas(colocadas)
            ctx.atualizarSessao({ agulhas_retiradas: colocadas, agulhas_conferidas: true })
            mudarTimer(null)
            ctx.avancar()
          }}
        >
          Sim, conferi — {colocadas} de {colocadas}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setRetiradas(colocadas)
            setFase('divergencia')
          }}
        >
          número diferente…
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setFase('retencao')}>
          voltar às agulhas
        </button>
      </section>
    )
  }

  // ---------- retenção ----------
  const acabou = restanteMs != null && restanteMs <= 0
  return (
    <section className="stack-lg">
      <h2>Quantas agulhas colocou?</h2>
      <Stepper valor={colocadas} aoMudar={mudarColocadas} rotulo="agulhas colocadas" />

      <div className="card-flat stack" style={{ textAlign: 'center' }}>
        {timer ? (
          <>
            <button
              type="button"
              onClick={alternarDuracao}
              aria-label={`cronômetro em ${mostradorTimer()} — toque para trocar entre 25 e 30 minutos`}
              className="num-display"
              style={{ fontSize: 72, fontFamily: 'var(--font-display)', color: acabou ? 'var(--jade)' : 'var(--ink)' }}
            >
              {mostradorTimer()}
            </button>
            <p className="muted small">
              {acabou
                ? 'Tempo de retenção completo ✓'
                : `contando ${timer.durMin} minutos — toque no número para trocar 25 ↔ 30`}
            </p>
            <button type="button" className="btn btn-ghost" onClick={() => mudarTimer(null)}>
              parar o cronômetro
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="num-display"
              aria-label="começar a contar 25 minutos de retenção"
              onClick={() => comecarTimer(25)}
              style={{ fontSize: 72, fontFamily: 'var(--font-display)', color: 'var(--ink-60)' }}
            >
              25:00
            </button>
            <p className="muted small">toque no número para começar a contar</p>
            <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-ghost" onClick={() => comecarTimer(25)}>
                Contar 25 minutos
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => comecarTimer(30)}>
                Contar 30 minutos
              </button>
            </div>
          </>
        )}
        <p className="muted small">Enquanto isso: separar as sementinhas · preparar a compressa</p>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-xl"
        disabled={colocadas === 0}
        onClick={() => setFase('conferencia')}
      >
        Retirei as agulhas →
      </button>
      {colocadas === 0 && <p className="muted small">Anote quantas agulhas colocou para seguir.</p>}
    </section>
  )
}
