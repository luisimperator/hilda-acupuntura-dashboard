// Criar/retomar sessão a partir de um agendamento — usado pelo cartão AGORA
// (Início) e pelo botão-estado (Ficha). Uma implementação só, para os dois.

import { supabase } from './supabase'
import type { Agendamento, Ciclo, Paciente, Sessao } from './tipos'
import { PROTOCOLOS } from './protocolos'

export type VarianteSessao = 'primeira' | 'checkpoint' | 'ciclo'

/**
 * Retorna o id da sessão para navegar (/sessao/:id).
 * Se a paciente já tem sessão aberta, retoma; senão cria com os defaults do protocolo.
 */
export async function iniciarSessao(args: {
  agendamento: Agendamento
  paciente: Paciente
  cicloAtivo: Ciclo | null
  ultimaSessaoDoCiclo: Sessao | null
  sessoesConcluidasNoCiclo: number
}): Promise<{ sessaoId: string; retomada: boolean }> {
  const { agendamento, paciente, cicloAtivo, ultimaSessaoDoCiclo, sessoesConcluidasNoCiclo } = args

  // Retomada inequívoca: no máximo UMA sessão aberta por paciente (índice único no banco)
  const { data: aberta } = await supabase
    .from('sessoes')
    .select('id')
    .eq('paciente_id', paciente.id)
    .eq('status', 'em_andamento')
    .maybeSingle()
  if (aberta) return { sessaoId: aberta.id, retomada: true }

  const ehPrimeira = agendamento.tipo === 'primeira'
  const condicao = cicloAtivo?.condicao ?? paciente.condicao ?? 'outra'
  const protocolo = PROTOCOLOS[condicao]

  // Defaults em cascata: última sessão do ciclo → protocolo-base da condição
  const pontos = ultimaSessaoDoCiclo?.pontos?.length
    ? ultimaSessaoDoCiclo.pontos
    : ehPrimeira
      ? []
      : protocolo.base.map((p) => p.codigo)

  const { data, error } = await supabase
    .from('sessoes')
    .insert({
      agendamento_id: agendamento.id,
      paciente_id: paciente.id,
      ciclo_id: cicloAtivo?.id ?? null,
      numero_no_ciclo: cicloAtivo ? sessoesConcluidasNoCiclo + 1 : null,
      tipo: ehPrimeira ? 'primeira' : agendamento.tipo === 'manutencao' ? 'manutencao' : 'ciclo',
      status: 'em_andamento',
      passo_atual: 'capa',
      pontos,
      destrav_regioes: ultimaSessaoDoCiclo?.destrav_regioes ?? [],
      auriculo_pontos: ultimaSessaoDoCiclo?.auriculo_pontos ?? protocolo.auriculoTipico,
      agulhas_colocadas: ultimaSessaoDoCiclo?.agulhas_colocadas ?? null,
      orientacoes: ultimaSessaoDoCiclo?.orientacoes ?? [],
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(error?.message ?? 'não consegui criar a sessão')
  return { sessaoId: data.id, retomada: false }
}

/** Variante do fluxo, decidida pelo app — a Hilda nunca escolhe (spec §3). */
export function varianteDaSessao(sessao: Pick<Sessao, 'tipo' | 'numero_no_ciclo'>): VarianteSessao {
  if (sessao.tipo === 'primeira') return 'primeira'
  if (sessao.numero_no_ciclo === 5) return 'checkpoint'
  return 'ciclo'
}

/** Próximas N vagas realmente livres da agenda (para scripts de WhatsApp e defaults). */
export async function proximasVagasLivres(quantas = 2): Promise<{ inicio: string }[]> {
  const { data: config } = await supabase.from('config').select('grade, duracao_ciclo_min').eq('id', true).maybeSingle()
  const grade = (config?.grade as { dia: number; turnos: [string, string][] }[] | null) ?? []
  if (grade.length === 0) return []

  const { data: ocupados } = await supabase
    .from('agendamentos')
    .select('inicio, duracao_min')
    .eq('status', 'agendada')
    .gte('inicio', new Date().toISOString())
  const ocupadosSet = new Set((ocupados ?? []).map((a) => new Date(a.inicio).getTime()))

  const vagas: { inicio: string }[] = []
  const passoMin = config?.duracao_ciclo_min ?? 50
  // varre os próximos 21 dias na grade
  for (let d = 0; d < 21 && vagas.length < quantas; d++) {
    const dia = new Date()
    dia.setDate(dia.getDate() + d)
    const diaSemana = Number(
      dia.toLocaleDateString('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'narrow', day: 'numeric' }) &&
      new Date(dia.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })).getDay(),
    )
    const naGrade = grade.find((g) => g.dia === diaSemana)
    if (!naGrade) continue
    for (const [ini, fim] of naGrade.turnos) {
      const [hIni, mIni] = ini.split(':').map(Number)
      const [hFim, mFim] = fim.split(':').map(Number)
      const dataISO = dia.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
      let cursor = new Date(`${dataISO}T${String(hIni).padStart(2, '0')}:${String(mIni).padStart(2, '0')}:00-03:00`)
      const limite = new Date(`${dataISO}T${String(hFim).padStart(2, '0')}:${String(mFim).padStart(2, '0')}:00-03:00`)
      while (cursor.getTime() + passoMin * 60000 <= limite.getTime() && vagas.length < quantas) {
        if (cursor.getTime() > Date.now() && !ocupadosSet.has(cursor.getTime())) {
          vagas.push({ inicio: cursor.toISOString() })
        }
        cursor = new Date(cursor.getTime() + passoMin * 60000)
      }
    }
  }
  return vagas
}
