// INÍCIO (spec §1.1) — a mesa de trabalho da Hilda: cartão AGORA no topo,
// PARA AGENDAR (gold), HOJE, MENSAGENS DE HOJE, busca e os atalhos do rodapé.
// O relógio interno re-renderiza a cada 60s para a lógica temporal do AGORA.

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CartaoAgora from '../components/inicio/CartaoAgora'
import ParaAgendar from '../components/inicio/ParaAgendar'
import ListaHoje from '../components/inicio/ListaHoje'
import FilaMensagens from '../components/inicio/FilaMensagens'
import BuscaPaciente from '../components/inicio/BuscaPaciente'
import { carregarInicio, type DadosInicio } from '../components/inicio/dadosInicio'

export default function Inicio() {
  const [dados, setDados] = useState<DadosInicio | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [, setTique] = useState(0)

  const carregar = useCallback(async () => {
    try {
      setErro(null)
      setDados(await carregarInicio())
    } catch {
      setErro('Não consegui carregar o dia agora. Confira a internet e toque em "Tentar de novo".')
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  // A lógica temporal do cartão AGORA recalcula a cada 60 segundos.
  useEffect(() => {
    const t = setInterval(() => setTique((n) => n + 1), 60_000)
    return () => clearInterval(t)
  }, [])

  if (erro) {
    return (
      <div className="empty-state">
        <p>{erro}</p>
        <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => void carregar()}>
          Tentar de novo
        </button>
      </div>
    )
  }

  if (!dados) {
    return (
      <div className="empty-state">
        <p className="muted">Abrindo o seu dia…</p>
      </div>
    )
  }

  const proxima = dados.hoje.find((l) => l.agendamento.status === 'agendada') ?? null
  const realizadas = dados.hoje.filter((l) => l.agendamento.status === 'realizada')
  const quedas = realizadas
    .map((l) => l.sessaoDoDia)
    .filter((s) => s !== null && s.eva_pre != null && s.eva_pos != null)
    .map((s) => (s?.eva_pre ?? 0) - (s?.eva_pos ?? 0))
  const resumo = {
    atendimentos: realizadas.length,
    faltas: dados.hoje.filter((l) => l.agendamento.status === 'faltou').length,
    quedaMedia: quedas.length ? quedas.reduce((a, b) => a + b, 0) / quedas.length : null,
  }
  const naMaca = dados.sessaoAberta !== null

  const cartaoAgora = (
    <CartaoAgora
      proxima={proxima}
      sessaoAberta={dados.sessaoAberta}
      resumo={resumo}
      temAgendaHoje={dados.hoje.length > 0}
      amanhaQuantas={dados.amanhaQuantas}
      vagas={dados.vagas}
      aoMudar={() => void carregar()}
    />
  )

  // A urgência do Fernando nunca compete com a da sala: com paciente na maca,
  // o PARA AGENDAR desce para baixo do AGORA (spec §1.1).
  const paraAgendar = (
    <ParaAgendar
      leads={dados.leads}
      propostas={dados.propostas}
      vagas={dados.vagas}
      creditoCentavos={dados.creditoCentavos}
    />
  )

  return (
    <div className="stack-lg">
      {naMaca ? cartaoAgora : paraAgendar}
      {naMaca ? paraAgendar : cartaoAgora}

      <ListaHoje
        linhas={dados.hoje}
        agoraAgendamentoId={dados.sessaoAberta?.sessao.agendamento_id ?? proxima?.agendamento.id ?? null}
        emAtendimento={naMaca}
      />

      <FilaMensagens mensagens={dados.mensagens} />

      <BuscaPaciente recentes={dados.recentes} />

      <div>
        <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/novo" className="btn btn-ghost">
            + Nova paciente
          </Link>
          <Link to="/agenda" className="btn btn-ghost">
            Ver a agenda
          </Link>
        </div>
        <p className="small" style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/numeros" className="muted">
            números do consultório →
          </Link>
          <span className="muted"> · </span>
          <Link to="/recepcionista" className="muted">
            recepcionista virtual →
          </Link>
        </p>
      </div>
    </div>
  )
}
