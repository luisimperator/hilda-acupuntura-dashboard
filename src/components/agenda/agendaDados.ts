// Dados e regras da Agenda (spec §1.3): semana como LISTA VERTICAL de dias
// (nunca grade), só os dias configurados em config.grade, slots de
// duracao_ciclo_min. Conflito é impossível por construção: slot ocupado
// nem oferece "+ marcar aqui".

import { supabase } from '../../lib/supabase'
import { dataISO } from '../../lib/datas'
import type { Agendamento, Ciclo, Paciente } from '../../lib/tipos'

export type AgTipo = Agendamento['tipo']

export type GradeDia = { dia: number; turnos: [string, string][] }

export type ConfigAgenda = {
  passoMin: number
  duracaoPrimeiraMin: number
  grade: GradeDia[]
}

export type SlotLivre = { estado: 'livre'; chave: string; inicio: Date; passou: boolean }
export type SlotComGente = {
  estado: 'ocupado' | 'continuacao'
  chave: string
  inicio: Date
  passou: boolean
  agendamento: Agendamento
  paciente: Paciente | null
}
export type Slot = SlotLivre | SlotComGente

export type DiaAgenda = {
  /** AAAA-MM-DD no fuso do consultório */
  data: string
  /** meio-dia do dia — seguro para formatar por extenso sem escorregar de dia */
  meioDia: Date
  ehHoje: boolean
  slots: Slot[]
}

export type DadosAgenda = { config: ConfigAgenda; segundaISO: string; dias: DiaAgenda[] }

export const NOME_TIPO_AG: Record<AgTipo, string> = {
  primeira: 'Primeira Sessão Completa',
  ciclo: 'Sessão do ciclo',
  manutencao: 'Sessão de manutenção',
  avulsa: 'Sessão avulsa',
  retorno_proposta: 'Retorno da proposta',
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Soma dias a uma data AAAA-MM-DD sem depender do fuso do aparelho. */
export function somarDias(dataAMD: string, dias: number): string {
  const [a, m, d] = dataAMD.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10)
}

/** Instante de um horário "HH:MM" de um dia AAAA-MM-DD, no fuso do consultório. */
export function instanteDoDia(dataAMD: string, hhmm: string): Date {
  return new Date(`${dataAMD}T${hhmm.padStart(5, '0')}:00-03:00`)
}

/** Segunda-feira da semana de hoje, deslocada N semanas (0 = esta semana). */
export function segundaDaSemana(deslocSemanas: number): string {
  const hoje = dataISO(new Date())
  const [a, m, d] = hoje.split('-').map(Number)
  const base = new Date(Date.UTC(a, m - 1, d))
  const desdeSegunda = (base.getUTCDay() + 6) % 7
  base.setUTCDate(base.getUTCDate() - desdeSegunda + deslocSemanas * 7)
  return base.toISOString().slice(0, 10)
}

