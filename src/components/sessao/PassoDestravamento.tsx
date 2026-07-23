// Passo 2 — DESTRAVAMENTO (spec §3.1): SIM/NÃO gigantes + regiões
// pré-marcadas com as da última sessão (ou as típicas da condição).

import { useState } from 'react'
import { PROTOCOLOS, REGIOES_DESTRAV } from '../../lib/protocolos'
import type { CtxSessao } from './tiposSessao'

export default function PassoDestravamento({ ctx }: { ctx: CtxSessao }) {
  const { sessao, paciente } = ctx
  const protocolo = PROTOCOLOS[paciente.condicao ?? 'outra']

  // medo de agulha → destravamento pré-marcado (spec §3.2 F)
  const [fazendo, setFazendo] = useState<boolean | null>(
    sessao.destravamento ?? (paciente.medo_agulha ? true : null),
  )
  const [regioes, setRegioes] = useState<string[]>(
    sessao.destrav_regioes.length > 0 ? sessao.destrav_regioes : protocolo.destravTipico,
  )

  function alternarRegiao(r: string) {
    setRegioes((atual) => (atual.includes(r) ? atual.filter((x) => x !== r) : [...atual, r]))
  }

  function responder(sim: boolean) {
    setFazendo(sim)
    if (!sim) {
      ctx.atualizarSessao({ destravamento: false, destrav_regioes: [] })
      ctx.avancar()
    } else {
      ctx.atualizarSessao({ destravamento: true })
    }
  }

  return (
    <section className="stack-lg">
      <h2>Vai fazer a massagem preparatória?</h2>
      <p className="muted small">
        régua: trigger ativo · tensão que impede relaxar · medo de agulha · amplitude limitada
      </p>

      <div className="grid-2">
        <button
          type="button"
          className="btn btn-xl"
          style={
            fazendo === true
              ? { background: 'var(--jade)', color: 'var(--cream)' }
              : { background: 'var(--card)', border: '1.5px solid var(--hairline-strong)' }
          }
          aria-pressed={fazendo === true}
          onClick={() => responder(true)}
        >
          SIM
        </button>
        <button
          type="button"
          className="btn btn-xl"
          style={
            fazendo === false
              ? { background: 'var(--jade)', color: 'var(--cream)' }
              : { background: 'var(--card)', border: '1.5px solid var(--hairline-strong)' }
          }
          aria-pressed={fazendo === false}
          onClick={() => responder(false)}
        >
          NÃO
        </button>
      </div>

      {fazendo === true && (
        <>
          <p style={{ fontWeight: 600 }}>Onde? (pode marcar mais de uma)</p>
          <div className="choice-row">
            {REGIOES_DESTRAV.map((r) => (
              <button
                key={r}
                type="button"
                className="choice"
                data-selected={regioes.includes(r)}
                onClick={() => alternarRegiao(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-xl"
            onClick={() => {
              ctx.atualizarSessao({ destravamento: true, destrav_regioes: regioes })
              ctx.avancar()
            }}
          >
            Guardar e continuar →
          </button>
        </>
      )}
    </section>
  )
}
