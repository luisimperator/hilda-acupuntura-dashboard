// §3.2 Q — A PRESCRIÇÃO: UM programa, nunca cardápio. Reset-10 é o default;
// Alívio-5 fica atrás de "outro programa…". A tela que a Hilda vira para a
// paciente, com o plano, a garantia por escrito e a conta pronta.

import { useState } from 'react'
import { dinheiro } from '../../../lib/datas'
import { nomeCurto, NOME_PROGRAMA } from '../../../lib/tipos'
import type { CtxSessao } from '../tiposSessao'

export default function PassoPrescricao({ ctx }: { ctx: CtxSessao }) {
  const { paciente, sessao, config, rascunho } = ctx
  const [trocando, setTrocando] = useState(false)

  const programa = rascunho.programa
  const valor =
    programa === 'reset_10'
      ? (config?.preco_reset_centavos ?? 340000)
      : (config?.preco_alivio_centavos ?? 190000)
  const credito = config?.preco_primeira_centavos ?? 45000
  const aPagar = valor - credito
  const parcela3 = Math.ceil(aPagar / 3 / 100) * 100
  const totalSessoes = programa === 'reset_10' ? 10 : 5
  const nome = nomeCurto(paciente)

  return (
    <section className="stack-lg">
      <p className="muted small" style={{ textAlign: 'center' }}>
        vire o tablet para ela — esta tela é da paciente
      </p>

      <div className="card stack" style={{ textAlign: 'center', padding: 32 }}>
        <p className="eyebrow">o plano da {nome}</p>
        {paciente.objetivo_frase && (
          <p style={{ fontStyle: 'italic', fontSize: 22 }}>“{paciente.objetivo_frase}”</p>
        )}
        {sessao.eva_pre != null && sessao.eva_pos != null && (
          <p style={{ fontSize: 21 }}>
            Hoje: dor entrou <strong>{sessao.eva_pre}</strong> → saiu <strong>{sessao.eva_pos}</strong> (1ª sessão)
          </p>
        )}
        <h2 style={{ fontSize: 34 }}>
          {NOME_PROGRAMA[programa].toUpperCase()} · {totalSessoes} sessões
        </h2>
        <p style={{ fontSize: 20 }}>2× por semana no 1º mês · reavaliação na 5ª</p>
        <div className="card-flat" style={{ borderColor: 'var(--gold)', background: 'var(--gold-soft)' }}>
          <p style={{ fontWeight: 600 }}>
            Garantia por escrito: se a dor não cair 2 pontos (ou 30%) até a 5ª sessão, devolvo o valor das
            sessões restantes.
          </p>
        </div>
        <p className="num-display" style={{ fontSize: 30 }}>
          {dinheiro(valor)} − {dinheiro(credito)} de hoje = {dinheiro(aPagar)}
        </p>
        <p style={{ fontSize: 20 }}>à vista, ou 3× de {dinheiro(parcela3)}</p>
      </div>

      {trocando ? (
        <div className="choice-row" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="choice"
            data-selected={programa === 'reset_10'}
            onClick={() => {
              ctx.mudarRascunho({ programa: 'reset_10' })
              setTrocando(false)
            }}
          >
            Reset · 10 sessões
          </button>
          <button
            type="button"
            className="choice"
            data-selected={programa === 'alivio_5'}
            onClick={() => {
              ctx.mudarRascunho({ programa: 'alivio_5' })
              setTrocando(false)
            }}
          >
            Alívio · 5 sessões (dor aguda/recente)
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn"
          style={{ color: 'var(--ink-60)', textDecoration: 'underline', alignSelf: 'center' }}
          onClick={() => setTrocando(true)}
        >
          outro programa…
        </button>
      )}

      <button type="button" className="btn btn-primary btn-xl" onClick={ctx.avancar}>
        Ela viu o plano — e aí? →
      </button>
    </section>
  )
}
