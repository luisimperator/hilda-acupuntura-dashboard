// Carregamento e montagem dos dados do Início (spec §1.1).
// Uma chamada só (carregarInicio), refeita ao abrir a tela e depois de
// qualquer ação que mude o dia. Os componentes só renderizam.

import { supabase } from '../../lib/supabase'
import { dataHoraCurta, dataISO, diaPorExtenso, horaCurta } from '../../lib/datas'
import { proximasVagasLivres } from '../../lib/sessaoService'
import type { DadosMensagem, Vaga } from '../../lib/mensagens'
import type { Agendamento, Ciclo, Paciente, Proposta, Sessao, WaTemplate } from '../../lib/tipos'

/** Meio-dia no fuso do consultório — para datas "AAAA-MM-DD" não escorregarem de dia ao exibir. */
export const meioDia = (data: string): string => `${data}T12:00:00-03:00`

/** Como chamar o decisor no WhatsApp, sem presumir parentesco. */
export function textoDecisor(p: Paciente): string | null {
  return p.decisor === 'conjuge' || p.decisor === 'filho_a' ? 'a família' : null
}

export type LinhaHoje = {
  agendamento: Agendamento
  paciente: Paciente
  ciclo: Ciclo | null
  /** Sessões concluídas do ciclo ativo, em ordem (para colar, defaults e "última vez") */
  sessoesConcluidas: Sessao[]
  /** Sessão ligada a este agendamento (concluída → mostra o "6 → 3") */
  sessaoDoDia: Sessao | null
}

export type PropostaPendente = {
  proposta: Proposta
  paciente: Paciente
  evaPre: number | null
  evaPos: number | null
}

export type MensagemPronta = {
  chave: string
  template: WaTemplate
  paciente: Paciente
  dados: DadosMensagem
  contexto: string | null
  refs: {
    agendamentoId: string | null
    sessaoId: string | null
    cicloId: string | null
    propostaId: string | null
  }
}

export type SessaoAbertaInfo = { sessao: Sessao; paciente: Paciente }

export type DadosInicio = {
  hoje: LinhaHoje[]
  sessaoAberta: SessaoAbertaInfo | null
  leads: Paciente[]
  propostas: PropostaPendente[]
  mensagens: MensagemPronta[]
  recentes: Paciente[]
  amanhaQuantas: number
  vagas: Vaga[]
  creditoCentavos: number
}

