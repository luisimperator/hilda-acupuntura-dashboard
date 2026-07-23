// Passo 4 — COMPLEMENTOS (spec §3.1): cinco cartões-interruptor.
// Auriculo pré-marcado NA UI (o banco só grava o que a tela salvar);
// marca-passo trava o cartão Eletro com cadeado e motivo escrito.

import { useState } from 'react'
import { PROTOCOLOS } from '../../lib/protocolos'
import { passosDe, type CtxSessao } from './tiposSessao'

type Comp = 'eletro' | 'moxa' | 'ventosa' | 'auriculo' | 'respiracao_guiada'

const CARTOES: { chave: Comp; rotulo: string; emoji: string }[] = [
  { chave: 'eletro', rotulo: 'Eletro', emoji: '⚡' },
  { chave: 'moxa', rotulo: 'Moxa', emoji: '🔥' },
  { chave: 'ventosa', rotulo: 'Ventosa', emoji: '🫙' },
  { chave: 'auriculo', rotulo: 'Auriculo (sementes)', emoji: '👂' },
  { chave: 'respiracao_guiada', rotulo: 'Respiração guiada', emoji: '🧘' },
]

export default function PassoComplementos({ ctx }: { ctx: CtxSessao }) {
  const { sessao, paciente, variante, correcao } = ctx
  const protocolo = PROTOCOLOS[paciente.condicao ?? 'outra']

  // Pré-marca o auriculo só na primeira visita ao passo (padrão da casa).
  const passos = passosDe(variante, correcao)
  const jaPassouDaqui = passos.indexOf(sessao.passo_atual) > passos.indexOf('complementos')
  const [ligados, setLigados] = useState<Record<Comp, boolean>>({
    eletro: sessao.eletro,
    moxa: sessao.moxa,
    ventosa: sessao.ventosa,
    auriculo: sessao.auriculo || (!jaPassouDaqui && !correcao),
    respiracao_guiada: sessao.respiracao_guiada,
  })
  const [pontosAuriculo, setPontosAuriculo] = useState<string[]>(
    sessao.auriculo_pontos.length > 0 ? sessao.auriculo_pontos : protocolo.auriculoTipico,
  )

  const chipsAuriculo = Array.from(
    new Set(['shenmen', 'subcórtex', 'coração', ...protocolo.auriculoTipico, ...pontosAuriculo]),
  )

  function alternar(chave: Comp) {
    if (chave === 'eletro' && paciente.marcapasso) return
    setLigados((l) => ({ ...l, [chave]: !l[chave] }))
  }

  function guardarEContinuar() {
    ctx.atualizarSessao({
      eletro: ligados.eletro,
      moxa: ligados.moxa,
      ventosa: ligados.ventosa,
      auriculo: ligados.auriculo,
      respiracao_guiada: ligados.respiracao_guiada,
      auriculo_pontos: ligados.auriculo ? pontosAuriculo : [],
    })
    ctx.avancar()
  }

  return (
    <section className="stack-lg">
      <h2>Complementos de hoje</h2>

      <div className="grid-2">
        {CARTOES.map((c) => {
          const travado = c.chave === 'eletro' && paciente.marcapasso
          const ligado = !travado && ligados[c.chave]
          return (
            <button
              key={c.chave}
              type="button"
              className="card-flat"
              aria-pressed={ligado}
              disabled={travado}
              onClick={() => alternar(c.chave)}
              style={{
                textAlign: 'left',
                minHeight: 92,
                cursor: travado ? 'not-allowed' : 'pointer',
                border: ligado ? '2px solid var(--jade)' : '1.5px solid var(--hairline-strong)',
                background: ligado ? 'var(--jade-soft)' : 'var(--card)',
                opacity: 1,
              }}
            >
              <p style={{ fontSize: 21, fontWeight: 600, textDecoration: travado ? 'line-through' : 'none' }}>
                {travado ? '🔒' : c.emoji} {c.rotulo}
              </p>
              {travado ? (
                <p className="small" style={{ color: 'var(--cinnabar)', fontWeight: 700 }}>
                  nunca eletro — marca-passo
                </p>
              ) : (
                <p className="small" style={{ color: ligado ? 'var(--jade)' : 'var(--ink-60)', fontWeight: 600 }}>
                  {ligado ? 'Vai fazer hoje ✓' : 'Hoje não'}
                </p>
              )}
            </button>
          )
        })}
      </div>

      {ligados.auriculo && (
        <div className="stack">
          <p className="eyebrow">sementes — onde?</p>
          <div className="choice-row">
            {chipsAuriculo.map((p) => (
              <button
                key={p}
                type="button"
                className="choice"
                data-selected={pontosAuriculo.includes(p)}
                onClick={() =>
                  setPontosAuriculo((atual) =>
                    atual.includes(p) ? atual.filter((x) => x !== p) : [...atual, p],
                  )
                }
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <button type="button" className="btn btn-primary btn-xl" onClick={guardarEContinuar}>
        Guardar e continuar →
      </button>
    </section>
  )
}
