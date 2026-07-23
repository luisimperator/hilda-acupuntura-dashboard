import { useState } from 'react'
import { dataISO, diaPorExtenso } from '../../lib/datas'
import { NOME_PROGRAMA, type Avaliacao, type Ciclo, type Proposta, type Sessao } from '../../lib/tipos'

type Props = {
  /** Ciclo em foco: o ativo, ou o mais recente quando não há ativo */
  ciclo: Ciclo | null
  /** Sessões concluídas do ciclo, em ordem cronológica */
  sessoesDoCiclo: Sessao[]
  propostaPendente: Proposta | null
  /** Avaliação de checkpoint do ciclo em foco, se já houve */
  avaliacaoCheckpoint: Avaliacao | null
}

/** Datas só-dia ('AAAA-MM-DD') viram meio-dia local para não escorregar de fuso */
function dataLocal(d: string): string {
  return d.length === 10 ? `${d}T12:00:00` : d
}

function diasAte(data: string | null): number | null {
  if (!data) return null
  const hoje = new Date(`${dataISO(new Date())}T12:00:00`)
  const alvo = new Date(dataLocal(data.slice(0, 10)))
  if (Number.isNaN(alvo.getTime())) return null
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000)
}

// O colar de contas do programa (spec §4): bolinhas jade para sessões feitas,
// a 5ª sempre dourada (o checkpoint é promessa desde o dia 1), delta EVA do
// dia ao toque — cor nunca é o único sinal.
export default function ColarPrograma({ ciclo, sessoesDoCiclo, propostaPendente, avaliacaoCheckpoint }: Props) {
  const [detalhe, setDetalhe] = useState<number | null>(null)

  // Estado "pensando": proposta na mesa, ciclo ainda não nasceu
  if (!ciclo) {
    if (!propostaPendente) return null
    const dias = diasAte(propostaPendente.credito_expira)
    return (
      <section className="card-flat stack">
        <span className="eyebrow">Programa</span>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <span className="pill pill-gold">Pensando na proposta</span>
          {propostaPendente.credito_expira && (
            <p>
              Crédito de R$ 450 vale até <strong>{diaPorExtenso(dataLocal(propostaPendente.credito_expira))}</strong>
              {dias != null && (dias > 0 ? ` — faltam ${dias} ${dias === 1 ? 'dia' : 'dias'}` : dias === 0 ? ' — é hoje' : ' — já venceu')}
            </p>
          )}
        </div>
      </section>
    )
  }

  const total = ciclo.sessoes_total
  const mesAtual = dataISO(new Date()).slice(0, 7)
  const feitas =
    ciclo.programa === 'continuidade'
      ? sessoesDoCiclo.filter((s) => dataISO(s.concluida_em ?? s.iniciada_em).slice(0, 7) === mesAtual).length
      : sessoesDoCiclo.length
  const feitasNoColar = Math.min(feitas, total)
  const concluido = ciclo.status === 'concluido'
  const garantia = ciclo.status === 'garantia_acionada'

  const sessaoDaConta = (i: number): Sessao | null =>
    sessoesDoCiclo.find((s) => s.numero_no_ciclo === i) ??
    (ciclo.programa === 'continuidade' ? null : (sessoesDoCiclo[i - 1] ?? null))

  const textoDaConta = (i: number): string => {
    const s = sessaoDaConta(i)
    if (!s || i > feitasNoColar) return `Sessão ${i} · ainda por vir`
    if (s.eva_pre == null && s.eva_pos == null) return `Sessão ${i} · sem registro de dor`
    const delta = s.eva_pre != null && s.eva_pos != null ? s.eva_pre - s.eva_pos : null
    const fim =
      delta == null
        ? ''
        : delta > 0
          ? ` (caiu ${delta} ${delta === 1 ? 'ponto' : 'pontos'})`
          : delta < 0
            ? ` (subiu ${-delta})`
            : ' (manteve)'
    return `Sessão ${i} · chegou ${s.eva_pre ?? '—'}, saiu ${s.eva_pos ?? '—'}${fim}`
  }

  const linha = concluido
    ? `${total} de ${total} · ${NOME_PROGRAMA[ciclo.programa]} — concluído`
    : garantia
      ? `${NOME_PROGRAMA[ciclo.programa]} — encerrado pela garantia`
      : `Sessão ${Math.min(feitas + 1, total)} de ${total} · ${NOME_PROGRAMA[ciclo.programa]}${
          ciclo.programa === 'continuidade' ? ' (renova a cada mês)' : ''
        }`

  const quedaCk = avaliacaoCheckpoint?.queda_pontos ?? null
  const pctCk = avaliacaoCheckpoint?.queda_pct != null ? Math.round(avaliacaoCheckpoint.queda_pct) : null

  return (
    <section className="card-flat stack">
      <span className="eyebrow">Programa</span>

      <div className="progress-dots" role="list" aria-label={linha} style={{ gap: 2 }}>
        {Array.from({ length: total }, (_, idx) => {
          const i = idx + 1
          const feita = i <= feitasNoColar
          const quinta = i === 5 && total >= 5
          return (
            <button
              key={i}
              type="button"
              role="listitem"
              title={textoDaConta(i)}
              aria-label={textoDaConta(i)}
              onClick={() => setDetalhe(detalhe === i ? null : i)}
              style={{
                width: 44,
                height: 44,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 10,
                background: detalhe === i ? 'var(--sand)' : 'transparent',
              }}
            >
              {quinta ? (
                <span aria-hidden="true" style={{ color: 'var(--gold)', fontSize: 26, lineHeight: 1 }}>
                  {feita ? '★' : '☆'}
                </span>
              ) : (
                <span aria-hidden="true" className="progress-dot" data-done={feita || undefined} />
              )}
            </button>
          )
        })}
      </div>

      {detalhe != null && <p className="small muted">{textoDaConta(detalhe)}</p>}

      <p style={{ fontWeight: 600, fontSize: 20 }}>{linha}</p>

      {avaliacaoCheckpoint &&
        (avaliacaoCheckpoint.criterio_atingido ? (
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <span className="pill pill-gold">★ evolução comprovada{pctCk != null ? `: −${pctCk}%` : ''}</span>
            {quedaCk != null && (
              <span className="small muted">
                5ª: caiu {quedaCk} {quedaCk === 1 ? 'ponto' : 'pontos'}
                {pctCk != null ? ` (${pctCk}%)` : ''} · critério atingido
              </span>
            )}
          </div>
        ) : (
          <p className="small muted">
            Reavaliação feita — queda de {quedaCk ?? 0} {quedaCk === 1 ? 'ponto' : 'pontos'}, abaixo do combinado.
          </p>
        ))}

      {concluido && ciclo.concluido_em && (
        <p className="muted">
          {ciclo.proxima_fase === 'alta'
            ? `Alta em ${diaPorExtenso(ciclo.concluido_em)} — mensagem de acompanhamento um mês depois.`
            : ciclo.proxima_fase === 'manutencao'
              ? `Concluído em ${diaPorExtenso(ciclo.concluido_em)} — seguiu para a manutenção mensal.`
              : `Concluído em ${diaPorExtenso(ciclo.concluido_em)}.`}
        </p>
      )}

      {garantia && (
        <p className="small muted">
          Garantia acionada{ciclo.concluido_em ? ` em ${diaPorExtenso(ciclo.concluido_em)}` : ''}.
        </p>
      )}
    </section>
  )
}
