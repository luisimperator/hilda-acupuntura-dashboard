// Uma fileira de horário do dia (spec §1.3):
// · vaga livre  → botão pontilhado "+ marcar aqui" (só no futuro)
// · ocupada     → cartão tocável com nome + tipo (NUNCA oferece marcar)
// · continuação → fileira inerte ("ainda a Primeira Sessão de …", 90 min)
// No modo remarcar, as ocupadas ficam esmaecidas e inertes.

import { horaCurta } from '../../lib/datas'
import { nomeCurto, type Agendamento, type Paciente } from '../../lib/tipos'
import { NOME_TIPO_AG, type Slot } from './agendaDados'

export type ModoAgenda = 'normal' | 'marcando' | 'remarcando'

type Props = {
  slot: Slot
  modo: ModoAgenda
  /** id do agendamento sendo remarcado (para apontar "vaga atual") */
  agRemarcandoId: string | null
  rotuloVagaLivre: string
  aoTocarVagaLivre: (inicio: Date) => void
  aoTocarAgendamento: (agendamento: Agendamento, paciente: Paciente | null) => void
}

const LARGURA_HORA = 64

function Hora({ inicio, apagada }: { inicio: Date; apagada?: boolean }) {
  return (
    <span
      className="mono"
      style={{ minWidth: LARGURA_HORA, color: apagada ? 'var(--stone)' : 'var(--ink-60)' }}
    >
      {horaCurta(inicio)}
    </span>
  )
}

export default function SlotLinha({
  slot,
  modo,
  agRemarcandoId,
  rotuloVagaLivre,
  aoTocarVagaLivre,
  aoTocarAgendamento,
}: Props) {
  // ---- vaga livre ----
  if (slot.estado === 'livre') {
    if (slot.passou) {
      return (
        <div className="row" style={{ minHeight: 44, padding: '4px 20px' }}>
          <Hora inicio={slot.inicio} apagada />
          <span className="small" style={{ color: 'var(--stone)' }}>
            livre — já passou
          </span>
        </div>
      )
    }
    return (
      <button
        type="button"
        onClick={() => aoTocarVagaLivre(slot.inicio)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          width: '100%',
          minHeight: 60,
          padding: '12px 20px',
          borderRadius: 'var(--r)',
          border: `2px dashed ${modo === 'remarcando' ? 'var(--jade)' : 'var(--hairline-strong)'}`,
          background: 'transparent',
          color: 'var(--jade)',
          fontWeight: 600,
          fontSize: 18,
          textAlign: 'left',
        }}
      >
        <Hora inicio={slot.inicio} />
        <span>{rotuloVagaLivre}</span>
      </button>
    )
  }

  const { agendamento: ag, paciente } = slot
  const nome = paciente ? nomeCurto(paciente) : 'Paciente'

  // ---- continuação de uma sessão longa (bloqueada por construção) ----
  if (slot.estado === 'continuacao') {
    return (
      <div
        className="row"
        style={{ minHeight: 48, padding: '8px 20px', opacity: modo === 'remarcando' ? 0.35 : 1 }}
      >
        <Hora inicio={slot.inicio} apagada />
        <span className="small muted">⤷ ainda {nome} — sessão de {ag.duracao_min} min</span>
      </div>
    )
  }

  // ---- ocupada ----
  const conteudo = (
    <>
      <Hora inicio={slot.inicio} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <strong>{nome}</strong>
        <span className="small muted" style={{ display: 'block' }}>
          {NOME_TIPO_AG[ag.tipo]}
          {ag.tipo === 'primeira' ? ` · ${ag.duracao_min} min` : ''}
        </span>
      </span>
      <span className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {ag.tipo === 'primeira' && ag.status === 'agendada' && (
          <span className="pill pill-gold">Primeira ⭑</span>
        )}
        {ag.status === 'realizada' && <span className="pill pill-jade">✔ Feita</span>}
        {ag.status === 'faltou' && <span className="pill pill-sand">Faltou</span>}
      </span>
    </>
  )

  if (modo === 'remarcando') {
    const ehAtual = ag.id === agRemarcandoId
    return (
      <div
        className="touch-item"
        style={
          ehAtual
            ? { borderColor: 'var(--jade)', borderWidth: 2, pointerEvents: 'none' }
            : { opacity: 0.35, pointerEvents: 'none' }
        }
        aria-disabled="true"
      >
        {conteudo}
        {ehAtual && <span className="pill pill-jade">vaga atual</span>}
      </div>
    )
  }

  return (
    <button
      type="button"
      className="touch-item"
      onClick={() => aoTocarAgendamento(ag, paciente)}
      aria-label={`${nome}, ${horaCurta(slot.inicio)} — ver opções`}
    >
      {conteudo}
    </button>
  )
}
