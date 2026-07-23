// Frequência da dor (spec §3.2 I / §3.3): chips grandes; no checkpoint,
// a frequência do dia 1 fica escrita ao lado para comparar.

import { FREQ_OPCOES, rotuloFreq, type CtxSessao } from './tiposSessao'

export default function PassoFrequencia({ ctx }: { ctx: CtxSessao }) {
  const { variante, rascunho, avaliacaoInicial } = ctx
  const ehCheckpoint = variante === 'checkpoint'

  return (
    <section className="stack-lg">
      <h2>Quantas vezes a dor aparece por semana?</h2>
      {ehCheckpoint && avaliacaoInicial?.freq_dor_semana != null && (
        <p className="muted">No dia 1: {rotuloFreq(avaliacaoInicial.freq_dor_semana)}.</p>
      )}

      <div className="choice-row">
        {FREQ_OPCOES.map((o) => (
          <button
            key={o.valor}
            type="button"
            className="choice"
            style={{ minHeight: 64 }}
            data-selected={rascunho.freq === o.valor}
            onClick={() => ctx.mudarRascunho({ freq: o.valor })}
          >
            {o.rotulo}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-primary btn-xl"
        disabled={rascunho.freq == null}
        onClick={ctx.avancar}
      >
        Guardar e continuar →
      </button>
      {rascunho.freq == null && <p className="muted small">Toque na frequência que ela contar.</p>}
    </section>
  )
}
