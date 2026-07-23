// A semana como LISTA VERTICAL de dias (spec §1.3) — nunca grade de calendário.
// Só os dias em que a Hilda atende (config.grade), cada um com suas fileiras.

import { diaPorExtenso } from '../../lib/datas'
import type { Agendamento, Paciente } from '../../lib/tipos'
import { capitalizar, type DiaAgenda } from './agendaDados'
import SlotLinha, { type ModoAgenda } from './SlotLinha'

type Props = {
  dias: DiaAgenda[]
  modo: ModoAgenda
  agRemarcandoId: string | null
  rotuloVagaLivre: string
  aoTocarVagaLivre: (dia: DiaAgenda, inicio: Date) => void
  aoTocarAgendamento: (agendamento: Agendamento, paciente: Paciente | null) => void
}

export default function SemanaLista({
  dias,
  modo,
  agRemarcandoId,
  rotuloVagaLivre,
  aoTocarVagaLivre,
  aoTocarAgendamento,
}: Props) {
  return (
    <div className="stack-lg">
      {dias.map((dia) => {
        const livresFuturas = dia.slots.filter((s) => s.estado === 'livre' && !s.passou).length
        return (
          <section key={dia.data}>
            <div className="row-between" style={{ marginBottom: 12 }}>
              <div className="row" style={{ gap: 12 }}>
                <h3>{capitalizar(diaPorExtenso(dia.meioDia))}</h3>
                {dia.ehHoje && <span className="pill pill-jade">hoje</span>}
              </div>
              {livresFuturas > 0 && (
                <span className="small muted mono">
                  {livresFuturas === 1 ? '1 vaga livre' : `${livresFuturas} vagas livres`}
                </span>
              )}
            </div>
            <div className="touch-list" style={{ gap: 10 }}>
              {dia.slots.map((slot) => (
                <SlotLinha
                  key={slot.chave}
                  slot={slot}
                  modo={modo}
                  agRemarcandoId={agRemarcandoId}
                  rotuloVagaLivre={rotuloVagaLivre}
                  aoTocarVagaLivre={(inicio) => aoTocarVagaLivre(dia, inicio)}
                  aoTocarAgendamento={aoTocarAgendamento}
                />
              ))}
              {dia.slots.length === 0 && (
                <p className="small muted" style={{ padding: '4px 20px' }}>
                  Sem horários na grade deste dia.
                </p>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
