// IO do Modo Sessão: carregar o pacote completo da sessão e as gravações
// que vão além do autosave de `sessoes` (avaliações, red flags, ciclo,
// proposta, pagamentos, agendamentos). Toda falha vira Error com frase calma.

import { supabase } from '../../lib/supabase'
import { dataISO } from '../../lib/datas'
import { NOME_PROGRAMA } from '../../lib/tipos'
import type {
  Agendamento,
  Avaliacao,
  Ciclo,
  Config,
  Paciente,
  Proposta,
  RedFlags,
  Sessao,
} from '../../lib/tipos'
import type { Enums } from '../../lib/database.types'
import type { Rascunho } from './tiposSessao'

const ERRO_REDE = 'Não consegui falar com o banco agora — confira a internet e tente de novo.'

export type PacoteSessao = {
  sessao: Sessao
  paciente: Paciente
  ciclo: Ciclo | null
  config: Config | null
  agendamento: Agendamento | null
  sessoesConcluidas: Sessao[]
  avaliacoes: Avaliacao[]
  redFlagDaSessao: RedFlags | null
  propostaDaSessao: Proposta | null
  pagamento450Feito: boolean
}

export async function carregarPacote(sessaoId: string): Promise<PacoteSessao> {
  const { data: sessao, error: erroSessao } = await supabase
    .from('sessoes')
    .select('*')
    .eq('id', sessaoId)
    .maybeSingle()
  if (erroSessao) throw new Error(ERRO_REDE)
  if (!sessao) throw new Error('Não encontrei esta sessão.')

  const [pacRes, cfgRes, sessRes, avalRes, rfRes, propRes] = await Promise.all([
    supabase.from('pacientes').select('*').eq('id', sessao.paciente_id).maybeSingle(),
    supabase.from('config').select('*').eq('id', true).maybeSingle(),
    supabase
      .from('sessoes')
      .select('*')
      .eq('paciente_id', sessao.paciente_id)
      .eq('status', 'concluida')
      .order('iniciada_em', { ascending: true }),
    supabase.from('avaliacoes').select('*').eq('paciente_id', sessao.paciente_id),
    supabase.from('red_flags').select('*').eq('sessao_id', sessao.id).maybeSingle(),
    supabase.from('propostas').select('*').eq('sessao_id', sessao.id).maybeSingle(),
  ])
  if (pacRes.error || !pacRes.data) throw new Error(ERRO_REDE)

  let ciclo: Ciclo | null = null
  if (sessao.ciclo_id) {
    const { data } = await supabase.from('ciclos').select('*').eq('id', sessao.ciclo_id).maybeSingle()
    ciclo = data ?? null
  }

  let agendamento: Agendamento | null = null
  if (sessao.agendamento_id) {
    const { data } = await supabase.from('agendamentos').select('*').eq('id', sessao.agendamento_id).maybeSingle()
    agendamento = data ?? null
  }

  let pagamento450Feito = false
  if (sessao.tipo === 'primeira') {
    const valorPrimeira = cfgRes.data?.preco_primeira_centavos ?? 45000
    const { data: pags } = await supabase
      .from('pagamentos')
      .select('valor_centavos')
      .eq('paciente_id', sessao.paciente_id)
      .eq('pago_em', dataISO(sessao.iniciada_em))
    pagamento450Feito = (pags ?? []).some((p) => p.valor_centavos === valorPrimeira)
  }

  return {
    sessao,
    paciente: pacRes.data,
    ciclo,
    config: cfgRes.data ?? null,
    agendamento,
    sessoesConcluidas: sessRes.data ?? [],
    avaliacoes: avalRes.data ?? [],
    redFlagDaSessao: rfRes.data ?? null,
    propostaDaSessao: propRes.data ?? null,
    pagamento450Feito,
  }
}

/** Avaliação inicial (EVA de base + mapa + frases + frequência) — spec §3.2 J. */
export async function gravarAvaliacaoInicial(args: {
  sessao: Sessao
  eva: number
  rascunho: Rascunho
}): Promise<void> {
  const { error } = await supabase.from('avaliacoes').upsert(
    {
      paciente_id: args.sessao.paciente_id,
      sessao_id: args.sessao.id,
      ciclo_id: args.sessao.ciclo_id,
      tipo: 'inicial',
      eva: args.eva,
      mapa_zonas: args.rascunho.mapaZonas,
      freq_dor_semana: args.rascunho.freq,
      impede_frases: args.rascunho.frases.filter((f) => f.trim() !== ''),
    },
    { onConflict: 'sessao_id' },
  )
  if (error) throw new Error('Não consegui guardar a avaliação inicial — confira a internet e tente de novo.')
}

