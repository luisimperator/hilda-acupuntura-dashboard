// COMEÇAR AGORA — a paciente chegou fora do horário (ou sem horário nenhum).
// A Hilda não devia precisar passar pela agenda para atender quem está na
// frente dela: aqui o agendamento nasce no instante da chegada e a sessão abre
// em seguida, com o mesmo fluxo de sempre.
//
// Se ela já tinha sessão marcada mais para a frente, a folha oferece as duas
// leituras honestas do que está acontecendo: "veio no lugar daquela" (a marcada
// se move para agora e a vaga volta a ficar livre) ou "é uma sessão a mais".

import { useState } from 'react'
import { diaPorExtenso, horaCurta } from '../../lib/datas'
import { iniciarSessao } from '../../lib/sessaoService'
import {
  NOME_CONDICAO,
  NOME_PROGRAMA,
  nomeCurto,
  type Agendamento,
  type Ciclo,
  type Paciente,
  type Sessao,
} from '../../lib/tipos'
import {
  buscarAgendamento,
  criarAgendamentoAgora,
  remarcarAgendamento,
  tipoSugerido,
  type AgTipo,
} from '../agenda/agendaDados'
import Folha from '../agenda/Folha'

type Props = {
  paciente: Paciente
  cicloAtivo: Ciclo | null
  /** Concluídas do ciclo ativo, em ordem */
  sessoesDoCiclo: Sessao[]
  /** Próxima sessão já marcada (depois de agora), se houver */
  marcada: Agendamento | null
  duracaoPrimeiraMin: number
  duracaoCicloMin: number
  aoComecou: (sessaoId: string) => void
  aoFechar: () => void
}

export default function FolhaComecarAgora({
  paciente,
  cicloAtivo,
  sessoesDoCiclo,
  marcada,
  duracaoPrimeiraMin,
  duracaoCicloMin,
  aoComecou,
  aoFechar,
}: Props) {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const nome = nomeCurto(paciente)
  const tipoNovo = tipoSugerido(paciente, cicloAtivo)
  const duracaoDe = (tipo: AgTipo) => (tipo === 'primeira' ? duracaoPrimeiraMin : duracaoCicloMin)

  function descricao(tipo: AgTipo, duracaoMin: number): string {
    if (tipo === 'primeira') return `Primeira Sessão Completa · ${duracaoMin} min`
    if (cicloAtivo) {
      const n = sessoesDoCiclo.length + 1
      return `${n}ª sessão de ${cicloAtivo.sessoes_total} · ${NOME_PROGRAMA[cicloAtivo.programa]} · ${NOME_CONDICAO[cicloAtivo.condicao]}`
    }
    if (tipo === 'manutencao') return `Sessão de manutenção · ${duracaoMin} min`
    return `Sessão avulsa · ${duracaoMin} min`
  }

  /** `mover` = aproveitar a sessão já marcada (ela anda para agora e libera a vaga) */
  async function comecar(mover: boolean) {
    if (ocupado) return
    setOcupado(true)
    setErro(null)
    const agora = new Date()
    agora.setMilliseconds(0)
    try {
      const r =
        mover && marcada
          ? await remarcarAgendamento(marcada, agora)
          : await criarAgendamentoAgora({
              paciente,
              cicloId: tipoNovo === 'ciclo' || tipoNovo === 'manutencao' ? (cicloAtivo?.id ?? null) : null,
              tipo: tipoNovo,
              duracaoMin: duracaoDe(tipoNovo),
            })
      if ('erro' in r) {
        setErro(r.erro)
        setOcupado(false)
        return
      }
      const agendamento = await buscarAgendamento('novoId' in r ? r.novoId : r.id)
      if (!agendamento) throw new Error('agendamento não encontrado')

      const { sessaoId } = await iniciarSessao({
        agendamento,
        paciente,
        cicloAtivo,
        ultimaSessaoDoCiclo: sessoesDoCiclo[sessoesDoCiclo.length - 1] ?? null,
        sessoesConcluidasNoCiclo: sessoesDoCiclo.length,
      })
      aoComecou(sessaoId)
    } catch {
      setErro('Não consegui abrir o atendimento agora. Tente de novo — nada se perdeu.')
      setOcupado(false)
    }
  }

  return (
    <Folha rotuloAria={`Começar agora o atendimento de ${nome}`} aoFechar={aoFechar}>
      <div>
        <div className="eyebrow">Fora do horário</div>
        <h2>Começar agora com {nome}?</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          São {horaCurta(new Date())} — o atendimento fica registrado neste horário.
        </p>
      </div>

      <div className="card-flat" style={{ padding: 16 }}>
        <p style={{ fontSize: 19 }}>
          {descricao(marcada ? marcada.tipo : tipoNovo, marcada ? marcada.duracao_min : duracaoDe(tipoNovo))}
        </p>
      </div>

      {erro && <p style={{ color: 'var(--cinnabar)', fontWeight: 600 }}>{erro}</p>}

      {marcada ? (
        <>
          <p className="muted">
            {nome} tem sessão marcada para {diaPorExtenso(marcada.inicio)}, às {horaCurta(marcada.inicio)}.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-xl"
            disabled={ocupado}
            onClick={() => {
              void comecar(true)
            }}
          >
            {ocupado ? 'Abrindo…' : 'Ela veio no lugar daquela — começar'}
          </button>
          <p className="small muted">A vaga marcada volta a ficar livre na agenda.</p>
          <button
            type="button"
            className="btn btn-ghost btn-block"
            disabled={ocupado}
            onClick={() => {
              void comecar(false)
            }}
          >
            É uma sessão a mais — a marcada continua de pé
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn btn-primary btn-xl"
          disabled={ocupado}
          onClick={() => {
            void comecar(false)
          }}
        >
          {ocupado ? 'Abrindo…' : 'Sim, começar agora'}
        </button>
      )}

      <button type="button" className="btn btn-ghost btn-block" disabled={ocupado} onClick={aoFechar}>
        Voltar
      </button>
    </Folha>
  )
}
