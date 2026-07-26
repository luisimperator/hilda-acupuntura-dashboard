// Criar/retomar sessão a partir de um agendamento — usado pelo cartão AGORA
// (Início) e pelo botão-estado (Ficha). Uma implementação só, para os dois.

import { supabase } from './supabase'
import { dataISO, diaDaSemana, instanteDoDia, somarDias } from './datas'
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

/**
 * Próximas N vagas realmente livres da agenda (para scripts de WhatsApp, para
 * os defaults e para a folha de remarcar).
 *
 * `duracaoMin` (ou `paraPrimeira`, que usa a duração da Primeira da config) =
 * quanto a sessão precisa caber: uma Primeira de 90 min só entra onde os 90 min
 * inteiros estão livres. Ocupação é comparada como INTERVALO, não como horário
 * de início — uma sessão de 90 min bloqueia o slot seguinte.
 * `ignorarAgendamentoId` tira da conta a própria sessão que está sendo remarcada.
 */
export async function proximasVagasLivres(
  quantas = 2,
  opcoes?: { duracaoMin?: number; paraPrimeira?: boolean; ignorarAgendamentoId?: string },
): Promise<{ inicio: string }[]> {
  const { data: config } = await supabase
    .from('config')
    .select('grade, duracao_ciclo_min, duracao_primeira_min')
    .eq('id', true)
    .maybeSingle()
  const grade = (config?.grade as { dia: number; turnos: [string, string][] }[] | null) ?? []
  if (grade.length === 0) return []

  const passoMin = config?.duracao_ciclo_min ?? 50
  const duracaoMin =
    opcoes?.duracaoMin ?? (opcoes?.paraPrimeira ? (config?.duracao_primeira_min ?? 90) : passoMin)

  // Pega também o que começou nas últimas horas: uma sessão longa ainda ocupa a sala.
  const desde = new Date(Date.now() - 4 * 60 * 60000).toISOString()
  const { data: ocupados } = await supabase
    .from('agendamentos')
    .select('id, inicio, duracao_min')
    .eq('status', 'agendada')
    .gte('inicio', desde)
  const intervalos = (ocupados ?? [])
    .filter((a) => a.id !== opcoes?.ignorarAgendamentoId)
    .map((a) => {
      const ini = new Date(a.inicio).getTime()
      return [ini, ini + a.duracao_min * 60000] as const
    })
  const cabe = (ini: number) =>
    intervalos.every(([ocIni, ocFim]) => ini + duracaoMin * 60000 <= ocIni || ini >= ocFim)

  const vagas: { inicio: string }[] = []
  const hoje = dataISO(new Date())
  // varre os próximos 21 dias na grade
  for (let d = 0; d < 21 && vagas.length < quantas; d++) {
    const data = somarDias(hoje, d)
    const naGrade = grade.find((g) => g.dia === diaDaSemana(data))
    if (!naGrade) continue
    for (const [ini, fim] of naGrade.turnos) {
      let cursor = instanteDoDia(data, ini)
      const limite = instanteDoDia(data, fim)
      while (cursor.getTime() + duracaoMin * 60000 <= limite.getTime() && vagas.length < quantas) {
        if (cursor.getTime() > Date.now() && cabe(cursor.getTime())) {
          vagas.push({ inicio: cursor.toISOString() })
        }
        cursor = new Date(cursor.getTime() + passoMin * 60000)
      }
    }
  }
  return vagas
}
