import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ehHoje } from '../lib/datas'
import { calcularBotaoEstado, type AcaoBotao } from '../lib/estadoBotao'
import { iniciarSessao, proximasVagasLivres } from '../lib/sessaoService'
import type { DadosMensagem, Vaga } from '../lib/mensagens'
import {
  nomeCurto,
  type Agendamento,
  type Avaliacao,
  type Ciclo,
  type Config,
  type MensagemHoje,
  type Paciente,
  type Proposta,
  type Sessao,
  type WaTemplate,
} from '../lib/tipos'
import EvaChart, { type PontoEva } from '../components/EvaChart'
import CabecalhoPaciente from '../components/ficha/CabecalhoPaciente'
import ColarPrograma from '../components/ficha/ColarPrograma'
import PropostaAberta from '../components/ficha/PropostaAberta'
import HistoriaFeed from '../components/ficha/HistoriaFeed'
import FolhaWhatsApp, { type OpcaoMensagem } from '../components/ficha/FolhaWhatsApp'
import RelatorioImpressao from '../components/ficha/RelatorioImpressao'

const SOBREPOSICAO: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 200,
  background: 'rgba(31, 27, 22, 0.45)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
}

const FOLHA: CSSProperties = {
  width: '100%',
  maxWidth: 680,
  maxHeight: '88dvh',
  overflowY: 'auto',
  borderRadius: '22px 22px 0 0',
}

