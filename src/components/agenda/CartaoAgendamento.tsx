// Tocar num agendamento → cartão com [VER PACIENTE] [REMARCAR] [FALTOU]
// (+ Cancelar atrás de "mais…"). FALTOU pede confirmação por extenso e depois
// oferece o WhatsApp "Senti sua falta" com 2 vagas livres reais (spec §1.3/§6.3).

import { useState } from 'react'
import { diaPorExtenso, ehHoje, horaCurta } from '../../lib/datas'
import { montarMensagem, type Vaga } from '../../lib/mensagens'
import { proximasVagasLivres } from '../../lib/sessaoService'
import { nomeCurto, type Agendamento, type Paciente } from '../../lib/tipos'
import BotaoWhatsApp from '../whatsapp/BotaoWhatsApp'
import { cancelarAgendamento, capitalizar, marcarFalta, NOME_TIPO_AG } from './agendaDados'
import Folha from './Folha'

type Props = {
  agendamento: Agendamento
  paciente: Paciente | null
  aoVerPaciente: () => void
  aoRemarcar: () => void
  /** Recarrega a semana atrás da folha (a folha continua aberta) */
  recarregar: () => void
  avisar: (mensagem: string) => void
  aoFechar: () => void
}

type Modo = 'menu' | 'confirma_falta' | 'falta_anotada' | 'confirma_cancelar'

export default function CartaoAgendamento({
  agendamento: ag,
  paciente,
  aoVerPaciente,
  aoRemarcar,
  recarregar,
  avisar,
  aoFechar,
}: Props) {
  const [modo, setModo] = useState<Modo>('menu')
  const [maisAberto, setMaisAberto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [vagas, setVagas] = useState<Vaga[]>([])

  const nome = paciente ? nomeCurto(paciente) : 'a paciente'
  const quando = `${capitalizar(diaPorExtenso(ag.inicio))}, às ${horaCurta(ag.inicio)}`
  const quandoFaltou = ehHoje(ag.inicio) ? 'hoje' : `na ${diaPorExtenso(ag.inicio)}`
  const jaComecou = new Date(ag.inicio).getTime() <= Date.now()
  const agendada = ag.status === 'agendada'

  async function confirmarFalta() {
    if (ocupado) return
    setOcupado(true)
    setErro(null)
    const falha = await marcarFalta(ag.id)
    if (falha) {
      setErro(falha)
      setOcupado(false)
      return
    }
    const livres = await proximasVagasLivres(2).catch(() => [] as Vaga[])
    setVagas(livres)
    setModo('falta_anotada')
    setOcupado(false)
    recarregar()
  }

  async function confirmarCancelamento() {
    if (ocupado) return
    setOcupado(true)
    setErro(null)
    const falha = await cancelarAgendamento(ag.id)
    setOcupado(false)
    if (falha) {
      setErro(falha)
      return
    }
    recarregar()
    avisar('Sessão cancelada — a vaga voltou a ficar livre.')
    aoFechar()
  }

  const corpoFalta = paciente
    ? montarMensagem('falta_reagendar', { nome: paciente.nome, tratamento: paciente.tratamento, vagas })
    : ''

  return (
    <Folha rotuloAria={`Sessão de ${nome}`} aoFechar={aoFechar}>
      <div>
        <div className="eyebrow">{NOME_TIPO_AG[ag.tipo]}</div>
        <h2>{nome}</h2>
        <p className="muted">{quando}</p>
        <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {ag.status === 'realizada' && <span className="pill pill-jade">✔ Feita</span>}
          {ag.status === 'faltou' && <span className="pill pill-sand">Faltou</span>}
          {ag.remarcado_de && <span className="pill pill-sand">remarcada</span>}
        </div>
        {ag.observacao && <p className="small muted" style={{ marginTop: 8 }}>{ag.observacao}</p>}
      </div>

      {erro && <p style={{ color: 'var(--cinnabar)', fontWeight: 600 }}>{erro}</p>}

      {modo === 'menu' && (
        <>
          <button type="button" className="btn btn-primary btn-xl" onClick={aoVerPaciente}>
            Ver paciente →
          </button>
          {agendada && (
            <div className="row" style={{ gap: 12 }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={aoRemarcar}>
                Remarcar
              </button>
              {jaComecou && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ flex: 1 }}
                  onClick={() => setModo('confirma_falta')}
                >
                  Faltou
                </button>
              )}
            </div>
          )}
          {agendada && !maisAberto && (
            <button
              type="button"
              className="small"
              style={{ color: 'var(--ink-60)', textDecoration: 'underline', minHeight: 44 }}
              onClick={() => setMaisAberto(true)}
            >
              mais…
            </button>
          )}
          {agendada && maisAberto && (
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => setModo('confirma_cancelar')}
            >
              Cancelar esta sessão
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-block" onClick={aoFechar}>
            Voltar para a agenda
          </button>
        </>
      )}

      {modo === 'confirma_falta' && (
        <>
          <p style={{ fontSize: 21 }}>
            Marcar que {nome} faltou {quandoFaltou}? Isso fica no histórico dela.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-xl"
            disabled={ocupado}
            onClick={() => {
              void confirmarFalta()
            }}
          >
            {ocupado ? 'Guardando…' : 'Sim, faltou'}
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setModo('menu')}>
            Voltar
          </button>
        </>
      )}

      {modo === 'falta_anotada' && paciente && (
        <>
          <p style={{ fontSize: 21 }}>✓ Falta anotada no histórico.</p>
          <p className="muted">
            Quer já perguntar como {nome} está, com dois horários livres na mensagem?
          </p>
          <div className="card-flat stack" style={{ padding: 16 }}>
            <p className="small muted" style={{ whiteSpace: 'pre-wrap' }}>
              {corpoFalta}
            </p>
            <BotaoWhatsApp
              pacienteId={paciente.id}
              telefone={paciente.telefone_wa}
              template="falta_reagendar"
              dados={{ nome: paciente.nome, tratamento: paciente.tratamento, vagas }}
              refs={{ agendamentoId: ag.id }}
              rotulo="Mandar “Senti sua falta”"
              className="btn btn-whatsapp btn-block"
            />
          </div>
          <button type="button" className="btn btn-ghost btn-block" onClick={aoFechar}>
            Agora não — voltar para a agenda
          </button>
        </>
      )}

      {modo === 'confirma_cancelar' && (
        <>
          <p style={{ fontSize: 21 }}>
            Cancelar a sessão de {nome} de {diaPorExtenso(ag.inicio)}, às {horaCurta(ag.inicio)}? A
            vaga volta a ficar livre, e o cancelamento fica no histórico.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-xl"
            disabled={ocupado}
            onClick={() => {
              void confirmarCancelamento()
            }}
          >
            {ocupado ? 'Guardando…' : 'Sim, cancelar a sessão'}
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setModo('menu')}>
            Voltar
          </button>
        </>
      )}
    </Folha>
  )
}
