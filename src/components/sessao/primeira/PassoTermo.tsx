// §3.2 B — TERMO: papel continua papel na V1; aqui só o toque "ASSINADO ✓".

import type { CtxSessao } from '../tiposSessao'

export default function PassoTermo({ ctx }: { ctx: CtxSessao }) {
  const assinado = ctx.sessao.termo_assinado

  return (
    <section className="stack-lg" style={{ textAlign: 'center' }}>
      <h2>Termo de consentimento assinado no papel?</h2>
      <p className="muted">O papel assinado vai para a pasta — aqui fica só o registro do toque.</p>

      {assinado ? (
        <>
          <p style={{ fontSize: 22, color: 'var(--jade)', fontWeight: 700 }}>Assinado ✓</p>
          <button type="button" className="btn btn-primary btn-xl" onClick={ctx.avancar}>
            Continuar →
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn btn-primary btn-xl"
          onClick={() => {
            ctx.atualizarSessao({ termo_assinado: true })
            ctx.avancar()
          }}
        >
          Assinado ✓
        </button>
      )}
    </section>
  )
}
