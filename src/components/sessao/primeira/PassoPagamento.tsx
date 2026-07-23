// §3.2 S — PAGAMENTO DOS R$ 450: sempre, fechando ou não. Na sala, nunca depois.

import { useState } from 'react'
import { dinheiro } from '../../../lib/datas'
import type { Enums } from '../../../lib/database.types'
import { registrarPagamento } from '../dadosSessao'
import type { CtxSessao } from '../tiposSessao'

type Forma = Enums<'pagamento_forma_t'>

const FORMAS: { valor: Forma; rotulo: string }[] = [
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'cartao_credito', rotulo: 'Cartão de crédito' },
  { valor: 'cartao_debito', rotulo: 'Cartão de débito' },
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
]

export default function PassoPagamento({ ctx }: { ctx: CtxSessao }) {
  const { paciente, config, rascunho, pagamento450Feito } = ctx
  const valor = config?.preco_primeira_centavos ?? 45000
  const feito = pagamento450Feito || rascunho.pagamento450

  const [forma, setForma] = useState<Forma | null>(null)
  const [gravando, setGravando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function registrar() {
    if (!forma) return
    setGravando(true)
    setErro(null)
    try {
      await registrarPagamento({
        pacienteId: paciente.id,
        cicloId: ctx.sessao.ciclo_id,
        valorCentavos: valor,
        forma,
        descricao: 'Primeira Sessão Completa',
      })
      ctx.mudarRascunho({ pagamento450: true })
      ctx.avancar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui registrar — tente de novo.')
    } finally {
      setGravando(false)
    }
  }

  if (feito) {
    return (
      <section className="stack-lg" style={{ textAlign: 'center' }}>
        <h2>Pagamento de hoje registrado ✓</h2>
        <p className="muted">{dinheiro(valor)} da Primeira Sessão Completa.</p>
        <button type="button" className="btn btn-primary btn-xl" onClick={ctx.avancar}>
          Continuar →
        </button>
      </section>
    )
  }

  return (
    <section className="stack-lg">
      <h2>O pagamento de hoje: {dinheiro(valor)}</h2>
      <p className="muted">Da Primeira Sessão Completa — na sala, nunca depois. Como ela pagou?</p>

      <div className="choice-row">
        {FORMAS.map((f) => (
          <button
            key={f.valor}
            type="button"
            className="choice"
            style={{ minHeight: 64 }}
            data-selected={forma === f.valor}
            onClick={() => setForma(f.valor)}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-primary btn-xl"
        disabled={!forma || gravando}
        onClick={() => void registrar()}
      >
        {gravando ? 'Registrando…' : `Registrar — ${dinheiro(valor)} pagos na sala`}
      </button>

      {erro && (
        <p className="small" style={{ fontWeight: 600, color: 'var(--ink-60)' }}>
          {erro}
        </p>
      )}
    </section>
  )
}