/** Checkpoint da 5ª: grava e lê de volta as colunas geradas (queda, critério). */
export async function gravarCheckpoint(args: {
  sessao: Sessao
  eva: number
  evaBase: number
  rascunho: Rascunho
}): Promise<Avaliacao> {
  const { data, error } = await supabase
    .from('avaliacoes')
    .upsert(
      {
        paciente_id: args.sessao.paciente_id,
        sessao_id: args.sessao.id,
        ciclo_id: args.sessao.ciclo_id,
        tipo: 'checkpoint',
        eva: args.eva,
        eva_base: Math.max(1, args.evaBase),
        mapa_zonas: args.rascunho.mapaZonas,
        freq_dor_semana: args.rascunho.freq,
        impede_frases: args.rascunho.frases.filter((f) => f.trim() !== ''),
      },
      { onConflict: 'sessao_id' },
    )
    .select('*')
    .single()
  if (error || !data) throw new Error('Não consegui guardar a reavaliação — confira a internet e tente de novo.')
  return data
}

export async function marcarRelatorioImpresso(avaliacaoId: string): Promise<string> {
  const quando = new Date().toISOString()
  const { error } = await supabase
    .from('avaliacoes')
    .update({ relatorio_impresso_em: quando })
    .eq('id', avaliacaoId)
  if (error) throw new Error(ERRO_REDE)
  return quando
}

export async function registrarDecisaoCheckpoint(
  avaliacaoId: string,
  fase: Enums<'proxima_fase_t'>,
): Promise<void> {
  const { error } = await supabase.from('avaliacoes').update({ proxima_fase: fase }).eq('id', avaliacaoId)
  if (error) throw new Error(ERRO_REDE)
}

/** Red flags da primeira sessão — auditável, por sessão (spec §3.2 E). */
export async function gravarRedFlags(args: {
  sessao: Sessao
  respostas: Record<string, boolean>
  encaminhada: boolean
}): Promise<RedFlags> {
  const algumaPositiva = Object.values(args.respostas).some(Boolean)
  const { data, error } = await supabase
    .from('red_flags')
    .upsert(
      {
        sessao_id: args.sessao.id,
        paciente_id: args.sessao.paciente_id,
        respostas: args.respostas,
        alguma_positiva: algumaPositiva,
        encaminhada: args.encaminhada,
      },
      { onConflict: 'sessao_id' },
    )
    .select('*')
    .single()
  if (error || !data) throw new Error('Não consegui guardar o checklist — confira a internet e tente de novo.')
  return data
}

/** Conclui a sessão (o banco exige EVA pré + pós + agulhas conferidas). */
export async function concluirSessao(sessao: Sessao): Promise<void> {
  const { error } = await supabase
    .from('sessoes')
    .update({ status: 'concluida', concluida_em: new Date().toISOString(), passo_atual: 'fim' })
    .eq('id', sessao.id)
  if (error) throw new Error('Não consegui concluir ainda — confira a internet e toque para tentar de novo.')
  if (sessao.agendamento_id) {
    await supabase.from('agendamentos').update({ status: 'realizada' }).eq('id', sessao.agendamento_id)
  }
}

/** O slot está livre? (para o "mesma hora, semana que vem") */
export async function vagaLivre(inicio: Date): Promise<boolean> {
  const { data, error } = await supabase
    .from('agendamentos')
    .select('id')
    .eq('status', 'agendada')
    .eq('inicio', inicio.toISOString())
  if (error) return false
  return (data ?? []).length === 0
}

