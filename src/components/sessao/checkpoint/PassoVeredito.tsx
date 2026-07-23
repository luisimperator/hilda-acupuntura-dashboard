// §3.3 — O VEREDITO da 5ª sessão: calculado pelas colunas geradas do banco,
// nunca de cabeça. Atingido → tela de evolução + relatório. Não atingido →
// tela sóbria sand com [AJUSTAR PROTOCOLO] ou [ACIONAR A GARANTIA].

import { useEffect, useState } from 'react'
import { dinheiro } from '../../../lib/datas'
import { nomeCurto } from '../../../lib/tipos'
import { acionarGarantia, gravarCheckpoint, registrarDecisaoCheckpoint } from '../dadosSessao'
import { frasesDaAvaliacao, type CtxSessao } from '../tiposSessao'
import RelatorioEvolucao from './RelatorioEvolucao'

export default function PassoVeredito({ ctx }: { ctx: CtxSessao }) {
  const { sessao, paciente, ciclo, avaliacaoInicial, avaliacaoCheckpoint, rascunho } = ctx
  const nome = nomeCurto(paciente)

  const [erro, setErro] = useState<string | null>(null)
  const [imprimindo, setImprimindo] = useState(false)
  const [confirmandoGarantia, setConfirmandoGarantia] = useState(false)
  const [garantiaFeita, setGarantiaFeita] = useState(ciclo?.status === 'garantia_acionada')
  const [ajusteFeito, setAjusteFeito] = useState(false)
  const [gravando, setGravando] = useState(false)

  const evaHoje = sessao.eva_pre
  const evaBase = avaliacaoInicial?.eva ?? paciente.eva_landing ?? evaHoje

  useEffect(() => {
    if (avaliacaoCheckpoint || evaHoje == null || evaBase == null) return
    let vivo = true
    void gravarCheckpoint({ sessao, eva: evaHoje, evaBase, rascunho })
      .then((a) => {
        if (vivo) ctx.definirCheckpoint(a)
      })
      .catch((e: unknown) => {
        if (vivo) setErro(e instanceof Error ? e.message : 'Não consegui calcular — tente de novo.')
      })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avaliacaoCheckpoint, evaHoje, evaBase])

  if (evaHoje == null) {
    return (
      <section className="stack-lg" style={{ textAlign: 'center' }}>
        <h2>Falta a dor de chegada</h2>
        <p className="muted">O veredito usa a EVA medida hoje, antes do tratamento.</p>
        <button type="button" className="btn btn-primary btn-xl" onClick={() => ctx.irPara('eva_pre')}>
          Medir a dor de chegada →
        </button>
      </section>
    )
  }

  const a = avaliacaoCheckpoint
  if (!a) {
    return (
      <section className="stack-lg" style={{ textAlign: 'center' }}>
        <p className="muted" style={{ fontSize: 22 }}>Calculando a evolução…</p>
        {erro && (
          <>
            <p className="small" style={{ fontWeight: 600, color: 'var(--ink-60)' }}>{erro}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setErro(null)
                if (evaBase != null) {
                  void gravarCheckpoint({ sessao, eva: evaHoje, evaBase, rascunho })
                    .then((nova) => ctx.definirCheckpoint(nova))
                    .catch((e: unknown) =>
                      setErro(e instanceof Error ? e.message : 'Não consegui calcular — tente de novo.'),
                    )
                }
              }}
            >
              Tentar de novo
            </button>
          </>
        )}
      </section>
    )
  }

  const frasesAntes = frasesDaAvaliacao(avaliacaoInicial)
  const frasesHoje = rascunho.frases.length > 0 ? rascunho.frases : frasesDaAvaliacao(a)
  const atingido = a.criterio_atingido === true

  // valor da garantia: (sessões restantes) × preço líquido por sessão
  const restantes = ciclo ? Math.max(0, ciclo.sessoes_total - (ctx.numeroDaSessao ?? 5)) : 0
  const porSessao = ciclo ? Math.round((ciclo.preco_centavos - ciclo.credito_centavos) / ciclo.sessoes_total) : 0
  const valorDevolucao = restantes * porSessao

  async function ajustarESeguir() {
    setGravando(true)
    setErro(null)
    try {
      await registrarDecisaoCheckpoint(a!.id, 'ajustar_protocolo')
      setAjusteFeito(true)
      ctx.avancar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui registrar — tente de novo.')
    } finally {
      setGravando(false)
    }
  }

  async function confirmarGarantia() {
    if (!ciclo) return
    setGravando(true)
    setErro(null)
    try {
      const novo = await acionarGarantia({ ciclo, restantes, valorDevolucaoCentavos: valorDevolucao, forma: 'outro' })
      ctx.definirCiclo(novo)
      setGarantiaFeita(true)
      setConfirmandoGarantia(false)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui registrar — tente de novo.')
    } finally {
      setGravando(false)
    }
  }

  // ---------- atingido: a tela da evolução ----------
  if (atingido) {
    return (
      <section className="stack-lg">
        <div className="card stack" style={{ border: '2px solid var(--gold)', textAlign: 'center' }}>
          <p className="eyebrow" style={{ color: '#7a5c26' }}>evolução da {nome}</p>
          <p className="num-display" style={{ fontSize: 56 }}>
            começou em {a.eva_base} → hoje {a.eva}
          </p>
          <p style={{ fontSize: 22 }}>
            queda de {a.queda_pontos} {a.queda_pontos === 1 ? 'ponto' : 'pontos'}
            {a.queda_pct != null ? ` · ${a.queda_pct}% a menos` : ''}
          </p>
          <p style={{ fontWeight: 700, color: 'var(--jade)', fontSize: 21 }}>✓ CRITÉRIO ATINGIDO</p>
          <p className="muted small">(o combinado: cair 2 pontos ou 30%)</p>
          {frasesAntes[0] && <p style={{ fontStyle: 'italic' }}>Antes: “{frasesAntes[0]}”</p>}
          {frasesHoje[0] && <p style={{ fontStyle: 'italic' }}>Hoje: “{frasesHoje[0]}”</p>}
        </div>

        {a.relatorio_impresso_em && (
          <p className="small" style={{ color: 'var(--jade)', fontWeight: 600, textAlign: 'center' }}>
            ✓ relatório impresso
          </p>
        )}
        <button type="button" className="btn btn-primary btn-xl" onClick={() => setImprimindo(true)}>
          Imprimir Relatório de Evolução →
        </button>
        <button type="button" className="btn btn-ghost btn-xl" onClick={ctx.avancar}>
          Continuar a sessão →
        </button>

        {imprimindo && <RelatorioEvolucao ctx={ctx} avaliacao={a} aoFechar={() => setImprimindo(false)} />}
      </section>
    )
  }

  // ---------- não atingido: sóbrio, sem cinnabar na frente da paciente ----------
  return (
    <section className="stack-lg">
      <div className="card-flat stack" style={{ background: 'var(--sand)', textAlign: 'center' }}>
        <p className="eyebrow">reavaliação da {nome}</p>
        <p className="num-display" style={{ fontSize: 48 }}>
          {a.eva_base} → {a.eva}
        </p>
        <p style={{ fontSize: 21 }}>
          Queda de {a.queda_pontos ?? 0} {a.queda_pontos === 1 ? 'ponto' : 'pontos'} — abaixo do combinado (2 pontos ou 30%).
        </p>
        {frasesAntes[0] && <p style={{ fontStyle: 'italic' }}>Antes: “{frasesAntes[0]}”</p>}
        {frasesHoje[0] && <p style={{ fontStyle: 'italic' }}>Hoje: “{frasesHoje[0]}”</p>}
      </div>

      {garantiaFeita ? (
        <div className="card-flat stack" style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 700 }}>Garantia registrada — devolução de {dinheiro(valorDevolucao)} lançada no caixa.</p>
          <p className="muted small">A sessão de hoje segue normalmente; o registro clínico não se apaga.</p>
          <button type="button" className="btn btn-primary btn-xl" onClick={ctx.avancar}>
            Continuar a sessão →
          </button>
        </div>
      ) : confirmandoGarantia ? (
        <div className="card stack">
          <p style={{ fontSize: 21, fontWeight: 600 }}>
            Devolver {dinheiro(valorDevolucao)} das {restantes} sessões restantes e encerrar o ciclo?
          </p>
          <p className="muted">A devolução entra negativa no caixa e o ciclo fica marcado — palavra é palavra.</p>
          <button type="button" className="btn btn-danger-ghost btn-xl" disabled={gravando} onClick={() => void confirmarGarantia()}>
            {gravando ? 'Registrando…' : 'Sim, acionar a garantia'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setConfirmandoGarantia(false)}>
            Voltar
          </button>
        </div>
      ) : (
        <>
          <button type="button" className="btn btn-primary btn-xl" disabled={gravando} onClick={() => void ajustarESeguir()}>
            {ajusteFeito ? 'Ajuste registrado ✓' : 'Ajustar protocolo e seguir →'}
          </button>
          {ciclo && (
            <button type="button" className="btn btn-ghost btn-xl" onClick={() => setConfirmandoGarantia(true)}>
              Acionar a garantia…
            </button>
          )}
        </>
      )}

      {erro && (
        <p className="small" style={{ fontWeight: 600, color: 'var(--ink-60)' }}>
          {erro}
        </p>
      )}
    </section>
  )
}
