// §3.2 F — CAUTELAS: seis interruptores grandes que viram selos permanentes
// no cabeçalho e moldam o app (eletro travado, alerta de pontos na gestação…).

import type { TablesUpdate } from '../../../lib/database.types'
import type { CtxSessao } from '../tiposSessao'

type ChaveCautela = 'anticoagulante' | 'gestante' | 'marcapasso' | 'diabetes_neuropatia' | 'medo_agulha'

const CAUTELAS: { chave: ChaveCautela; rotulo: string; consequencia: string }[] = [
  { chave: 'anticoagulante', rotulo: 'Usa anticoagulante', consequencia: 'agulhamento superficial, comprimir ao retirar' },
  { chave: 'gestante', rotulo: 'Gestante', consequencia: 'evitar LI4 · SP6 · BL60 · BL67 (o app avisa)' },
  { chave: 'marcapasso', rotulo: 'Marca-passo', consequencia: 'nunca eletro — o cartão fica travado' },
  { chave: 'diabetes_neuropatia', rotulo: 'Diabetes com neuropatia', consequencia: 'atenção a pés e cicatrização' },
  { chave: 'medo_agulha', rotulo: 'Medo de agulha', consequencia: 'protocolo reduzido, destravamento pré-marcado' },
]

export default function PassoCautelas({ ctx }: { ctx: CtxSessao }) {
  const { paciente } = ctx
  const algumaMarcada = CAUTELAS.some((c) => paciente[c.chave])

  function alternar(chave: ChaveCautela) {
    ctx.atualizarPaciente({ [chave]: !paciente[chave] } as TablesUpdate<'pacientes'>)
  }

  function nenhuma() {
    ctx.atualizarPaciente({
      anticoagulante: false,
      gestante: false,
      marcapasso: false,
      diabetes_neuropatia: false,
      medo_agulha: false,
    })
    ctx.avancar()
  }

  return (
    <section className="stack-lg">
      <h2>Alguma destas cautelas?</h2>
      <p className="muted">Viram selos permanentes na ficha — o app passa a cuidar disso sozinho.</p>

      <div className="stack">
        {CAUTELAS.map((c) => {
          const ligada = paciente[c.chave]
          return (
            <button
              key={c.chave}
              type="button"
              className="card-flat row-between"
              aria-pressed={ligada}
              onClick={() => alternar(c.chave)}
              style={{
                cursor: 'pointer',
                minHeight: 84,
                textAlign: 'left',
                border: ligada ? '2px solid var(--cinnabar)' : '1.5px solid var(--hairline-strong)',
                background: ligada ? 'var(--cinnabar-soft)' : 'var(--card)',
              }}
            >
              <span>
                <span style={{ display: 'block', fontSize: 20, fontWeight: 600 }}>
                  {ligada ? '⚠ ' : ''}
                  {c.rotulo}
                </span>
                <span className="small muted">{c.consequencia}</span>
              </span>
              <span style={{ fontWeight: 700, color: ligada ? 'var(--cinnabar)' : 'var(--ink-60)' }}>
                {ligada ? 'SIM' : 'NÃO'}
              </span>
            </button>
          )
        })}
      </div>

      {algumaMarcada ? (
        <button type="button" className="btn btn-primary btn-xl" onClick={ctx.avancar}>
          Continuar com as cautelas marcadas →
        </button>
      ) : (
        <button type="button" className="btn btn-primary btn-xl" onClick={nenhuma}>
          Nenhuma dessas — seguir →
        </button>
      )}
    </section>
  )
}