/** Vagas livres de um dia específico, pela grade da config. */
export async function vagasLivresDoDia(dia: Date, config: Config | null): Promise<Date[]> {
  const grade = (config?.grade as { dia: number; turnos: [string, string][] }[] | null) ?? []
  const diaSemana = new Date(dia.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getDay()
  const naGrade = grade.find((g) => g.dia === diaSemana)
  if (!naGrade) return []

  const iso = dataISO(dia)
  const passoMin = config?.duracao_ciclo_min ?? 50
  const slots: Date[] = []
  for (const [ini, fim] of naGrade.turnos) {
    let cursor = new Date(`${iso}T${ini}:00-03:00`)
    const limite = new Date(`${iso}T${fim}:00-03:00`)
    while (cursor.getTime() + passoMin * 60000 <= limite.getTime()) {
      if (cursor.getTime() > Date.now()) slots.push(cursor)
      cursor = new Date(cursor.getTime() + passoMin * 60000)
    }
  }
  if (slots.length === 0) return []

  const { data } = await supabase
    .from('agendamentos')
    .select('inicio')
    .eq('status', 'agendada')
    .gte('inicio', `${iso}T00:00:00-03:00`)
    .lte('inicio', `${iso}T23:59:59-03:00`)
  const ocupados = new Set((data ?? []).map((a) => new Date(a.inicio).getTime()))
  return slots.filter((s) => !ocupados.has(s.getTime()))
}

export async function criarAgendamento(campos: {
  paciente_id: string
  ciclo_id?: string | null
  tipo: Enums<'agendamento_tipo_t'>
  inicio: Date
  duracao_min: number
}): Promise<Agendamento> {
  const { data, error } = await supabase
    .from('agendamentos')
    .insert({
      paciente_id: campos.paciente_id,
      ciclo_id: campos.ciclo_id ?? null,
      tipo: campos.tipo,
      inicio: campos.inicio.toISOString(),
      duracao_min: campos.duracao_min,
    })
    .select('*')
    .single()
  if (error || !data) {
    throw new Error('Não consegui marcar — a vaga pode ter sido ocupada agora há pouco. Tente outra.')
  }
  return data
}

/** FECHOU O PROGRAMA 🎉 — cria o ciclo e amarra tudo (spec §3.2 R). */
export async function fecharPrograma(args: {
  sessao: Sessao
  paciente: Paciente
  config: Config | null
  programa: 'reset_10' | 'alivio_5'
  forma: Enums<'pagamento_forma_t'>
  parcelas: number
}): Promise<{ ciclo: Ciclo; proposta: Proposta }> {
  const preco =
    args.programa === 'reset_10'
      ? (args.config?.preco_reset_centavos ?? 340000)
      : (args.config?.preco_alivio_centavos ?? 180000)
  const credito = args.config?.preco_primeira_centavos ?? 45000
  const hoje = dataISO(new Date())

  const { data: ciclo, error: erroCiclo } = await supabase
    .from('ciclos')
    .insert({
      paciente_id: args.paciente.id,
      programa: args.programa,
      condicao: args.paciente.condicao ?? 'outra',
      sessoes_total: args.programa === 'reset_10' ? 10 : 5,
      preco_centavos: preco,
      credito_centavos: credito,
      parcelas: args.parcelas,
      iniciado_em: hoje,
    })
    .select('*')
    .single()
  if (erroCiclo || !ciclo) throw new Error('Não consegui registrar o programa — confira a internet e tente de novo.')

  const { error: erroSessao } = await supabase
    .from('sessoes')
    .update({ ciclo_id: ciclo.id, numero_no_ciclo: 1 })
    .eq('id', args.sessao.id)
  if (erroSessao) throw new Error(ERRO_REDE)

  await supabase.from('avaliacoes').update({ ciclo_id: ciclo.id }).eq('sessao_id', args.sessao.id)

  const { data: proposta, error: erroProp } = await supabase
    .from('propostas')
    .insert({
      paciente_id: args.paciente.id,
      sessao_id: args.sessao.id,
      ciclo_id: ciclo.id,
      programa_oferecido: args.programa,
      valor_centavos: preco,
      resultado: 'fechou_na_sala',
      decidido_em: hoje,
    })
    .select('*')
    .single()
  if (erroProp || !proposta) throw new Error(ERRO_REDE)

  await supabase.from('pagamentos').insert({
    paciente_id: args.paciente.id,
    ciclo_id: ciclo.id,
    valor_centavos: preco - credito,
    forma: args.forma,
    parcelas: args.parcelas,
    descricao: `Programa ${NOME_PROGRAMA[args.programa]} — crédito da primeira sessão abatido`,
  })
  await supabase.from('pacientes').update({ status: 'em_programa' }).eq('id', args.paciente.id)

  return { ciclo, proposta }
}

/** VAI PENSAR / NÃO SEGUIU — registra a proposta e o estado da paciente. */
export async function registrarProposta(args: {
  sessao: Sessao
  programa: 'reset_10' | 'alivio_5'
  valorCentavos: number
  resultado: 'pendente' | 'nao_fechou'
  objecao: Enums<'objecao_t'>
}): Promise<Proposta> {
  const hoje = new Date()
  const { data, error } = await supabase
    .from('propostas')
    .insert({
      paciente_id: args.sessao.paciente_id,
      sessao_id: args.sessao.id,
      programa_oferecido: args.programa,
      valor_centavos: args.valorCentavos,
      resultado: args.resultado,
      objecao: args.objecao,
      credito_expira:
        args.resultado === 'pendente' ? dataISO(new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)) : null,
      decidido_em: args.resultado === 'nao_fechou' ? dataISO(hoje) : null,
    })
    .select('*')
    .single()
  if (error || !data) throw new Error('Não consegui registrar o combinado — confira a internet e tente de novo.')

  await supabase
    .from('pacientes')
    .update({ status: args.resultado === 'pendente' ? 'proposta_pendente' : 'inativa' })
    .eq('id', args.sessao.paciente_id)

  return data
}