/** Monta os dias da semana (só os da grade), com os slots livres/ocupados. */
export function montarSemana(args: {
  segundaISO: string
  grade: GradeDia[]
  passoMin: number
  agendamentos: Agendamento[]
  pacientePorId: Map<string, Paciente>
  agoraMs: number
}): DiaAgenda[] {
  const { segundaISO, grade, passoMin, agendamentos, pacientePorId, agoraMs } = args
  const hojeAMD = dataISO(new Date(agoraMs))
  const dias: DiaAgenda[] = []

  for (let i = 0; i < 7; i++) {
    const data = somarDias(segundaISO, i)
    const diaSemana = (i + 1) % 7 // segunda=1 … sábado=6, domingo=0
    const naGrade = grade.find((g) => g.dia === diaSemana)
    if (!naGrade) continue

    const slots: Slot[] = []
    for (const [ini, fim] of naGrade.turnos) {
      let cursor = instanteDoDia(data, ini)
      const limite = instanteDoDia(data, fim)
      while (cursor.getTime() + passoMin * 60000 <= limite.getTime()) {
        slots.push({
          estado: 'livre',
          chave: `livre-${cursor.getTime()}`,
          inicio: cursor,
          passou: cursor.getTime() < agoraMs,
        })
        cursor = new Date(cursor.getTime() + passoMin * 60000)
      }
    }

    for (const ag of agendamentos) {
      if (dataISO(ag.inicio) !== data) continue
      const inicioAg = new Date(ag.inicio)
      const t = inicioAg.getTime()
      const paciente = pacientePorId.get(ag.paciente_id) ?? null
      const ocupado: SlotComGente = {
        estado: 'ocupado',
        chave: `ag-${ag.id}`,
        inicio: inicioAg,
        passou: t < agoraMs,
        agendamento: ag,
        paciente,
      }
      const idx = slots.findIndex((s) => s.estado === 'livre' && s.inicio.getTime() === t)
      if (idx >= 0) slots[idx] = ocupado
      else slots.push(ocupado) // fora da grade atual — aparece mesmo assim

      // A sessão de 90 min bloqueia o(s) slot(s) seguinte(s) no front
      const fimAg = t + ag.duracao_min * 60000
      for (let j = 0; j < slots.length; j++) {
        const s = slots[j]
        if (s.estado === 'livre' && s.inicio.getTime() > t && s.inicio.getTime() < fimAg) {
          slots[j] = {
            estado: 'continuacao',
            chave: `cont-${ag.id}-${s.inicio.getTime()}`,
            inicio: s.inicio,
            passou: s.passou,
            agendamento: ag,
            paciente,
          }
        }
      }
    }

    slots.sort((x, y) => x.inicio.getTime() - y.inicio.getTime())
    dias.push({ data, meioDia: instanteDoDia(data, '12:00'), ehHoje: data === hojeAMD, slots })
  }

  return dias
}

/** A vaga comporta uma sessão de N minutos? (os slots cobertos precisam estar livres) */
export function vagaComporta(dia: DiaAgenda, inicio: Date, duracaoMin: number, ignorarAgId?: string): boolean {
  const ini = inicio.getTime()
  const fim = ini + duracaoMin * 60000
  return dia.slots.every((s) => {
    const t = s.inicio.getTime()
    if (t <= ini || t >= fim) return true
    if (s.estado === 'livre') return true
    return s.agendamento.id === ignorarAgId
  })
}

/** Tipo de agendamento que o app sugere — a Hilda não decide "tipo" no caminho feliz. */
export function tipoSugerido(p: Paciente, cicloAtivo: Ciclo | null): AgTipo {
  if (cicloAtivo) return cicloAtivo.programa === 'continuidade' ? 'manutencao' : 'ciclo'
  if (p.status === 'lead' || p.status === 'primeira_agendada') return 'primeira'
  if (p.status === 'manutencao') return 'manutencao'
  return 'avulsa'
}

// ---------------------------------------------------------------------------
// Supabase — leitura da semana e mutações, sempre com erro em português calmo
// ---------------------------------------------------------------------------

const ERRO_GUARDAR = 'Não consegui guardar agora. Confira a internet e tente outra vez.'
const ERRO_SLOT_OCUPADO = 'Esse horário acabou de ser ocupado. Escolha outra vaga, por favor.'

function traduzErro(e: { code?: string } | null): string {
  return e?.code === '23505' ? ERRO_SLOT_OCUPADO : ERRO_GUARDAR
}

export async function carregarSemana(deslocSemanas: number): Promise<DadosAgenda> {
  const segundaISO = segundaDaSemana(deslocSemanas)
  const ini = instanteDoDia(segundaISO, '00:00').toISOString()
  const fim = instanteDoDia(somarDias(segundaISO, 7), '00:00').toISOString()

  const [configR, agsR] = await Promise.all([
    supabase
      .from('config')
      .select('grade, duracao_ciclo_min, duracao_primeira_min')
      .eq('id', true)
      .maybeSingle(),
    supabase
      .from('agendamentos')
      .select('*')
      .gte('inicio', ini)
      .lt('inicio', fim)
      .neq('status', 'cancelada')
      .order('inicio'),
  ])
  if (configR.error) throw configR.error
  if (agsR.error) throw agsR.error

  const grade = (configR.data?.grade as GradeDia[] | null) ?? []
  const passoMin = configR.data?.duracao_ciclo_min ?? 50
  const duracaoPrimeiraMin = configR.data?.duracao_primeira_min ?? 90
  const ags = agsR.data ?? []

  const pacientePorId = new Map<string, Paciente>()
  const ids = [...new Set(ags.map((a) => a.paciente_id))]
  if (ids.length) {
    const r = await supabase.from('pacientes').select('*').in('id', ids)
    if (r.error) throw r.error
    for (const p of r.data ?? []) pacientePorId.set(p.id, p)
  }

  return {
    config: { passoMin, duracaoPrimeiraMin, grade },
    segundaISO,
    dias: montarSemana({ segundaISO, grade, passoMin, agendamentos: ags, pacientePorId, agoraMs: Date.now() }),
  }
}

