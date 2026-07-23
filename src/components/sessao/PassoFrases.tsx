// As frases dela (Semente 1 + Semente 2) — primeira sessão (spec §3.2 H):
// até 3 frases, com as palavras DELA; a 1ª vira o topo da ficha. No
// checkpoint (§3.3): campo a campo, "Ela disse: X. E hoje?".

import { useState } from 'react'
import { nomeCurto } from '../../lib/tipos'
import type { Enums } from '../../lib/database.types'
import { frasesDaAvaliacao, type CtxSessao } from './tiposSessao'

const DECISOR_OPCOES: { valor: Enums<'decisor_t'>; rotulo: string }[] = [
  { valor: 'sozinha', rotulo: 'ela resolve sozinha' },
  { valor: 'conjuge', rotulo: 'conversa com o marido' },
  { valor: 'filho_a', rotulo: 'com o filho / filha' },
  { valor: 'outro', rotulo: 'outra pessoa' },
  { valor: 'nao_perguntado', rotulo: 'não perguntei ainda' },
]

export default function PassoFrases({ ctx }: { ctx: CtxSessao }) {
  const { variante, rascunho, avaliacaoInicial, paciente } = ctx
  const ehCheckpoint = variante === 'checkpoint'
  const frasesDia1 = frasesDaAvaliacao(avaliacaoInicial)
  const quantos = ehCheckpoint ? Math.max(frasesDia1.length, 1) : 3

  const [frases, setFrases] = useState<string[]>(() => {
    const base = [...rascunho.frases]
    while (base.length < quantos) base.push('')
    return base.slice(0, quantos)
  })

  function mudar(i: number, texto: string) {
    const novas = frases.map((f, j) => (j === i ? texto : f))
    setFrases(novas)
  }

  function continuar() {
    const limpas = frases.map((f) => f.trim()).filter((f) => f !== '')
    ctx.mudarRascunho({ frases: limpas })
    if (!ehCheckpoint && limpas[0] && limpas[0] !== (paciente.objetivo_frase ?? '')) {
      ctx.atualizarPaciente({ objetivo_frase: limpas[0] })
    }
    ctx.avancar()
  }

  return (
    <section className="stack-lg">
      <h2>
        {ehCheckpoint
          ? 'As frases dela — antes e agora'
          : `O que a dor impede a ${nomeCurto(paciente)} de fazer hoje?`}
      </h2>
      {!ehCheckpoint && <p className="muted">Anote com as palavras DELA — a primeira vira o topo da ficha.</p>}

      {frases.map((f, i) => (
        <label key={i} className="field">
          <span className="field-label">
            {ehCheckpoint
              ? frasesDia1[i]
                ? `Ela disse: “${frasesDia1[i]}”. E hoje?`
                : 'Como ela descreve hoje?'
              : i === 0
                ? 'Frase 1 (a principal)'
                : `Frase ${i + 1} (se houver)`}
          </span>
          <input
            className="input"
            value={f}
            onChange={(e) => mudar(i, e.target.value)}
            placeholder={ehCheckpoint ? 'ex.: peguei ela no colo domingo' : 'ex.: não consigo pegar minha neta no colo'}
          />
          <span className="field-hint">dica: dá para ditar pelo microfone do teclado</span>
        </label>
      ))}

      {!ehCheckpoint && (
        <div className="stack">
          <p style={{ fontWeight: 600 }}>E quem decide junto com ela? (sem cerimônia)</p>
          <div className="choice-row">
            {DECISOR_OPCOES.map((o) => (
              <button
                key={o.valor}
                type="button"
                className="choice"
                data-selected={paciente.decisor === o.valor}
                onClick={() => ctx.atualizarPaciente({ decisor: o.valor })}
              >
                {o.rotulo}
              </button>
            ))}
          </div>
        </div>
      )}

      <button type="button" className="btn btn-primary btn-xl" onClick={continuar}>
        Guardar e continuar →
      </button>
    </section>
  )
}