// FICHA DO PACIENTE (spec §1.2 e §4) — o coração do app.
// Cabeçalho vivo, curva da dor, colar do programa, história em frases e o
// botão-estado fixo que sabe o próximo passo certo.
export default function Ficha() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [ciclos, setCiclos] = useState<Ciclo[]>([])
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [mensagensHoje, setMensagensHoje] = useState<MensagemHoje[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [ocupado, setOcupado] = useState(false)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const [folhaAberta, setFolhaAberta] = useState(false)
  const [dialogoFase, setDialogoFase] = useState(false)
  const [vagas, setVagas] = useState<Vaga[] | null>(null)

  const carregar = useCallback(async () => {
    if (!id) {
      setErro('Não encontrei esta paciente. Volte ao Início e busque de novo.')
      setCarregando(false)
      return
    }
    setErro(null)
    try {
      const [pac, cic, ses, age, pro, ava, msg, cfg] = await Promise.all([
        supabase.from('pacientes').select('*').eq('id', id).maybeSingle(),
        supabase.from('ciclos').select('*').eq('paciente_id', id).order('criado_em', { ascending: false }),
        supabase.from('sessoes').select('*').eq('paciente_id', id).order('iniciada_em', { ascending: true }),
        supabase.from('agendamentos').select('*').eq('paciente_id', id).order('inicio', { ascending: true }),
        supabase.from('propostas').select('*').eq('paciente_id', id).order('criado_em', { ascending: false }),
        supabase.from('avaliacoes').select('*').eq('paciente_id', id).order('criado_em', { ascending: true }),
        supabase.from('v_mensagens_hoje').select('*').eq('paciente_id', id),
        supabase.from('config').select('*').limit(1).maybeSingle(),
      ])
      if (pac.error) throw pac.error
      if (!pac.data) {
        setErro('Não encontrei esta paciente. Volte ao Início e busque de novo.')
        return
      }
      setPaciente(pac.data)
      setCiclos(cic.data ?? [])
      setSessoes(ses.data ?? [])
      setAgendamentos(age.data ?? [])
      setPropostas(pro.data ?? [])
      setAvaliacoes(ava.data ?? [])
      setMensagensHoje(msg.data ?? [])
      setConfig(cfg.data ?? null)
    } catch {
      setErro('Não consegui abrir a ficha agora. Confira a internet e tente de novo.')
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  if (carregando) {
    return (
      <div className="empty-state">
        <p className="muted">Abrindo a ficha…</p>
      </div>
    )
  }

  if (erro || !paciente) {
    return (
      <div className="empty-state stack">
        <p>{erro ?? 'Não encontrei esta paciente.'}</p>
        <div>
          <button type="button" className="btn btn-ghost" onClick={() => void carregar()}>
            Tentar de novo
          </button>
        </div>
      </div>
    )
  }

  // ---------- derivados ----------
  const cicloAtivo = ciclos.find((c) => c.status === 'ativo') ?? null
  const cicloRef = cicloAtivo ?? ciclos[0] ?? null
  const sessoesConcluidas = sessoes.filter((s) => s.status === 'concluida')
  const sessoesDoCicloAtivo = cicloAtivo ? sessoesConcluidas.filter((s) => s.ciclo_id === cicloAtivo.id) : []
  const sessoesDoCicloRef = cicloRef ? sessoesConcluidas.filter((s) => s.ciclo_id === cicloRef.id) : []
  const sessaoAberta = sessoes.find((s) => s.status === 'em_andamento') ?? null
  const agendamentoHoje = agendamentos.find((a) => a.status === 'agendada' && ehHoje(a.inicio)) ?? null
  const propostaPendente = propostas.find((p) => p.resultado === 'pendente') ?? null
  const checkpointAtivo = cicloAtivo
    ? (avaliacoes.find((a) => a.tipo === 'checkpoint' && a.ciclo_id === cicloAtivo.id) ?? null)
    : null
  const checkpointRef = cicloRef
    ? (avaliacoes.find((a) => a.tipo === 'checkpoint' && a.ciclo_id === cicloRef.id) ?? null)
    : null
  const inicialRef = cicloRef
    ? (avaliacoes.find((a) => a.tipo === 'inicial' && a.ciclo_id === cicloRef.id) ?? null)
    : ([...avaliacoes].reverse().find((a) => a.tipo === 'inicial') ?? null)
  const primeiraConcluidaHoje =
    sessoes.find(
      (s) => s.tipo === 'primeira' && s.status === 'concluida' && s.concluida_em != null && ehHoje(s.concluida_em),
    ) ?? null
  const temPropostaDaPrimeira = primeiraConcluidaHoje
    ? propostas.some((p) => p.sessao_id === primeiraConcluidaHoje.id)
    : false

  const estado = calcularBotaoEstado({
    paciente,
    cicloAtivo,
    sessoesDoCiclo: sessoesDoCicloAtivo,
    sessaoAberta,
    agendamentoHoje,
    propostaPendente,
    avaliacaoCheckpoint: checkpointAtivo,
    primeiraConcluidaHoje,
    temPropostaDaPrimeira,
    mensagemDevida: mensagensHoje[0] ?? null,
    temAgendamentoFuturo: agendamentos.some(
      (a) => a.status === 'agendada' && !ehHoje(a.inicio) && new Date(a.inicio).getTime() > Date.now(),
    ),
  })

  // A curva da dor: sessões concluídas, ponto por sessão (spec §1.2)
  const curvaPontos: PontoEva[] = sessoesConcluidas
    .filter((s) => s.eva_pre != null || s.eva_pos != null)
    .map((s, i) => ({ sessao: s.numero_no_ciclo ?? i, pre: s.eva_pre, pos: s.eva_pos }))
  const primeiroPre = sessoesConcluidas.find((s) => s.eva_pre != null)?.eva_pre ?? null
  const comecouEm = inicialRef?.eva ?? primeiroPre
  const ultimaComEva = [...sessoesConcluidas].reverse().find((s) => s.eva_pos != null || s.eva_pre != null) ?? null
  const hojeEm = ultimaComEva ? (ultimaComEva.eva_pos ?? ultimaComEva.eva_pre) : null
  const metaGarantia = comecouEm != null ? Math.max(comecouEm - 2, Math.floor(comecouEm * 0.7)) : null

  // ---------- ações ----------
  async function abrirFolha() {
    setFolhaAberta(true)
    if (vagas == null) {
      try {
        setVagas(await proximasVagasLivres(2))
      } catch {
        setVagas([])
      }
    }
  }

  async function imprimir(avaliacaoId: string) {
    window.print()
    const { error } = await supabase
      .from('avaliacoes')
      .update({ relatorio_impresso_em: new Date().toISOString() })
      .eq('id', avaliacaoId)
    if (error) {
      setErroAcao('O relatório abriu para impressão, mas não consegui registrar a entrega. Toque o botão de novo.')
    } else {
      await carregar()
    }
  }

  async function decidirFase(fase: 'manutencao' | 'alta' | 'novo_ciclo') {
    if (!paciente || !cicloAtivo) return
    setOcupado(true)
    const agoraISO = new Date().toISOString()
    try {
      const fim = await supabase
        .from('ciclos')
        .update({
          status: 'concluido',
          concluido_em: agoraISO,
          proxima_fase: fase === 'manutencao' ? 'manutencao' : fase === 'alta' ? 'alta' : 'concluir_ciclo',
        })
        .eq('id', cicloAtivo.id)
      if (fim.error) throw fim.error

      if (fase === 'manutencao') {
        const novo = await supabase.from('ciclos').insert({
          paciente_id: paciente.id,
          programa: 'continuidade',
          condicao: cicloAtivo.condicao,
          preco_centavos: config?.preco_continuidade_centavos ?? 128000,
          credito_centavos: 0,
          sessoes_total: 4,
          status: 'ativo',
          iniciado_em: agoraISO,
        })
        if (novo.error) throw novo.error
        await supabase.from('pacientes').update({ status: 'manutencao' }).eq('id', paciente.id)
      } else if (fase === 'alta') {
        // O follow-up de 30 dias entra sozinho na fila de mensagens (view v_mensagens_hoje)
        await supabase.from('pacientes').update({ status: 'alta' }).eq('id', paciente.id)
      } else {
        const novo = await supabase.from('ciclos').insert({
          paciente_id: paciente.id,
          programa: 'reset_10',
          condicao: cicloAtivo.condicao,
          preco_centavos: config?.preco_reset_centavos ?? 340000,
          credito_centavos: 0,
          sessoes_total: 10,
          status: 'ativo',
          iniciado_em: agoraISO,
        })
        if (novo.error) throw novo.error
        await supabase.from('pacientes').update({ status: 'em_programa' }).eq('id', paciente.id)
      }
      setDialogoFase(false)
      await carregar()
    } catch {
      setErroAcao('Não consegui guardar a decisão agora. Tente de novo em instantes.')
    } finally {
      setOcupado(false)
    }
  }

  async function executar(acao: AcaoBotao) {
    switch (acao.tipo) {
      case 'continuar_sessao':
        navigate(`/sessao/${acao.sessaoId}`)
        break
      case 'comecar_sessao': {
        if (!paciente || !agendamentoHoje) return
        setOcupado(true)
        try {
          const ultima = sessoesDoCicloAtivo[sessoesDoCicloAtivo.length - 1] ?? null
          const { sessaoId } = await iniciarSessao({
            agendamento: agendamentoHoje,
            paciente,
            cicloAtivo,
            ultimaSessaoDoCiclo: ultima,
            sessoesConcluidasNoCiclo: sessoesDoCicloAtivo.length,
          })
          navigate(`/sessao/${sessaoId}`)
        } catch {
          setErroAcao('Não consegui começar a sessão agora. Tente de novo — nada se perdeu.')
        } finally {
          setOcupado(false)
        }
        break
      }
      case 'registrar_proposta':
        // O registro da proposta é o desfecho do fluxo da Primeira Sessão
        navigate(`/sessao/${acao.sessaoId}`)
        break
      case 'mandar_mensagem':
      case 'responder_lead':
      case 'retorno_proposta':
        void abrirFolha()
        break
      case 'marcar_proxima':
      case 'marcar_sessao':
        navigate('/agenda')
        break
      case 'decidir_fase':
        setDialogoFase(true)
        break
      case 'imprimir_relatorio':
        void imprimir(acao.avaliacaoId)
        break
    }
  }

  // ---------- folha de WhatsApp: templates aplicáveis ao estado ----------
  function montarOpcoes(): OpcaoMensagem[] {
    if (!paciente) return []
    const proximo =
      agendamentos.find((a) => a.status === 'agendada' && new Date(a.inicio).getTime() > Date.now() - 60 * 60000) ??
      null
    const ultimaEva = [...sessoesConcluidas].reverse().find((s) => s.eva_pre != null || s.eva_pos != null) ?? null
    const decisor =
      propostaPendente?.objecao === 'decisor' && paciente.decisor !== 'sozinha' && paciente.decisor !== 'nao_perguntado'
        ? 'a família'
        : null
    const base: DadosMensagem = {
      nome: paciente.nome,
      tratamento: paciente.tratamento,
      nota: paciente.eva_landing,
      hora: proximo?.inicio ?? null,
      dia: proximo?.inicio ?? null,
      endereco: config?.endereco ?? null,
      objetivo: paciente.objetivo_frase,
      evaPre: ultimaEva?.eva_pre ?? null,
      evaPos: ultimaEva?.eva_pos ?? null,
      evaBase: inicialRef?.eva ?? null,
      dataCredito: propostaPendente?.credito_expira
        ? `${propostaPendente.credito_expira.slice(0, 10)}T12:00:00`
        : null,
      decisor,
      vagas: vagas ?? [],
    }

    const ops: OpcaoMensagem[] = []
    const inclui = (template: WaTemplate, dados: DadosMensagem, refs?: OpcaoMensagem['refs']) => {
      if (!ops.some((o) => o.template === template)) ops.push({ template, dados, refs })
    }

    for (const m of mensagensHoje) {
      if (!m.template || m.template === 'livre') continue
      const ag = m.agendamento_id ? (agendamentos.find((a) => a.id === m.agendamento_id) ?? null) : null
      inclui(m.template, ag ? { ...base, hora: ag.inicio, dia: ag.inicio } : base, {
        agendamentoId: m.agendamento_id,
        sessaoId: m.sessao_id,
        cicloId: m.ciclo_id,
        propostaId: m.proposta_id,
      })
    }
    if (paciente.status === 'lead') inclui('resposta_lead', base)
    if (propostaPendente) inclui('retorno_48h', base, { propostaId: propostaPendente.id })
    inclui('livre', base)
    return ops
  }

  const rotuloBotao = `${estado.rotulo} →`

  return (
    <>
      <div className="ficha-conteudo stack-lg" style={{ paddingBottom: 120 }}>
        <CabecalhoPaciente
          paciente={paciente}
          aoAtualizarObjetivo={(frase) => setPaciente((p) => (p ? { ...p, objetivo_frase: frase || null } : p))}
        />

        {curvaPontos.length > 0 && (
          <section className="card stack">
            <span className="eyebrow">A curva da dor</span>
            <div className="row-between" style={{ flexWrap: 'wrap', gap: 10 }}>
              {comecouEm != null && hojeEm != null && (
                <p style={{ fontSize: 22 }}>
                  Começou em{' '}
                  <strong className="num-display" style={{ fontSize: 30 }}>
                    {comecouEm}
                  </strong>
                  {' → '}Hoje{' '}
                  <strong className="num-display" style={{ fontSize: 30 }}>
                    {hojeEm}
                  </strong>
                </p>
              )}
              {metaGarantia != null && !checkpointRef && (
                <span className="pill pill-gold">meta da garantia: {metaGarantia} ou menos</span>
              )}
            </div>
            <EvaChart pontos={curvaPontos} />
          </section>
        )}

        <ColarPrograma
          ciclo={cicloRef}
          sessoesDoCiclo={sessoesDoCicloRef}
          propostaPendente={propostaPendente}
          avaliacaoCheckpoint={checkpointRef}
        />

        {propostaPendente && paciente && (
          <PropostaAberta
            proposta={propostaPendente}
            paciente={paciente}
            config={config}
            aoMudar={() => void carregar()}
          />
        )}

        <section className="stack">
          <span className="eyebrow">História</span>
          <HistoriaFeed sessoes={sessoes} avaliacoes={avaliacoes} ciclos={ciclos} />
        </section>

        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-ghost" onClick={() => void abrirFolha()}>
            💬 WhatsApp
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/agenda')}>
            Marcar sessão
          </button>
          {checkpointRef?.relatorio_impresso_em && (
            <button type="button" className="btn btn-ghost" onClick={() => void imprimir(checkpointRef.id)}>
              Imprimir o relatório de novo
            </button>
          )}
        </div>
      </div>

      {/* BOTÃO-ESTADO — fixo no rodapé, 64px, o próximo passo certo */}
      <div
        className="ficha-rodape"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 120,
          padding: '10px 16px calc(14px + env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(to top, var(--cream) 78%, rgba(247, 242, 234, 0))',
        }}
      >
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={ocupado}
            onClick={() => void executar(estado.acao)}
            style={{
              minHeight: 64,
              fontSize: 21,
              borderRadius: 18,
              ...(estado.destaque === 'checkpoint' ? { background: 'var(--gold)', color: 'var(--ink)' } : {}),
            }}
          >
            {ocupado ? 'Um instante…' : rotuloBotao}
          </button>
        </div>
      </div>

      {folhaAberta && (
        <FolhaWhatsApp paciente={paciente} opcoes={montarOpcoes()} aoFechar={() => setFolhaAberta(false)} />
      )}

      {dialogoFase && (
        <DialogoFase
          nome={nomeCurto(paciente)}
          ocupado={ocupado}
          aoEscolher={(fase) => void decidirFase(fase)}
          aoFechar={() => setDialogoFase(false)}
        />
      )}

      {checkpointRef && cicloRef && (
        <RelatorioImpressao
          paciente={paciente}
          ciclo={cicloRef}
          inicial={inicialRef}
          checkpoint={checkpointRef}
          sessoesDoCiclo={sessoesDoCicloRef}
        />
      )}

      {erroAcao && (
        <div className="toast" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span>{erroAcao}</span>
          <button
            type="button"
            onClick={() => setErroAcao(null)}
            style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'underline' }}
          >
            Entendi
          </button>
        </div>
      )}
    </>
  )
}