export async function criarAgendamento(args: {
  paciente: Paciente
  cicloId: string | null
  tipo: AgTipo
  inicio: Date
  duracaoMin: number
}): Promise<{ erro: string } | { id: string }> {
  const { data, error } = await supabase
    .from('agendamentos')
    .insert({
      paciente_id: args.paciente.id,
      ciclo_id: args.cicloId,
      tipo: args.tipo,
      inicio: args.inicio.toISOString(),
      duracao_min: args.duracaoMin,
    })
    .select('id')
    .single()
  if (error || !data) return { erro: traduzErro(error) }

  // Lead com primeira marcada entra no funil como "primeira_agendada" (melhor esforço)
  if (args.tipo === 'primeira' && args.paciente.status === 'lead') {
    await supabase.from('pacientes').update({ status: 'primeira_agendada' }).eq('id', args.paciente.id)
  }
  return { id: data.id }
}

export async function marcarFalta(agendamentoId: string): Promise<string | null> {
  const { error } = await supabase.from('agendamentos').update({ status: 'faltou' }).eq('id', agendamentoId)
  return error ? traduzErro(error) : null
}

export async function cancelarAgendamento(agendamentoId: string): Promise<string | null> {
  const { error } = await supabase.from('agendamentos').update({ status: 'cancelada' }).eq('id', agendamentoId)
  return error ? traduzErro(error) : null
}

/**
 * Remarcar preservando a história: nasce um agendamento novo com
 * remarcado_de = o antigo (que guarda a data original e vira "cancelada").
 * Ordem segura: primeiro o novo (se o slot foi tomado, nada muda), depois o antigo.
 */
export async function remarcarAgendamento(
  ag: Agendamento,
  novoInicio: Date,
): Promise<{ erro: string } | { novoId: string }> {
  const { data, error } = await supabase
    .from('agendamentos')
    .insert({
      paciente_id: ag.paciente_id,
      ciclo_id: ag.ciclo_id,
      tipo: ag.tipo,
      inicio: novoInicio.toISOString(),
      duracao_min: ag.duracao_min,
      remarcado_de: ag.id,
      observacao: ag.observacao,
    })
    .select('id')
    .single()
  if (error || !data) return { erro: traduzErro(error) }

  const antigo = await supabase.from('agendamentos').update({ status: 'cancelada' }).eq('id', ag.id)
  if (antigo.error) {
    await supabase.from('agendamentos').delete().eq('id', data.id)
    return { erro: traduzErro(antigo.error) }
  }
  return { novoId: data.id }
}

/** Busca para a folha "+ marcar aqui": a partir da 2ª letra; sem termo, as recentes. */
export async function buscarPacientes(termo: string): Promise<Paciente[]> {
  const limpo = termo.trim()
  const base = supabase.from('pacientes').select('*').neq('status', 'inativa')
  const filtrada = limpo.length >= 2 ? base.ilike('nome', `%${limpo}%`) : base
  const r = await filtrada.order('atualizado_em', { ascending: false }).limit(8)
  if (r.error) throw r.error
  return r.data ?? []
}

export async function cicloAtivoDe(pacienteId: string): Promise<Ciclo | null> {
  const r = await supabase
    .from('ciclos')
    .select('*')
    .eq('paciente_id', pacienteId)
    .eq('status', 'ativo')
    .order('fechado_em', { ascending: false })
    .limit(1)
  if (r.error) return null
  return r.data?.[0] ?? null
}