export async function carregarInicio(): Promise<DadosInicio> {
  const agoraMs = Date.now()
  const hojeData = dataISO(new Date(agoraMs))
  const amanhaData = dataISO(new Date(agoraMs + 86_400_000))
  const depoisData = dataISO(new Date(agoraMs + 2 * 86_400_000))
  const iniHoje = new Date(`${hojeData}T00:00:00-03:00`).toISOString()
  const iniAmanha = new Date(`${amanhaData}T00:00:00-03:00`).toISOString()
  const iniDepois = new Date(`${depoisData}T00:00:00-03:00`).toISOString()

  const [agHojeR, contAmanhaR, abertaR, leadsR, propostasR, mensagensR, recentesR, configR, vagas] =
    await Promise.all([
      supabase
        .from('agendamentos')
        .select('*')
        .gte('inicio', iniHoje)
        .lt('inicio', iniAmanha)
        .neq('status', 'cancelada')
        .order('inicio'),
      supabase
        .from('agendamentos')
        .select('id', { count: 'exact', head: true })
        .gte('inicio', iniAmanha)
        .lt('inicio', iniDepois)
        .eq('status', 'agendada'),
      supabase
        .from('sessoes')
        .select('*')
        .eq('status', 'em_andamento')
        .order('atualizado_em', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('pacientes').select('*').eq('status', 'lead').order('criado_em', { ascending: false }),
      supabase.from('propostas').select('*').eq('resultado', 'pendente').order('credito_expira', { ascending: true }),
      supabase.from('v_mensagens_hoje').select('*'),
      supabase
        .from('pacientes')
        .select('*')
        .neq('status', 'lead')
        .order('atualizado_em', { ascending: false })
        .limit(4),
      supabase.from('config').select('endereco, preco_primeira_centavos').eq('id', true).maybeSingle(),
      proximasVagasLivres(2).catch(() => [] as { inicio: string }[]),
    ])

  // O dia de hoje é o essencial — sem ele a tela não tem sentido.
  if (agHojeR.error) throw agHojeR.error

  const agHoje = agHojeR.data ?? []
  const sessaoAbertaRow = abertaR.data ?? null
  const leads = leadsR.data ?? []
  const propostasRows = propostasR.data ?? []
  const linhasMsg = (mensagensR.data ?? []).filter((m) => m.paciente_id && m.template)
  const recentes = recentesR.data ?? []
  const endereco = configR.data?.endereco ?? null
  const creditoCentavos = configR.data?.preco_primeira_centavos ?? 45000

  // ---- pacientes (join manual) ----
  const mapaPacientes = new Map<string, Paciente>()
  for (const p of [...leads, ...recentes]) mapaPacientes.set(p.id, p)
  const idsPacientes = new Set<string>()
  for (const a of agHoje) idsPacientes.add(a.paciente_id)
  if (sessaoAbertaRow) idsPacientes.add(sessaoAbertaRow.paciente_id)
  for (const p of propostasRows) idsPacientes.add(p.paciente_id)
  for (const m of linhasMsg) if (m.paciente_id) idsPacientes.add(m.paciente_id)
  const faltamIds = [...idsPacientes].filter((id) => !mapaPacientes.has(id))
  if (faltamIds.length) {
    const r = await supabase.from('pacientes').select('*').in('id', faltamIds)
    if (r.error) throw r.error
    for (const p of r.data ?? []) mapaPacientes.set(p.id, p)
  }

  // ---- ciclos ativos das pacientes de hoje ----
  const idsPacHoje = [...new Set(agHoje.map((a) => a.paciente_id))]
  let ciclos: Ciclo[] = []
  if (idsPacHoje.length) {
    const r = await supabase.from('ciclos').select('*').in('paciente_id', idsPacHoje).eq('status', 'ativo')
    ciclos = r.data ?? []
  }
  const cicloPorPaciente = new Map<string, Ciclo>(ciclos.map((c) => [c.paciente_id, c]))
  const cicloPorId = new Map<string, Ciclo>(ciclos.map((c) => [c.id, c]))

  // ---- sessões: concluídas dos ciclos + as ligadas aos agendamentos de hoje ----
  const idsCiclos = ciclos.map((c) => c.id)
  let sessoesCiclo: Sessao[] = []
  if (idsCiclos.length) {
    const r = await supabase
      .from('sessoes')
      .select('*')
      .in('ciclo_id', idsCiclos)
      .eq('status', 'concluida')
      .order('numero_no_ciclo', { ascending: true })
    sessoesCiclo = r.data ?? []
  }
  const idsAgHoje = agHoje.map((a) => a.id)
  let sessoesDia: Sessao[] = []
  if (idsAgHoje.length) {
    const r = await supabase.from('sessoes').select('*').in('agendamento_id', idsAgHoje)
    sessoesDia = r.data ?? []
  }

  const sessPorAgendamento = new Map<string, Sessao>()
  for (const s of sessoesDia) {
    if (!s.agendamento_id) continue
    const jaTem = sessPorAgendamento.get(s.agendamento_id)
    if (!jaTem || s.status === 'concluida') sessPorAgendamento.set(s.agendamento_id, s)
  }
  const sessPorCiclo = new Map<string, Sessao[]>()
  for (const s of sessoesCiclo) {
    if (!s.ciclo_id) continue
    const lista = sessPorCiclo.get(s.ciclo_id) ?? []
    lista.push(s)
    sessPorCiclo.set(s.ciclo_id, lista)
  }

  const hoje: LinhaHoje[] = []
  for (const a of agHoje) {
    const paciente = mapaPacientes.get(a.paciente_id)
    if (!paciente) continue
    const ciclo = (a.ciclo_id ? cicloPorId.get(a.ciclo_id) : null) ?? cicloPorPaciente.get(a.paciente_id) ?? null
    hoje.push({
      agendamento: a,
      paciente,
      ciclo,
      sessoesConcluidas: ciclo ? (sessPorCiclo.get(ciclo.id) ?? []) : [],
      sessaoDoDia: sessPorAgendamento.get(a.id) ?? null,
    })
  }

  const sessaoAberta: SessaoAbertaInfo | null = (() => {
    if (!sessaoAbertaRow) return null
    const paciente = mapaPacientes.get(sessaoAbertaRow.paciente_id)
    return paciente ? { sessao: sessaoAbertaRow, paciente } : null
  })()

  // ---- EVAs das sessões referenciadas (retorno_48h e cartão de proposta) ----
  const idsSessoesEva = new Set<string>()
  for (const p of propostasRows) if (p.sessao_id) idsSessoesEva.add(p.sessao_id)
  for (const m of linhasMsg) if (m.sessao_id) idsSessoesEva.add(m.sessao_id)
  const evaPorSessao = new Map<string, { pre: number | null; pos: number | null }>()
  if (idsSessoesEva.size) {
    const r = await supabase.from('sessoes').select('id, eva_pre, eva_pos').in('id', [...idsSessoesEva])
    for (const s of r.data ?? []) evaPorSessao.set(s.id, { pre: s.eva_pre, pos: s.eva_pos })
  }

  // ---- propostas citadas nas mensagens que não estão mais pendentes ----
  const propostaPorId = new Map<string, Proposta>(propostasRows.map((p) => [p.id, p]))
  const idsPropFaltando = [
    ...new Set(
      linhasMsg
        .map((m) => m.proposta_id)
        .filter((id): id is string => !!id && !propostaPorId.has(id)),
    ),
  ]
  if (idsPropFaltando.length) {
    const r = await supabase.from('propostas').select('*').in('id', idsPropFaltando)
    for (const p of r.data ?? []) propostaPorId.set(p.id, p)
  }

  // ---- agendamentos citados nas mensagens (hora do lembrete etc.) ----
  const agPorId = new Map<string, Agendamento>(agHoje.map((a) => [a.id, a]))
  const idsAgFaltando = [
    ...new Set(
      linhasMsg
        .map((m) => m.agendamento_id)
        .filter((id): id is string => !!id && !agPorId.has(id)),
    ),
  ]
  if (idsAgFaltando.length) {
    const r = await supabase.from('agendamentos').select('*').in('id', idsAgFaltando)
    for (const a of r.data ?? []) agPorId.set(a.id, a)
  }

  // ---- próximo agendamento por paciente (boa-noite do fechamento e afins sem agendamento_id) ----
  const precisaProximo = [
    ...new Set(
      linhasMsg
        .filter((m) => !m.agendamento_id && m.paciente_id)
        .map((m) => m.paciente_id as string),
    ),
  ]
  const proximoAgPorPaciente = new Map<string, Agendamento>()
  if (precisaProximo.length) {
    const r = await supabase
      .from('agendamentos')
      .select('*')
      .in('paciente_id', precisaProximo)
      .eq('status', 'agendada')
      .gte('inicio', new Date().toISOString())
      .order('inicio')
    for (const a of r.data ?? []) {
      if (!proximoAgPorPaciente.has(a.paciente_id)) proximoAgPorPaciente.set(a.paciente_id, a)
    }
  }

  // ---- EVA de base para o follow-up de 30 dias ----
  const idsCicloMsg = [
    ...new Set(
      linhasMsg
        .filter((m) => m.template === 'followup_30d' && m.ciclo_id)
        .map((m) => m.ciclo_id as string),
    ),
  ]
  const evaBasePorCiclo = new Map<string, number>()
  if (idsCicloMsg.length) {
    const r = await supabase
      .from('avaliacoes')
      .select('ciclo_id, eva')
      .eq('tipo', 'inicial')
      .in('ciclo_id', idsCicloMsg)
    for (const av of r.data ?? []) if (av.ciclo_id) evaBasePorCiclo.set(av.ciclo_id, av.eva)
  }

  // ---- a fila pronta: cada linha com o template e TODOS os dados resolvidos ----
  const mensagens: MensagemPronta[] = []
  for (const m of linhasMsg) {
    const paciente = m.paciente_id ? mapaPacientes.get(m.paciente_id) : undefined
    if (!paciente || !m.template) continue
    const base: DadosMensagem = { nome: paciente.nome, tratamento: paciente.tratamento }
    const ag = m.agendamento_id
      ? (agPorId.get(m.agendamento_id) ?? null)
      : (proximoAgPorPaciente.get(paciente.id) ?? null)
    let dados: DadosMensagem = base
    let contexto: string | null = null

    switch (m.template) {
      case 'resposta_lead':
        dados = { ...base, nota: paciente.eva_landing, vagas }
        contexto = paciente.eva_landing != null ? `mandou dor ${paciente.eva_landing}/10` : 'lead novo'
        break
      case 'lembrete_vespera':
        dados = { ...base, hora: ag?.inicio ?? null, endereco }
        contexto = ag ? `amanhã às ${horaCurta(ag.inicio)}` : 'sessão amanhã'
        break
      case 'checkin_2a':
        dados = { ...base, hora: ag?.inicio ?? null }
        contexto = ag ? `amanhã às ${horaCurta(ag.inicio)} · 2ª sessão` : '2ª sessão amanhã'
        break
      case 'pos_primeira_24h':
        contexto = 'primeira sessão foi ontem'
        break
      case 'boa_noite_fechamento':
        dados = {
          ...base,
          objetivo: paciente.objetivo_frase,
          dia: ag?.inicio ?? null,
          hora: ag?.inicio ?? null,
        }
        contexto = 'fechou o programa hoje'
        break
      case 'retorno_48h': {
        const prop = m.proposta_id ? (propostaPorId.get(m.proposta_id) ?? null) : null
        const sessId = prop?.sessao_id ?? m.sessao_id
        const eva = sessId ? (evaPorSessao.get(sessId) ?? null) : null
        dados = {
          ...base,
          evaPre: eva?.pre ?? null,
          evaPos: eva?.pos ?? null,
          dataCredito: prop?.credito_expira ? meioDia(prop.credito_expira) : null,
          decisor: textoDecisor(paciente),
          vagas,
        }
        contexto = prop?.credito_expira
          ? `crédito vale até ${diaPorExtenso(meioDia(prop.credito_expira))}`
          : 'retorno combinado de 48h'
        break
      }
      case 'credito_expira': {
        const prop = m.proposta_id ? (propostaPorId.get(m.proposta_id) ?? null) : null
        dados = {
          ...base,
          dataCredito: prop?.credito_expira ? meioDia(prop.credito_expira) : null,
          vagas,
        }
        contexto = prop?.credito_expira
          ? `crédito vale até ${diaPorExtenso(meioDia(prop.credito_expira))}`
          : 'crédito vencendo'
        break
      }
      case 'followup_30d':
        dados = { ...base, evaBase: m.ciclo_id ? (evaBasePorCiclo.get(m.ciclo_id) ?? null) : null }
        contexto = 'um mês depois da alta'
        break
      case 'falta_reagendar':
        dados = { ...base, vagas }
        contexto = 'faltou à sessão'
        break
      case 'remarcacao':
        dados = { ...base, dia: ag?.inicio ?? null, hora: ag?.inicio ?? null }
        contexto = ag ? `ficou para ${dataHoraCurta(ag.inicio)}` : null
        break
      case 'livre':
        break
    }

    mensagens.push({
      chave: `${m.template}·${paciente.id}·${m.agendamento_id ?? m.proposta_id ?? m.ciclo_id ?? 'x'}`,
      template: m.template,
      paciente,
      dados,
      contexto,
      refs: {
        agendamentoId: m.agendamento_id,
        sessaoId: m.sessao_id,
        cicloId: m.ciclo_id,
        propostaId: m.proposta_id,
      },
    })
  }

  const propostas: PropostaPendente[] = propostasRows.flatMap((p) => {
    const paciente = mapaPacientes.get(p.paciente_id)
    if (!paciente) return []
    const eva = p.sessao_id ? (evaPorSessao.get(p.sessao_id) ?? null) : null
    return [{ proposta: p, paciente, evaPre: eva?.pre ?? null, evaPos: eva?.pos ?? null }]
  })

  return {
    hoje,
    sessaoAberta,
    leads,
    propostas,
    mensagens,
    recentes,
    amanhaQuantas: contAmanhaR.count ?? 0,
    vagas,
    creditoCentavos,
  }
}