// Fim de ciclo (spec §4): três caminhos, um por botão, rótulos por extenso.
function DialogoFase({
  nome,
  ocupado,
  aoEscolher,
  aoFechar,
}: {
  nome: string
  ocupado: boolean
  aoEscolher: (fase: 'manutencao' | 'alta' | 'novo_ciclo') => void
  aoFechar: () => void
}) {
  return (
    <div style={SOBREPOSICAO} role="dialog" aria-label="Decidir a próxima fase" onClick={aoFechar}>
      <div className="card stack" style={FOLHA} onClick={(e) => e.stopPropagation()}>
        <h2>O programa da {nome} terminou — e agora?</h2>
        <p className="muted">A escolha fica guardada na ficha e o app segue cuidando dos lembretes.</p>
        <button type="button" className="btn btn-primary btn-xl" disabled={ocupado} onClick={() => aoEscolher('manutencao')}>
          Manutenção mensal — 4 sessões por mês
        </button>
        <button type="button" className="btn btn-ghost btn-xl" disabled={ocupado} onClick={() => aoEscolher('alta')}>
          Alta — mensagem de acompanhamento em um mês
        </button>
        <button type="button" className="btn btn-ghost btn-xl" disabled={ocupado} onClick={() => aoEscolher('novo_ciclo')}>
          Novo ciclo — Reset, 10 sessões
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={aoFechar}>
          Voltar sem decidir
        </button>
      </div>
    </div>
  )
}
