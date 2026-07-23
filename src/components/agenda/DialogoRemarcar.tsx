// Confirmação da remarcação (spec §1.3): mostra de onde sai e para onde vai,
// por extenso; ao confirmar, o agendamento novo nasce com remarcado_de e o
// antigo guarda a data original. Depois, oferece o WhatsApp de remarcação.

import { useState } from 'react'
import { diaPorExtenso, horaCurta } from '../../lib/datas'
import { montarMensagem } from '../../lib/mensagens'
import { nomeCurto, type Agendamento, type Paciente } from '../../lib/tipos'
import BotaoWhatsApp from '../whatsapp/BotaoWhatsApp'
import { capitalizar, remarcarAgendamento } from './agendaDados'
import Folha from './Folha'

type Props = {
  agendamento: Agendamento
  paciente: Paciente | null
  novoInicio: Date
  /** Chamado assim que a remarcação grava (a folha continua aberta p/ o WhatsApp) */
  aoRemarcou: () => void
  aoFechar: (concluiu: boolean) => void
}

export default function DialogoRemarcar({
  agendamento: ag,
  paciente,
  novoInicio,
  aoRemarcou,
  aoFechar,
}: Props) {
  const [novoId, setNovoId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const nome = paciente ? nomeCurto(paciente) : 'a paciente'
  const concluiu = novoId != null

  async function confirmar() {
    if (salvando || concluiu) return
    setSalvando(true)
    setErro(null)
    const r = await remarcarAgendamento(ag, novoInicio)
    setSalvando(false)
    if ('erro' in r) {
      setErro(r.erro)
      return
    }
    setNovoId(r.novoId)
    aoRemarcou()
  }

  const corpo = paciente
    ? montarMensagem('remarcacao', {
        nome: paciente.nome,
        tratamento: paciente.tratamento,
        dia: novoInicio,
        hora: novoInicio,
      })
    : ''

  return (
    <Folha rotuloAria={`Remarcando a sessão de ${nome}`} aoFechar={() => aoFechar(concluiu)}>
      {!concluiu && (
        <>
          <div>
            <div className="eyebrow">Remarcando</div>
            <h2>A sessão de {nome}</h2>
          </div>
          <div className="card-flat stack" style={{ padding: 18 }}>
            <p className="muted">
              Sai de: {diaPorExtenso(ag.inicio)}, às {horaCurta(ag.inicio)}
            </p>
            <p style={{ fontSize: 21, fontWeight: 600 }}>
              Vai para: {diaPorExtenso(novoInicio)}, às {horaCurta(novoInicio)}
            </p>
          </div>

          {erro && <p style={{ color: 'var(--cinnabar)', fontWeight: 600 }}>{erro}</p>}

          <button
            type="button"
            className="btn btn-primary btn-xl"
            disabled={salvando}
            onClick={() => {
              void confirmar()
            }}
          >
            {salvando ? 'Guardando…' : 'Sim, remarcar'}
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => aoFechar(false)}>
            Voltar — escolher outra vaga
          </button>
        </>
      )}

      {concluiu && (
        <>
          <p style={{ fontSize: 21 }}>
            ✓ Remarcado. {nome}: {capitalizar(diaPorExtenso(novoInicio))}, às {horaCurta(novoInicio)}.
          </p>
          {paciente && (
            <div className="card-flat stack" style={{ padding: 16 }}>
              <p className="small muted" style={{ whiteSpace: 'pre-wrap' }}>
                {corpo}
              </p>
              <BotaoWhatsApp
                pacienteId={paciente.id}
                telefone={paciente.telefone_wa}
                template="remarcacao"
                dados={{
                  nome: paciente.nome,
                  tratamento: paciente.tratamento,
                  dia: novoInicio,
                  hora: novoInicio,
                }}
                refs={{ agendamentoId: novoId }}
                rotulo="Mandar a confirmação"
                className="btn btn-whatsapp btn-block"
              />
            </div>
          )}
          <button type="button" className="btn btn-ghost btn-block" onClick={() => aoFechar(true)}>
            Voltar para a agenda
          </button>
        </>
      )}
    </Folha>
  )
}