export async function registrarPagamento(args: {
  pacienteId: string
  cicloId?: string | null
  valorCentavos: number
  forma: Enums<'pagamento_forma_t'>
  descricao: string
}): Promise<void> {
  const { error } = await supabase.from('pagamentos').insert({
    paciente_id: args.pacienteId,
    ciclo_id: args.cicloId ?? null,
    valor_centavos: args.valorCentavos,
    forma: args.forma,
    descricao: args.descricao,
  })
  if (error) throw new Error('Não consegui registrar o pagamento — confira a internet e tente de novo.')
}

/** ACIONAR A GARANTIA — encerra o ciclo e lança a devolução no caixa (negativa). */
export async function acionarGarantia(args: {
  ciclo: Ciclo
  restantes: number
  valorDevolucaoCentavos: number
  forma: Enums<'pagamento_forma_t'>
}): Promise<Ciclo> {
  const { data, error } = await supabase
    .from('ciclos')
    .update({ status: 'garantia_acionada', concluido_em: dataISO(new Date()) })
    .eq('id', args.ciclo.id)
    .select('*')
    .single()
  if (error || !data) throw new Error(ERRO_REDE)

  await supabase.from('pagamentos').insert({
    paciente_id: args.ciclo.paciente_id,
    ciclo_id: args.ciclo.id,
    valor_centavos: -Math.abs(args.valorDevolucaoCentavos),
    forma: args.forma,
    descricao: `Devolução da garantia — ${args.restantes} ${args.restantes === 1 ? 'sessão restante' : 'sessões restantes'}`,
  })
  return data
}

/** Fim de ciclo: registra a próxima fase decidida na sala. */
export async function definirProximaFase(args: {
  ciclo: Ciclo
  fase: Enums<'proxima_fase_t'>
}): Promise<Ciclo> {
  const encerra = args.fase === 'alta' || args.fase === 'concluir_ciclo' || args.fase === 'manutencao'
  const { data, error } = await supabase
    .from('ciclos')
    .update({
      proxima_fase: args.fase,
      ...(encerra ? { status: 'concluido' as const, concluido_em: dataISO(new Date()) } : {}),
    })
    .eq('id', args.ciclo.id)
    .select('*')
    .single()
  if (error || !data) throw new Error(ERRO_REDE)

  if (args.fase === 'alta') {
    await supabase.from('pacientes').update({ status: 'alta' }).eq('id', args.ciclo.paciente_id)
  } else if (args.fase === 'manutencao') {
    await supabase.from('pacientes').update({ status: 'manutencao' }).eq('id', args.ciclo.paciente_id)
  }
  return data
}

/** Próximo agendamento futuro da paciente (para o resumo do FIM). */
export async function proximoAgendamento(pacienteId: string): Promise<Agendamento | null> {
  const { data } = await supabase
    .from('agendamentos')
    .select('*')
    .eq('paciente_id', pacienteId)
    .eq('status', 'agendada')
    .gt('inicio', new Date().toISOString())
    .order('inicio', { ascending: true })
    .limit(1)
  return data?.[0] ?? null
}
