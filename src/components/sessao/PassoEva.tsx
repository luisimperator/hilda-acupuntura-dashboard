// EVA de chegada, de saída e a EVA de base da primeira (spec §3.1 passos 1 e 6,
// §3.2 J). O ÚNICO dado do app com confirmação de dois toques: toca o número,
// ele cresce, e o botão vira "Confirmar: dói N".

import { useState } from 'react'
import EvaScale from '../EvaScale'
import { gravarAvaliacaoInicial } from './dadosSessao'
import { metaDaGarantia, type CtxSessao } from './tiposSessao'
import { nomeCurto, NOME_PROGRAMA } from '../../lib/tipos'

type Props = {
  ctx: CtxSessao
  campo: 'eva_pre' | 'eva_pos'
}

export default function PassoEva({ ctx, campo }: Props) {
  const { sessao, paciente, ciclo, variante, avaliacaoInicial, ultimaSessao } = ctx
  const valorGuardado = sessao[campo]
  const ehChegada = campo === 'eva_pre'
  const ehBase = ehChegada && variante === 'primeira'

  const [escolhido, setEscolhido] = useState<number | null>(null)
  const [corrigindo, setCorrigindo] = useState(false)
  const [celebrando, setCelebrando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const nome = nomeCurto(paciente)
  const confirmada = valorGuardado != null && !corrigindo

  const titulo = ehBase
    ? 'Quanto dói agora, de 0 a 10? (número de partida)'
    : ehChegada
      ? 'Quanto dói agora, de 0 a 10?'
      : 'E agora, saindo: quanto dói, de 0 a 10?'

  async function confirmar(n: number) {
    setErro(null)
    ctx.atualizarSessao(ehChegada ? { eva_pre: n } : { eva_pos: n })
    if (ehBase) {
      try {
        await gravarAvaliacaoInicial({ sessao, eva: n, rascunho: ctx.rascunho })
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Não consegui guardar a avaliação — tente de novo.')
        return
      }
    }
    setCorrigindo(false)
    setEscolhido(null)
    if (ehChegada) {
      ctx.avancar()
    } else {
      setCelebrando(true)
    }
  }

  // ---------- celebração sóbria da EVA de saída ----------
  if (!ehChegada && (celebrando || (confirmada && !corrigindo))) {
    const pre = sessao.eva_pre
    const pos = valorGuardado ?? sessao.eva_pos
    const caiu = pre != null && pos != null && pos < pre
    const base = variante === 'primeira' ? pre : (avaliacaoInicial?.eva ?? null)
    const meta = base != null ? metaDaGarantia(base) : null

    return (
      <section className="stack-lg">
        <div
          className="card stack"
          style={{
            textAlign: 'center',
            background: caiu ? 'var(--jade-deep)' : 'var(--card)',
            color: caiu ? 'var(--cream)' : 'var(--ink)',
          }}
        >
          <p className="num-display" style={{ fontSize: 52 }}>
            Entrou {pre ?? '—'} → saiu {pos ?? '—'}
          </p>
          {caiu && pre != null && pos != null && (
            <p style={{ fontSize: 22, fontStyle: 'italic' }}>
              queda de {pre - pos} {pre - pos === 1 ? 'ponto' : 'pontos'}
            </p>
          )}
          {!caiu && (
            <p style={{ fontSize: 20 }}>
              Hoje: {pre ?? '—'} → {pos ?? '—'}. Dias assim existem — o que vale é a curva.
            </p>
          )}
          {variante !== 'primeira' && base != null && meta != null && pos != null && (
            <p style={{ fontSize: 19 }}>
              No início do {ciclo ? NOME_PROGRAMA[ciclo.programa] : 'programa'}: {base}. Meta da garantia:{' '}
              {meta} ou menos{pos <= meta ? ' ✓' : ''}
            </p>
          )}
          {variante === 'primeira' && pre != null && pos != null && (
            <>
              <p style={{ fontSize: 21, fontWeight: 600 }}>
                {pre} → {pos} · na primeira sessão
              </p>
              <p style={{ fontSize: 18, fontStyle: 'italic' }}>
                Para falar agora: “Isso foi UMA sessão, e a mais leve. Guarda esse número.”
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setCelebrando(false)
            setCorrigindo(true)
            setEscolhido(null)
          }}
        >
          corrigir a dor de saída
        </button>
        <button type="button" className="btn btn-primary btn-xl" onClick={ctx.avancar}>
          Continuar →
        </button>
      </section>
    )
  }

  // ---------- valor já confirmado (retomada / voltou ao passo) ----------
  if (confirmada) {
    return (
      <section className="stack-lg">
        <h2>{titulo}</h2>
        <div className="card-flat row-between" style={{ flexWrap: 'wrap' }}>
          <p style={{ fontSize: 22 }}>
            {ehChegada ? 'Chegou com' : 'Saiu com'}{' '}
            <strong className="num-display" style={{ fontSize: 34 }}>
              {valorGuardado}
            </strong>
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => setCorrigindo(true)}>
            corrigir
          </button>
        </div>
        <button type="button" className="btn btn-primary btn-xl" onClick={ctx.avancar}>
          Continuar →
        </button>
      </section>
    )
  }

  // ---------- escala + confirmação de dois toques ----------
  return (
    <section className="stack-lg">
      <h2>{titulo}</h2>

      {ehBase && (
        <div className="card-flat" style={{ borderColor: 'var(--gold)', background: 'var(--gold-soft)' }}>
          <p style={{ fontWeight: 600 }}>
            Este é o número oficial de partida da {nome} — é ele que a gente mede de novo na 5ª sessão.
          </p>
          {paciente.eva_landing != null && (
            <p className="muted small">No WhatsApp ela disse {paciente.eva_landing}/10, como referência.</p>
          )}
        </div>
      )}

      {variante === 'checkpoint' && ehChegada && (
        <p className="muted">
          Esta é a EVA oficial da reavaliação — medida agora, antes do tratamento de hoje, como no dia 1.
        </p>
      )}

      {ehChegada && !ehBase && ultimaSessao?.eva_pre != null && (
        <p className="muted">Na última sessão: entrou com {ultimaSessao.eva_pre}.</p>
      )}
      {!ehChegada && sessao.eva_pre != null && <p className="muted">Hoje ela chegou com {sessao.eva_pre}.</p>}

      <EvaScale valor={escolhido} aoEscolher={setEscolhido} />
      <p className="small muted">0 = sem dor · 10 = a pior dor possível</p>

      {escolhido != null && (
        <div className="stack" style={{ textAlign: 'center' }}>
          <p className="num-display" style={{ fontSize: 88 }} aria-live="polite">
            {escolhido}
          </p>
          <button type="button" className="btn btn-primary btn-xl" onClick={() => void confirmar(escolhido)}>
            Confirmar: dói {escolhido}
          </button>
        </div>
      )}

      {corrigindo && (
        <button type="button" className="btn btn-ghost" onClick={() => setCorrigindo(false)}>
          deixar como estava ({valorGuardado})
        </button>
      )}

      {erro && (
        <p className="small" style={{ fontWeight: 600, color: 'var(--ink-60)' }}>
          {erro}
        </p>
      )}
    </section>
  )
}
