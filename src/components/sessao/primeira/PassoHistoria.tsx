// §3.2 D — HISTÓRIA ESSENCIAL: duas frases por ditado, opcionais.
// O resto da anamnese continua no papel — digitar mataria o acolhimento.

import { useState } from 'react'
import type { CtxSessao } from '../tiposSessao'

export default function PassoHistoria({ ctx }: { ctx: CtxSessao }) {
  const [historia, setHistoria] = useState(ctx.sessao.historia ?? '')
  const [medicacoes, setMedicacoes] = useState(ctx.sessao.medicacoes ?? '')

  return (
    <section className="stack-lg">
      <h2>A história, numa frase</h2>
      <p className="muted">Os dois campos são opcionais — o papel da anamnese continua na pasta.</p>

      <label className="field">
        <span className="field-label">História da dor</span>
        <textarea
          className="textarea"
          value={historia}
          onChange={(e) => setHistoria(e.target.value)}
          onBlur={() => ctx.atualizarSessao({ historia: historia.trim() || null })}
          placeholder="ex.: começou depois da mudança, piora ao fim do dia"
        />
        <span className="field-hint">dica: toque no microfone do teclado e deixe ela contar</span>
      </label>

      <label className="field">
        <span className="field-label">Medicações em uso</span>
        <textarea
          className="textarea"
          value={medicacoes}
          onChange={(e) => setMedicacoes(e.target.value)}
          onBlur={() => ctx.atualizarSessao({ medicacoes: medicacoes.trim() || null })}
          placeholder="ex.: losartana, dipirona quando dói"
        />
        <span className="field-hint">dica: dá para ditar pelo microfone do teclado</span>
      </label>

      <button
        type="button"
        className="btn btn-primary btn-xl"
        onClick={() => {
          ctx.atualizarSessao({ historia: historia.trim() || null, medicacoes: medicacoes.trim() || null })
          ctx.avancar()
        }}
      >
        Guardar e continuar →
      </button>
    </section>
  )
}
