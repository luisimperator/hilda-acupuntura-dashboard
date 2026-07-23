// Passo 8 — ORIENTAÇÃO DE CASA (spec §3.1): chips prontos, default vindo
// da última sessão (ou do típico da condição), "outra…" com ditado.

import { useState } from 'react'
import { ORIENTACOES_CASA, PROTOCOLOS } from '../../lib/protocolos'
import type { CtxSessao } from './tiposSessao'

export default function PassoOrientacao({ ctx }: { ctx: CtxSessao }) {
  const { sessao, paciente } = ctx
  const protocolo = PROTOCOLOS[paciente.condicao ?? 'outra']

  const [marcadas, setMarcadas] = useState<string[]>(
    sessao.orientacoes.length > 0 ? sessao.orientacoes : protocolo.orientacoesTipicas,
  )
  const [livre, setLivre] = useState(sessao.orientacao_livre ?? '')

  return (
    <section className="stack-lg">
      <h2>O que ela leva para casa?</h2>
      <p className="muted small">já vem marcado o que você orientou da última vez</p>

      <div className="choice-row">
        {ORIENTACOES_CASA.map((o) => (
          <button
            key={o}
            type="button"
            className="choice"
            data-selected={marcadas.includes(o)}
            onClick={() => setMarcadas((m) => (m.includes(o) ? m.filter((x) => x !== o) : [...m, o]))}
          >
            {o}
          </button>
        ))}
      </div>

      <label className="field">
        <span className="field-label">Outra orientação (se quiser)</span>
        <input
          className="input"
          value={livre}
          onChange={(e) => setLivre(e.target.value)}
          placeholder="ex.: elevar a perna ao assistir novela"
        />
        <span className="field-hint">dica: dá para ditar pelo microfone do teclado</span>
      </label>

      <button
        type="button"
        className="btn btn-primary btn-xl"
        onClick={() => {
          ctx.atualizarSessao({ orientacoes: marcadas, orientacao_livre: livre.trim() || null })
          ctx.avancar()
        }}
      >
        Guardar e continuar →
      </button>
    </section>
  )
}
