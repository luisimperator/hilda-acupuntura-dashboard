// O cartão AGORA (spec §1.1) — o próximo atendimento gigante, com lógica temporal:
// 15 min antes: "Sala pronta?" · na hora: COMEÇAR em 1 toque · 15 min depois: "Não veio?"
// sessão aberta: "⏸ Continuar" · dia encerrado: resumo · dia vazio: aviso + Agenda.
// A recalculada de 60 em 60 segundos vem do Início (tique), que re-renderiza este cartão.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { iniciarSessao } from '../../lib/sessaoService'
import { horaCurta, minutosDesde } from '../../lib/datas'
import { NOME_CONDICAO, NOME_PROGRAMA, nomeCurto } from '../../lib/tipos'
import type { Agendamento, Paciente } from '../../lib/tipos'
import type { Vaga } from '../../lib/mensagens'
import BotaoWhatsApp from '../whatsapp/BotaoWhatsApp'
import Colar from './Colar'
import type { LinhaHoje, SessaoAbertaInfo } from './dadosInicio'

const NOME_PASSO: Record<string, string> = {
  capa: 'a capa',
  eva_pre: 'a dor de chegada',
  destravamento: 'o destravamento',
  pontos: 'os pontos',
  complementos: 'os complementos',
  agulhas: 'as agulhas',
  eva_pos: 'a dor de saída',
  intercorrencia: 'o "correu tudo bem?"',
  orientacao: 'a orientação de casa',
  proxima: 'a próxima sessão',
  termo: 'o termo de consentimento',
  condicao: 'a condição',
  historia: 'a história',
  red_flags: 'as perguntas de segurança',
  cautelas: 'as cautelas',
  mapa: 'o mapa do corpo',
  frases: 'as frases dela',
  frequencia: 'a frequência da dor',
  eva_base: 'a dor de partida',
  reavaliacao: 'a reavaliação',
  proposta: 'a proposta',
  desfecho: 'o desfecho',
  pagamento: 'o pagamento',
  fim: 'o fechamento',
}

function descricaoSessao(l: LinhaHoje): string {
  if (l.agendamento.tipo === 'primeira') {
    return `Primeira Sessão Completa · ${l.agendamento.duracao_min} min`
  }
  if (l.agendamento.tipo === 'retorno_proposta') return 'Retorno da proposta — vaga reservada'
  if (l.ciclo) {
    const n = l.sessoesConcluidas.length + 1
    return `Sessão ${n} de ${l.ciclo.sessoes_total} · ${NOME_PROGRAMA[l.ciclo.programa]} · ${NOME_CONDICAO[l.ciclo.condicao]}`
  }
  if (l.agendamento.tipo === 'manutencao') return 'Sessão de manutenção'
  return 'Sessão avulsa'
}

type Resumo = { atendimentos: number; faltas: number; quedaMedia: number | null }

type Props = {
  proxima: LinhaHoje | null
  sessaoAberta: SessaoAbertaInfo | null
  resumo: Resumo
  temAgendaHoje: boolean
  amanhaQuantas: number
  vagas: Vaga[]
  aoMudar: () => void
}

