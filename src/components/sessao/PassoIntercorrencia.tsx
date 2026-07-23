// Passo 7 — CORREU TUDO BEM? (spec §3.1): [SIM, TUDO BEM] gigante,
// chips de intercorrência atrás de "houve algo". Tontura mostra o protocolo.

import { useState } from 'react'
import { INTERCORRENCIAS } from '../../lib/protocolos'
import type { CtxSessao } from './tiposSessao'

export default function PassoIntercorrencia({ ctx }: { ctx: CtxSessao }) {
  const { sessao } = ctx
  const diaDificil = sessao.eva_pre != null && sessao.eva_pos != null && sessao.eva_pos >= sessao.eva_pre
  const [aberto, setAberto] = useState(sessao.intercorrencias.length > 0 || diaDificil)
  const [marcadas, setMarcadas] = useState<string[]>(sessao.intercorrencias)
  const [obs, setObs] = useState(sessao.intercorrencia_obs ?? '')

  return (
    <section className="stack-lg">
      <h2>Correu tudo bem?</h2>

      <button
        type="button"
        className="btn btn-primary btn-xl"
        onClick={() => {
          ctx.atualizarSessao({ intercorrencias: [], intercorrencia_obs: null })
          ctx.avancar()
        }}
      >
        Sim, tudo bem
      </button>

      {!aberto ? (
        <button type="button" className="btn btn-ghost" onClick={() => setAberto(true)}>
          houve algo…
        </button>
      ) : (
        <div className="stack">
          <p style={{ fontWeight: 600 }}>O que houve? (pode marcar mais de uma)</p>
          <div className="choice-row">
            {INTERCORRENCIAS.map((i) => (
              <button
                key={i}
                type="button"
                className="choice"
                data-selected={marcadas.includes(i)}
                onClick={() =>
                  setMarcadas((m) => (m.includes(i) ? m.filter((x) => x !== i) : [...m, i]))
                }
              >
                {i}
              </button>
            ))}
          </div>

          {marcadas.includes('tontura') && (
            <div
              className="card-flat"
              style={{ borderColor: 'var(--cinnabar)', background: 'var(--cinnabar-soft)' }}
              role="note"
            >
              <p style={{ fontWeight: 700, color: 'var(--cinnabar)' }}>Protocolo da tontura:</p>
              <p>deitar, pernas elevadas, água com açúcar, ficar junto até recuperar.</p>
            </div>
          )}

          <label className="field">
            <span className="field-label">Observação (se quiser)</span>
            <textarea
              className="textarea"
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="o que aconteceu, nas suas palavras"
            />
            <span className="field-hint">dica: dá para ditar pelo microfone do teclado</span>
          </label>

          <button
            type="button"
            className="btn btn-primary btn-xl"
            onClick={() => {
              ctx.atualizarSessao({ intercorrencias: marcadas, intercorrencia_obs: obs.trim() || null })
              ctx.avancar()
            }}
          >
            Guardar e continuar →
          </button>
        </div>
      )}
    </section>
  )
}
