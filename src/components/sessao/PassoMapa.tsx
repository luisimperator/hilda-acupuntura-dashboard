// Mapa corporal como passo do trilho — primeira sessão (spec §3.2 G) e
// checkpoint (§3.3, com as zonas do dia 1 em contorno para comparar).
// Se a avaliação já foi gravada (EVA confirmada), o ajuste regrava.

import { gravarAvaliacaoInicial, gravarCheckpoint } from './dadosSessao'
import MapaCorporal from './MapaCorporal'
import { frasesDaAvaliacao, type CtxSessao } from './tiposSessao'
import { nomeCurto } from '../../lib/tipos'

export default function PassoMapa({ ctx }: { ctx: CtxSessao }) {
  const { variante, rascunho, avaliacaoInicial, sessao } = ctx
  const ehCheckpoint = variante === 'checkpoint'
  const zonasDia1 = ehCheckpoint ? (avaliacaoInicial?.mapa_zonas ?? []) : []

  async function continuar() {
    // se a avaliação correspondente já existe, mantém o mapa em dia nela
    try {
      if (!ehCheckpoint && sessao.eva_pre != null) {
        await gravarAvaliacaoInicial({ sessao, eva: sessao.eva_pre, rascunho })
      }
      if (ehCheckpoint && ctx.avaliacaoCheckpoint && sessao.eva_pre != null) {
        const nova = await gravarCheckpoint({
          sessao,
          eva: sessao.eva_pre,
          evaBase: ctx.avaliacaoCheckpoint.eva_base ?? sessao.eva_pre,
          rascunho,
        })
        ctx.definirCheckpoint(nova)
      }
    } catch {
      // o rascunho local segura o mapa; a gravação acontece na EVA/veredito
    }
    ctx.avancar()
  }

  return (
    <section className="stack-lg">
      <h2>{ehCheckpoint ? 'O mapa da dor, de novo' : `Onde dói? Toque onde a ${nomeCurto(ctx.paciente)} apontar.`}</h2>
      {ehCheckpoint && (
        <p className="muted">As zonas do dia 1 aparecem com contorno dourado — para comparar.</p>
      )}
      {ehCheckpoint && frasesDaAvaliacao(avaliacaoInicial).length === 0 && zonasDia1.length === 0 && (
        <p className="muted small">O dia 1 não teve mapa gravado — marque só o de hoje.</p>
      )}

      <MapaCorporal
        zonas={rascunho.mapaZonas}
        aoMudar={(zonas) => ctx.mudarRascunho({ mapaZonas: zonas })}
        zonasDia1={zonasDia1}
      />

      <button type="button" className="btn btn-primary btn-xl" onClick={() => void continuar()}>
        Guardar e continuar →
      </button>
    </section>
  )
}
