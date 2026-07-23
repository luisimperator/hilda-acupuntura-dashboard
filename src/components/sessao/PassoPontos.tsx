// Passo 3 — PONTOS (spec §3.1): "USAR ESTES MESMOS" resolve em 1 toque;
// chips dos grupos do protocolo; gestante vê os pontos contraindicados
// com alerta e toque extra.

import { useState } from 'react'
import { PONTOS_CONTRAINDICADOS_GESTACAO, PROTOCOLOS, type Ponto } from '../../lib/protocolos'
import type { CtxSessao } from './tiposSessao'

export default function PassoPontos({ ctx }: { ctx: CtxSessao }) {
  const { sessao, paciente, redFlagDaSessao } = ctx
  const protocolo = PROTOCOLOS[paciente.condicao ?? 'outra']

  const [pontos, setPontos] = useState<string[]>(
    sessao.pontos.length > 0 ? sessao.pontos : protocolo.base.map((p) => p.codigo),
  )
  const [confirmandoGestante, setConfirmandoGestante] = useState<string | null>(null)
  const [outro, setOutro] = useState('')

  const contraindicados = new Set<string>(PONTOS_CONTRAINDICADOS_GESTACAO)
  const ehContraindicado = (codigo: string) => paciente.gestante && contraindicados.has(codigo)

  function alternar(codigo: string) {
    if (pontos.includes(codigo)) {
      setPontos(pontos.filter((p) => p !== codigo))
      return
    }
    if (ehContraindicado(codigo)) {
      setConfirmandoGestante(codigo)
      return
    }
    setPontos([...pontos, codigo])
  }

  function guardarEContinuar(lista: string[]) {
    ctx.atualizarSessao({ pontos: lista })
    ctx.avancar()
  }

  const grupos: { rotulo: string; itens: Ponto[] }[] = [
    { rotulo: `base — ${protocolo.titulo}`, itens: protocolo.base },
    ...protocolo.extras.map((e) => ({ rotulo: e.rotulo, itens: e.pontos })),
    ...(protocolo.regulacao.length > 0 ? [{ rotulo: 'regulação', itens: protocolo.regulacao }] : []),
  ]

  const foraDosGrupos = pontos.filter(
    (codigo) => !grupos.some((g) => g.itens.some((p) => p.codigo === codigo)),
  )

  return (
    <section className="stack-lg">
      <h2>Pontos de hoje</h2>

      {redFlagDaSessao?.alguma_positiva && (
        <div className="card-flat" style={{ borderColor: 'var(--cinnabar)', background: 'var(--cinnabar-soft)' }}>
          <p style={{ fontWeight: 700, color: 'var(--cinnabar)' }}>
            ⚠ Red flag registrada hoje — não agulhar a região sinalizada. Tratar só a região liberada.
          </p>
        </div>
      )}

      {pontos.length > 0 && (
        <>
          <div className="card-flat">
            <p style={{ fontSize: 20, lineHeight: 1.8 }}>
              {pontos.map((p) => (
                <span key={p} style={{ marginRight: 14, whiteSpace: 'nowrap' }}>
                  <strong>{p}</strong> ✓
                </span>
              ))}
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-xl" onClick={() => guardarEContinuar(pontos)}>
            Usar estes mesmos →
          </button>
        </>
      )}
      {pontos.length === 0 && <p className="muted">Nenhum ponto marcado ainda — toque nos chips abaixo.</p>}

      <p className="muted" style={{ fontWeight: 600 }}>
        ou ajuste tocando:
      </p>

      {grupos.map((g) => (
        <div key={g.rotulo} className="stack">
          <p className="eyebrow">{g.rotulo}</p>
          <div className="choice-row">
            {g.itens.map((p) => (
              <button
                key={p.codigo}
                type="button"
                className="choice"
                data-selected={pontos.includes(p.codigo)}
                onClick={() => alternar(p.codigo)}
                style={ehContraindicado(p.codigo) ? { borderColor: 'var(--cinnabar)' } : undefined}
              >
                {ehContraindicado(p.codigo) ? '⚠ ' : ''}
                {p.codigo}
                {p.nome ? ` · ${p.nome}` : ''}
              </button>
            ))}
          </div>
        </div>
      ))}

      {foraDosGrupos.length > 0 && (
        <div className="stack">
          <p className="eyebrow">outros pontos desta sessão</p>
          <div className="choice-row">
            {foraDosGrupos.map((codigo) => (
              <button
                key={codigo}
                type="button"
                className="choice"
                data-selected
                onClick={() => alternar(codigo)}
              >
                {codigo}
              </button>
            ))}
          </div>
        </div>
      )}

      {confirmandoGestante && (
        <div className="card" style={{ borderColor: 'var(--cinnabar)', background: 'var(--cinnabar-soft)' }}>
          <p style={{ fontWeight: 700, color: 'var(--cinnabar)' }}>
            ⚠ {confirmandoGestante} é contraindicado na gestação.
          </p>
          <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-danger-ghost"
              onClick={() => {
                setPontos([...pontos, confirmandoGestante])
                setConfirmandoGestante(null)
              }}
            >
              Usar mesmo assim
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmandoGestante(null)}>
              Deixar fora
            </button>
          </div>
        </div>
      )}

      <div className="row" style={{ flexWrap: 'wrap' }}>
        <input
          className="input"
          style={{ flex: 1, minWidth: 200 }}
          placeholder="outro ponto… (ex.: ST44)"
          value={outro}
          onChange={(e) => setOutro(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            const codigo = outro.trim()
            if (codigo && !pontos.includes(codigo)) setPontos([...pontos, codigo])
            setOutro('')
          }}
        >
          Adicionar ponto
        </button>
      </div>
    </section>
  )
}
