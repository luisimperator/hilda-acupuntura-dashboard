// Remarcação (spec §1.3) em uma folha só, em dois passos honestos:
//
// 1. PARA QUANDO — as próximas vagas realmente livres, uma por botão. Quem já
//    escolheu a vaga na agenda (`novoInicio`) entra direto no passo 2.
// 2. CONFIRMAR — de onde sai e para onde vai, por extenso. Ao confirmar, o
//    agendamento novo nasce com remarcado_de e o antigo guarda a data original.
//
// Depois, oferece o WhatsApp de remarcação.

import { useEffect, useState } from 'react'
import { diaPorExtenso, horaCurta } from '../../lib/datas'
import { montarMensagem, type Vaga } from '../../lib/mensagens'
import { proximasVagasLivres } from '../../lib/sessaoService'
import { nomeCurto, type Agendamento, type Paciente } from '../../lib/tipos'
import BotaoWhatsApp from '../whatsapp/BotaoWhatsApp'
import { capitalizar, remarcarAgendamento } from './agendaDados'
import Folha from './Folha'

type Props = {
  agendamento: Agendamento
  paciente: Paciente | null
  /** Vaga já escolhida. `null` = a folha oferece as próximas vagas livres. */
  novoInicio: Date | null
  /** Chamado assim que a remarcação grava (a folha continua aberta p/ o WhatsApp) */
  aoRemarcou: () => void
  aoFechar: (concluiu: boolean) => void
  /** Escape hatch do passo 1: procurar a vaga na agenda da semana */
  aoEscolherNaAgenda?: () => void
}

export default function DialogoRemarcar({
  agendamento: ag,
  paciente,
  novoInicio,
  aoRemarcou,
  aoFechar,
  aoEscolherNaAgenda,
}: Props) {
  const [escolhida, setEscolhida] = useState<Date | null>(novoInicio)
  const [vagas, setVagas] = useState<Vaga[] | null>(null)
  const [novoId, setNovoId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const nome = paciente ? nomeCurto(paciente) : 'a paciente'
  const concluiu = novoId != null
  // Só volta para a lista quem chegou por ela; quem escolheu na agenda volta para a agenda.
  const escolhePorAqui = novoInicio == null

  useEffect(() => {
    if (novoInicio) setEscolhida(novoInicio)
  }, [novoInicio])

  useEffect(() => {
    if (!escolhePorAqui || vagas != null) return
    let vivo = true
    proximasVagasLivres(4, { duracaoMin: ag.duracao_min, ignorarAgendamentoId: ag.id })
      .then((v) => vivo && setVagas(v))
      .catch(() => vivo && setVagas([]))
    return () => {
      vivo = false
    }
  }, [escolhePorAqui, vagas, ag.duracao_min, ag.id])

  async function confirmar() {
    if (salvando || concluiu || !escolhida) return
    setSalvando(true)
    setErro(null)
    const r = await remarcarAgendamento(ag, escolhida)
    setSalvando(false)
    if ('erro' in r) {
      setErro(r.erro)
      // A vaga pode ter sido tomada enquanto ela decidia — recarrega a lista.
      if (escolhePorAqui) {
        setVagas(null)
        setEscolhida(null)
      }
      return
    }
    setNovoId(r.novoId)
    aoRemarcou()
  }

  const corpo =
    paciente && escolhida
      ? montarMensagem('remarcacao', {
          nome: paciente.nome,
          tratamento: paciente.tratamento,
          dia: escolhida,
          hora: escolhida,
        })
      : ''

  return (
    <Folha rotuloAria={`Remarcando a sessão de ${nome}`} aoFechar={() => aoFechar(concluiu)}>
      {!concluiu && (
        <div>
          <div className="eyebrow">Remarcando</div>
          <h2>A sessão de {nome}</h2>
          <p className="muted" style={{ marginTop: 4 }}>
            Sai de: {diaPorExtenso(ag.inicio)}, às {horaCurta(ag.inicio)}
          </p>
        </div>
      )}

      {erro && <p style={{ color: 'var(--cinnabar)', fontWeight: 600 }}>{erro}</p>}

      {/* ---------- passo 1: para quando ---------- */}
      {!concluiu && !escolhida && (
        <>
          <p style={{ fontSize: 21 }}>Para quando?</p>

          {vagas == null && <p className="muted">Procurando as próximas vagas livres…</p>}

          {vagas?.length === 0 && (
            <p className="muted">
              Não achei vaga livre para {ag.duracao_min} min nos próximos 21 dias.
            </p>
          )}

          {vagas?.map((v) => {
            const quando = new Date(v.inicio)
            return (
              <button
                key={quando.toISOString()}
                type="button"
                className="btn btn-ghost btn-block"
                style={{ minHeight: 60, fontSize: 19 }}
                onClick={() => setEscolhida(quando)}
              >
                {capitalizar(diaPorExtenso(quando))}, às {horaCurta(quando)}
              </button>
            )
          })}

          {aoEscolherNaAgenda && (
            <button
              type="button"
              className="small"
              style={{ color: 'var(--jade)', textDecoration: 'underline', minHeight: 44 }}
              onClick={aoEscolherNaAgenda}
            >
              escolher outra vaga na agenda
            </button>
          )}

          <button type="button" className="btn btn-ghost btn-block" onClick={() => aoFechar(false)}>
            Voltar sem remarcar
          </button>
        </>
      )}

      {/* ---------- passo 2: confirmar ---------- */}
      {!concluiu && escolhida && (
        <>
          <div className="card-flat stack" style={{ padding: 18 }}>
            <p style={{ fontSize: 21, fontWeight: 600 }}>
              Vai para: {diaPorExtenso(escolhida)}, às {horaCurta(escolhida)}
            </p>
          </div>

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
          <button
            type="button"
            className="btn btn-ghost btn-block"
            disabled={salvando}
            onClick={() => (escolhePorAqui ? setEscolhida(null) : aoFechar(false))}
          >
            Voltar — escolher outra vaga
          </button>
        </>
      )}

      {/* ---------- pronto ---------- */}
      {concluiu && escolhida && (
        <>
          <p style={{ fontSize: 21 }}>
            ✓ Remarcado. {nome}: {capitalizar(diaPorExtenso(escolhida))}, às {horaCurta(escolhida)}.
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
                  dia: escolhida,
                  hora: escolhida,
                }}
                refs={{ agendamentoId: novoId }}
                rotulo="Mandar a confirmação"
                className="btn btn-whatsapp btn-block"
              />
            </div>
          )}
          <button type="button" className="btn btn-ghost btn-block" onClick={() => aoFechar(true)}>
            Pronto
          </button>
        </>
      )}
    </Folha>
  )
}
