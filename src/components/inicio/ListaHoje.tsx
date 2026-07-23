// HOJE (spec §1.1) — os agendamentos do dia em ordem, com estado visual:
// ✔ concluída (com "6 → 3"), ▶ é o cartão AGORA, ○ futura, ✕ faltou.
// PRIMEIRA SESSÃO e 5ª ★ marcadas em gold. Cor nunca é o único sinal: palavra junto.

import { Link } from 'react-router-dom'
import { horaCurta } from '../../lib/datas'
import { NOME_PROGRAMA, nomeCurto } from '../../lib/tipos'
import type { LinhaHoje } from './dadosInicio'

type Props = {
  linhas: LinhaHoje[]
  agoraAgendamentoId: string | null
  emAtendimento: boolean
}

export default function ListaHoje({ linhas, agoraAgendamentoId, emAtendimento }: Props) {
  if (linhas.length === 0) return null

  return (
    <section>
      <div className="eyebrow" style={{ marginBottom: 12 }}>
        Hoje
      </div>
      <div className="touch-list">
        {linhas.map((l) => {
          const st = l.agendamento.status
          const ehAgora = st === 'agendada' && l.agendamento.id === agoraAgendamentoId
          const nExib =
            l.sessaoDoDia?.numero_no_ciclo ??
            l.sessoesConcluidas.length + (st === 'realizada' ? 0 : 1)
          const ehPrimeira = l.agendamento.tipo === 'primeira'
          const ehQuinta = !ehPrimeira && !!l.ciclo && nExib === 5
          const marcador = st === 'realizada' ? '✔' : st === 'faltou' ? '✕' : ehAgora ? '▶' : '○'
          const corMarcador =
            st === 'realizada' || ehAgora ? 'var(--jade)' : 'var(--ink-60)'
          const delta =
            l.sessaoDoDia && l.sessaoDoDia.eva_pre != null && l.sessaoDoDia.eva_pos != null
              ? `${l.sessaoDoDia.eva_pre} → ${l.sessaoDoDia.eva_pos}`
              : null

          let subtitulo: string
          if (ehPrimeira) subtitulo = `Primeira Sessão Completa · ${l.agendamento.duracao_min} min`
          else if (l.ciclo)
            subtitulo = `Sessão ${nExib} de ${l.ciclo.sessoes_total} · ${NOME_PROGRAMA[l.ciclo.programa]}`
          else if (l.agendamento.tipo === 'manutencao') subtitulo = 'Sessão de manutenção'
          else if (l.agendamento.tipo === 'retorno_proposta') subtitulo = 'Retorno da proposta'
          else subtitulo = 'Sessão avulsa'

          return (
            <Link key={l.agendamento.id} to={`/paciente/${l.paciente.id}`} className="touch-item">
              <span
                aria-hidden="true"
                style={{ fontSize: 22, width: 26, textAlign: 'center', color: corMarcador }}
              >
                {marcador}
              </span>
              <span className="mono" style={{ minWidth: 60 }}>
                {horaCurta(l.agendamento.inicio)}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong>{nomeCurto(l.paciente)}</strong>
                <span className="small muted" style={{ display: 'block' }}>
                  {subtitulo}
                </span>
              </span>
              <span className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {ehPrimeira && st === 'agendada' && (
                  <span className="pill pill-gold">PRIMEIRA SESSÃO ⭑</span>
                )}
                {ehQuinta && st === 'agendada' && (
                  <span className="pill pill-gold">5ª — Reavaliação ★</span>
                )}
                {st === 'realizada' && (
                  <span className="pill pill-jade">{delta ? `${delta} · ` : ''}Concluída</span>
                )}
                {st === 'faltou' && <span className="pill pill-sand">Faltou</span>}
                {ehAgora && (
                  <span className="pill pill-jade">{emAtendimento ? 'Em atendimento' : 'AGORA'}</span>
                )}
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
