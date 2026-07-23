// §3.2 C — CONDIÇÃO: cinco cartões grandes + outra. A escolha grava
// pacientes.condicao e ARMA os defaults do ciclo inteiro (pontos,
// destravamento, orientação, auriculo) vindos do protocolo N.01–N.05.

import { PROTOCOLOS } from '../../../lib/protocolos'
import { NOME_CONDICAO, type Condicao } from '../../../lib/tipos'
import type { CtxSessao } from '../tiposSessao'

const ORDEM: Condicao[] = ['lombalgia', 'cervical_ombros', 'enxaqueca', 'joelho', 'estresse_sono', 'outra']

export default function PassoCondicao({ ctx }: { ctx: CtxSessao }) {
  const atual = ctx.paciente.condicao

  function escolher(condicao: Condicao) {
    const protocolo = PROTOCOLOS[condicao]
    ctx.atualizarPaciente({ condicao })
    ctx.atualizarSessao({
      pontos: protocolo.base.map((p) => p.codigo),
      destrav_regioes: protocolo.destravTipico,
      auriculo_pontos: protocolo.auriculoTipico,
      orientacoes: protocolo.orientacoesTipicas,
    })
    ctx.avancar()
  }

  return (
    <section className="stack-lg">
      <h2>O que trouxe ela até aqui?</h2>
      <p className="muted">Um toque — os pontos e as orientações do protocolo já ficam prontos.</p>

      <div className="grid-2">
        {ORDEM.map((c) => (
          <button
            key={c}
            type="button"
            className="card-flat"
            aria-pressed={atual === c}
            onClick={() => escolher(c)}
            style={{
              textAlign: 'left',
              minHeight: 96,
              cursor: 'pointer',
              border: atual === c ? '2px solid var(--jade)' : '1.5px solid var(--hairline-strong)',
              background: atual === c ? 'var(--jade-soft)' : 'var(--card)',
            }}
          >
            <p style={{ fontSize: 21, fontWeight: 600 }}>
              {NOME_CONDICAO[c]}
              {atual === c ? ' ✓' : ''}
            </p>
            <p className="small muted">{PROTOCOLOS[c].titulo}</p>
          </button>
        ))}
      </div>

      {atual && (
        <button type="button" className="btn btn-primary btn-xl" onClick={ctx.avancar}>
          Continuar com {NOME_CONDICAO[atual]} →
        </button>
      )}
    </section>
  )
}
