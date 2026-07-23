// Carregamento dos NÚMEROS (spec §7) — a área do Fernando.
// Tudo lê das views do schema; o front SÓ renderiza. Se o Fernando rodar as
// mesmas views no SQL Editor, os números batem, porque são os mesmos.

import { supabase } from '../../lib/supabase'
import { dataISO } from '../../lib/datas'
import type { Tables } from '../../lib/database.types'
import type { Objecao } from '../../lib/tipos'

export type ReceitaMes = Tables<'v_receita_mensal'>
export type FunilMes = Tables<'v_funil_mensal'>
export type ObjecaoMes = Tables<'v_objecoes_mensal'>
export type OcupacaoSemana = Tables<'v_ocupacao_semanal'>
export type EvaMarketing = Tables<'v_eva_marketing'>
export type EfeitoDestravamento = Tables<'v_efeito_destravamento'>

export type GarantiaLinha = {
  paciente: string
  valorCentavos: number
  pagoEm: string
  descricao: string | null
}

export type DadosNumeros = {
  /** 'AAAA-MM-01' do mês exibido */
  mes: string
  receita: ReceitaMes | null
  funil: FunilMes | null
  objecoes: { objecao: Objecao; vezes: number }[]
  ocupacao: OcupacaoSemana[]
  /** Desde o início (a view não é mensal — é a headline da landing) */
  evaMarketing: EvaMarketing | null
  /** Desde o início: queda média com destravamento × sem */
  destravamento: EfeitoDestravamento[]
  /** Devoluções de garantia do mês (pagamentos negativos — o caixa nunca mente) */
  garantias: GarantiaLinha[]
  continuidadeAtivos: number
  capacidadeSemana: number
  precoContinuidadeCentavos: number
}

/** Primeiro dia do mês corrente, no fuso do consultório: 'AAAA-MM-01' */
export function mesAtualISO(): string {
  return `${dataISO(new Date()).slice(0, 7)}-01`
}

/** Soma meses a um 'AAAA-MM-01' sem passar por Date (sem escorregar de fuso) */
export function somarMeses(mes: string, delta: number): string {
  const [ano, m] = mes.split('-').map(Number)
  const total = ano * 12 + (m - 1) + delta
  const novoAno = Math.floor(total / 12)
  const novoMes = (total % 12) + 1
  return `${novoAno}-${String(novoMes).padStart(2, '0')}-01`
}

/** "Julho de 2026" */
export function rotuloMes(mes: string): string {
  const texto = new Date(`${mes}T12:00:00-03:00`).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** "6 de julho" (rótulo de semana da ocupação) */
export function diaMes(data: string): string {
  return new Date(`${data}T12:00:00-03:00`).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
  })
}

/** Valor em REAIS (as views de receita já dividem por 100) */
export function reais(valor: number | null | undefined): string {
  if (valor == null) return '—'
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: Number.isInteger(valor) ? 0 : 2,
  })
}

/** "58%" — porcentagem já calculada pela view */
export function pctTexto(valor: number | null | undefined): string {
  if (valor == null) return '—'
  return `${Math.round(valor)}%`
}

export const NOME_OBJECAO: Record<Objecao, string> = {
  nenhuma: 'Nenhuma',
  preco: 'Preço',
  tempo: 'Tempo / agenda',
  decisor: 'Precisa do decisor',
  vou_pensar: 'Vai pensar',
  outra: 'Outra',
}

export async function carregarNumeros(mes: string): Promise<DadosNumeros> {
  const proxMes = somarMeses(mes, 1)

  const [receitaR, funilR, objecoesR, ocupacaoR, evaMktR, destravR, configR, contR, devolucoesR] =
    await Promise.all([
      supabase.from('v_receita_mensal').select('*').eq('mes', mes).maybeSingle(),
      supabase.from('v_funil_mensal').select('*').eq('mes', mes).maybeSingle(),
      supabase
        .from('v_objecoes_mensal')
        .select('*')
        .eq('mes', mes)
        .order('vezes', { ascending: false }),
      supabase
        .from('v_ocupacao_semanal')
        .select('*')
        .gte('semana', mes)
        .lt('semana', proxMes)
        .order('semana', { ascending: true }),
      supabase.from('v_eva_marketing').select('*').maybeSingle(),
      supabase.from('v_efeito_destravamento').select('*'),
      supabase
        .from('config')
        .select('capacidade_semana, preco_continuidade_centavos')
        .eq('id', true)
        .maybeSingle(),
      supabase
        .from('ciclos')
        .select('id', { count: 'exact', head: true })
        .eq('programa', 'continuidade')
        .eq('status', 'ativo'),
      supabase
        .from('pagamentos')
        .select('paciente_id, valor_centavos, pago_em, descricao')
        .lt('valor_centavos', 0)
        .gte('pago_em', mes)
        .lt('pago_em', proxMes)
        .order('pago_em', { ascending: true }),
    ])

  // Sem o funil e a receita a tela não conta a história do mês.
  if (receitaR.error) throw receitaR.error
  if (funilR.error) throw funilR.error

  const devolucoes = devolucoesR.data ?? []

  // Nome das pacientes das devoluções (join manual, padrão da casa)
  const idsPacientes = [...new Set(devolucoes.map((d) => d.paciente_id))]
  const nomePorId = new Map<string, string>()
  if (idsPacientes.length) {
    const r = await supabase.from('pacientes').select('id, nome').in('id', idsPacientes)
    for (const p of r.data ?? []) nomePorId.set(p.id, p.nome)
  }

  const garantias: GarantiaLinha[] = devolucoes.map((d) => ({
    paciente: nomePorId.get(d.paciente_id) ?? 'Paciente',
    valorCentavos: d.valor_centavos,
    pagoEm: d.pago_em,
    descricao: d.descricao,
  }))

  const objecoes = (objecoesR.data ?? []).flatMap((o) =>
    o.objecao && o.vezes != null ? [{ objecao: o.objecao, vezes: o.vezes }] : [],
  )

  return {
    mes,
    receita: receitaR.data ?? null,
    funil: funilR.data ?? null,
    objecoes,
    ocupacao: ocupacaoR.data ?? [],
    evaMarketing: evaMktR.data ?? null,
    destravamento: destravR.data ?? [],
    garantias,
    continuidadeAtivos: contR.count ?? 0,
    capacidadeSemana: configR.data?.capacidade_semana ?? 20,
    precoContinuidadeCentavos: configR.data?.preco_continuidade_centavos ?? 128000,
  }
}