export default function CartaoAgora({
  proxima,
  sessaoAberta,
  resumo,
  temAgendaHoje,
  amanhaQuantas,
  vagas,
  aoMudar,
}: Props) {
  const navigate = useNavigate()
  const [salaOk, setSalaOk] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [confirmandoFalta, setConfirmandoFalta] = useState(false)
  const [faltaRecem, setFaltaRecem] = useState<{ agendamento: Agendamento; paciente: Paciente } | null>(null)
  const [segundosDesfazer, setSegundosDesfazer] = useState(0)
  const [erroLocal, setErroLocal] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const agendamentoId = proxima?.agendamento.id
  useEffect(() => {
    setSalaOk(false)
    setConfirmandoFalta(false)
    setErroLocal(null)
  }, [agendamentoId])

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current)
    },
    [],
  )

  async function comecar() {
    if (!proxima || iniciando) return
    setIniciando(true)
    setErroLocal(null)
    try {
      const ultima = proxima.sessoesConcluidas.length
        ? proxima.sessoesConcluidas[proxima.sessoesConcluidas.length - 1]
        : null
      const { sessaoId } = await iniciarSessao({
        agendamento: proxima.agendamento,
        paciente: proxima.paciente,
        cicloAtivo: proxima.ciclo,
        ultimaSessaoDoCiclo: ultima,
        sessoesConcluidasNoCiclo: proxima.sessoesConcluidas.length,
      })
      navigate(`/sessao/${sessaoId}`)
    } catch {
      setErroLocal('Não deu para abrir a sessão agora. Toque de novo — se continuar, confira a internet.')
      setIniciando(false)
    }
  }

  async function confirmarFalta() {
    if (!proxima) return
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'faltou' })
        .eq('id', proxima.agendamento.id)
      if (error) throw error
      setConfirmandoFalta(false)
      setFaltaRecem({ agendamento: proxima.agendamento, paciente: proxima.paciente })
      setSegundosDesfazer(10)
      if (timer.current) clearInterval(timer.current)
      timer.current = setInterval(() => {
        setSegundosDesfazer((s) => {
          if (s <= 1) {
            if (timer.current) clearInterval(timer.current)
            return 0
          }
          return s - 1
        })
      }, 1000)
      aoMudar()
    } catch {
      setErroLocal('Não consegui anotar a falta agora. Tente outra vez.')
    }
  }

  async function desfazerFalta() {
    const falta = faltaRecem
    if (!falta) return
    if (timer.current) clearInterval(timer.current)
    setSegundosDesfazer(0)
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'agendada' })
        .eq('id', falta.agendamento.id)
      if (error) throw error
      setFaltaRecem(null)
      aoMudar()
    } catch {
      setErroLocal('Não consegui desfazer agora. Tente outra vez.')
    }
  }

  let conteudo: ReactNode

  if (sessaoAberta) {
    // ---- sessão em andamento (de qualquer paciente): retomar é 1 toque ----
    const { sessao, paciente } = sessaoAberta
    const passo = NOME_PASSO[sessao.passo_atual] ?? 'onde você deixou'
    conteudo = (
      <section className="card" style={{ border: '2px solid var(--jade)' }}>
        <span className="eyebrow">Agora</span>
        <h2 style={{ marginTop: 8 }}>{nomeCurto(paciente)} está em atendimento</h2>
        <p className="muted" style={{ marginTop: 4 }}>
          A sessão ficou aberta — está tudo guardado.
        </p>
        <button
          type="button"
          className="btn btn-primary btn-xl"
          style={{ marginTop: 16 }}
          onClick={() => navigate(`/sessao/${sessao.id}`)}
        >
          ⏸ Continuar atendimento — parou em {passo}
        </button>
        <p style={{ marginTop: 12 }}>
          <Link to={`/paciente/${paciente.id}`}>ver ficha completa ›</Link>
        </p>
      </section>
    )
  } else if (proxima) {
    // ---- próximo atendimento de hoje ----
    const minutos = minutosDesde(proxima.agendamento.inicio)
    const janelaPreparo = minutos >= -15 && minutos < 0
    const atrasado = minutos >= 15
    const numeroHoje = proxima.sessoesConcluidas.length + 1
    const ehPrimeira = proxima.agendamento.tipo === 'primeira'
    const ehQuinta = !ehPrimeira && !!proxima.ciclo && numeroHoje === 5
    const ultimaComEva =
      [...proxima.sessoesConcluidas].reverse().find((s) => s.eva_pre != null && s.eva_pos != null) ?? null
    const rotuloComecar = ehPrimeira
      ? '▶ Começar a Primeira Sessão'
      : ehQuinta
        ? '▶ Começar a Reavaliação ★'
        : '▶ Começar atendimento'

    conteudo = (
      <section className="card" style={{ border: '2px solid var(--jade)' }}>
        <div className="row-between" style={{ flexWrap: 'wrap' }}>
          <span className="eyebrow">Agora</span>
          {ehQuinta && <span className="pill pill-gold">★ hoje é a reavaliação</span>}
          {ehPrimeira && <span className="pill pill-gold">⭑ primeira sessão · 90 min</span>}
        </div>
        <h2 style={{ marginTop: 8 }}>
          {horaCurta(proxima.agendamento.inicio)} · {nomeCurto(proxima.paciente)}
        </h2>
        <p className="muted" style={{ marginTop: 4 }}>
          {descricaoSessao(proxima)}
        </p>
        {proxima.ciclo && (
          <div style={{ marginTop: 12 }}>
            <Colar feitas={proxima.sessoesConcluidas.length} total={proxima.ciclo.sessoes_total} />
          </div>
        )}
        {ultimaComEva && (
          <p className="small muted" style={{ marginTop: 10 }}>
            Última vez: entrou {ultimaComEva.eva_pre} → saiu {ultimaComEva.eva_pos}
          </p>
        )}

        {janelaPreparo && !salaOk && (
          <div
            className="row-between"
            style={{
              marginTop: 14,
              background: 'var(--sand)',
              borderRadius: 'var(--r-sm)',
              padding: '12px 16px',
              flexWrap: 'wrap',
            }}
          >
            <span>
              <strong>Sala pronta?</strong>{' '}
              <span className="muted">Maca aquecida · luz baixa · aroma</span>
            </span>
            <button type="button" className="btn btn-ghost" onClick={() => setSalaOk(true)}>
              Está pronta ✓
            </button>
          </div>
        )}

        {atrasado && !confirmandoFalta && (
          <p className="small muted" style={{ marginTop: 10 }}>
            Marcada para {horaCurta(proxima.agendamento.inicio)} — já se passaram {minutos} minutos.
          </p>
        )}

        {confirmandoFalta ? (
          <div className="stack" style={{ marginTop: 16 }}>
            <p>
              <strong>Marcar que {nomeCurto(proxima.paciente)} faltou hoje?</strong> Isso fica no
              histórico dela.
            </p>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" onClick={() => void confirmarFalta()}>
                Sim, faltou hoje
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmandoFalta(false)}>
                Voltar — ela vem
              </button>
            </div>
          </div>
        ) : (
          <div className="stack" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-primary btn-xl"
              onClick={() => void comecar()}
              disabled={iniciando}
            >
              {iniciando ? 'Abrindo a sessão…' : rotuloComecar}
            </button>
            <div className="row-between" style={{ flexWrap: 'wrap' }}>
              <Link to={`/paciente/${proxima.paciente.id}`}>ver ficha completa ›</Link>
              {atrasado && (
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmandoFalta(true)}>
                  Não veio?
                </button>
              )}
            </div>
          </div>
        )}

        {erroLocal && (
          <p
            className="small"
            style={{
              marginTop: 12,
              background: 'var(--sand)',
              borderRadius: 'var(--r-sm)',
              padding: '10px 14px',
            }}
          >
            {erroLocal}
          </p>
        )}
      </section>
    )
  } else if (temAgendaHoje) {
    // ---- dia encerrado: o resumo ----
    const n = resumo.atendimentos
    let fraseEva = ''
    if (n > 0 && resumo.quedaMedia != null) {
      const valor = Math.abs(resumo.quedaMedia).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
      const unidade = Math.abs(resumo.quedaMedia) === 1 ? 'ponto' : 'pontos'
      fraseEva =
        resumo.quedaMedia > 0
          ? ` · EVA média caiu ${valor} ${unidade}`
          : resumo.quedaMedia === 0
            ? ' · EVA média ficou estável'
            : ` · EVA média subiu ${valor} ${unidade} — dias assim existem`
    }
    conteudo = (
      <section className="card" style={{ border: '2px solid var(--jade)' }}>
        <span className="eyebrow">Agora</span>
        <h2 style={{ marginTop: 8 }}>Dia encerrado ✓</h2>
        <p style={{ marginTop: 8 }}>
          {n === 0 ? (
            'O dia terminou sem atendimentos realizados.'
          ) : (
            <>
              <strong>
                {n} {n === 1 ? 'atendimento' : 'atendimentos'}
              </strong>
              {fraseEva}. Bom trabalho, Hilda.
            </>
          )}
        </p>
        {resumo.faltas > 0 && (
          <p className="small muted" style={{ marginTop: 8 }}>
            {resumo.faltas} {resumo.faltas === 1 ? 'falta' : 'faltas'} — a mensagem de remarcação
            entra na fila de amanhã.
          </p>
        )}
      </section>
    )
  } else {
    // ---- dia vazio ----
    conteudo = (
      <section className="card" style={{ border: '2px solid var(--jade)' }}>
        <span className="eyebrow">Agora</span>
        <h2 style={{ marginTop: 8 }}>Nenhum atendimento hoje</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          {amanhaQuantas > 0
            ? `A agenda de amanhã tem ${amanhaQuantas === 1 ? '1 sessão' : `${amanhaQuantas} sessões`}.`
            : 'Amanhã também está livre por enquanto.'}
        </p>
        <Link to="/agenda" className="btn btn-ghost" style={{ marginTop: 14 }}>
          Ver a agenda
        </Link>
      </section>
    )
  }

  return (
    <>
      {conteudo}

      {faltaRecem && (
        <div className="card-flat" style={{ borderColor: 'var(--gold)', marginTop: 14 }}>
          <p>
            <strong>Falta anotada</strong> — {nomeCurto(faltaRecem.paciente)}. Quer já chamar para
            remarcar?
          </p>
          <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
            <BotaoWhatsApp
              pacienteId={faltaRecem.paciente.id}
              telefone={faltaRecem.paciente.telefone_wa}
              template="falta_reagendar"
              dados={{ nome: faltaRecem.paciente.nome, tratamento: faltaRecem.paciente.tratamento, vagas }}
              refs={{ agendamentoId: faltaRecem.agendamento.id }}
              rotulo="Chamar para remarcar"
            />
            <button type="button" className="btn btn-ghost" onClick={() => setFaltaRecem(null)}>
              Deixar para depois
            </button>
          </div>
        </div>
      )}

      {segundosDesfazer > 0 && faltaRecem && (
        <div className="toast" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span>Falta anotada</span>
          <button
            type="button"
            onClick={() => void desfazerFalta()}
            style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'underline' }}
          >
            Desfazer — ela veio ({segundosDesfazer})
          </button>
        </div>
      )}
    </>
  )
}
