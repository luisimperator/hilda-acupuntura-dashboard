/**
 * Peças compartilhadas entre as ferramentas de leitura e de escrita:
 * cliente do Google Ads, formatação, e as travas de segurança da escrita.
 */

import { GoogleAdsApi, type Customer } from 'google-ads-api'
import { z } from 'zod'

export const MOEDA = process.env.GOOGLE_ADS_MOEDA || 'BRL'

export const PERIODOS = {
  ontem: 'YESTERDAY',
  '7d': 'LAST_7_DAYS',
  '14d': 'LAST_14_DAYS',
  '30d': 'LAST_30_DAYS',
  mes: 'THIS_MONTH',
  mes_passado: 'LAST_MONTH',
} as const
export type Periodo = keyof typeof PERIODOS

export const periodoSchema = z
  .enum(['ontem', '7d', '14d', '30d', 'mes', 'mes_passado'])
  .default('30d')
  .describe('Janela de tempo do relatório')

export function rotuloPeriodo(p: Periodo): string {
  return {
    ontem: 'ontem',
    '7d': 'últimos 7 dias',
    '14d': 'últimos 14 dias',
    '30d': 'últimos 30 dias',
    mes: 'este mês',
    mes_passado: 'mês passado',
  }[p]
}

// ---------------------------------------------------------------------------
// Credenciais e cliente
// ---------------------------------------------------------------------------

export function credenciaisFaltando(): string[] {
  const req = [
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET',
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_REFRESH_TOKEN',
    'GOOGLE_ADS_CUSTOMER_ID',
  ]
  return req.filter((v) => !process.env[v])
}

let clienteCache: Customer | null = null

export function customer(): Customer {
  if (clienteCache) return clienteCache
  const ausentes = credenciaisFaltando()
  if (ausentes.length > 0) {
    throw new Error(
      `Faltam credenciais do Google Ads: ${ausentes.join(', ')}. ` +
        `Preencha o .env (veja o README.md) antes de usar as ferramentas.`,
    )
  }
  const api = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  })
  clienteCache = api.Customer({
    customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || undefined,
  })
  return clienteCache
}

// ---------------------------------------------------------------------------
// Travas de segurança da ESCRITA
// ---------------------------------------------------------------------------

/** A escrita só é liberada com GOOGLE_ADS_PERMITIR_ESCRITA=true. */
export function escritaLiberada(): boolean {
  return String(process.env.GOOGLE_ADS_PERMITIR_ESCRITA ?? '').toLowerCase() === 'true'
}

/** Teto de orçamento diário, em micros (padrão R$ 100/dia). */
export function tetoDiarioMicros(): number {
  const v = Number(process.env.GOOGLE_ADS_ORCAMENTO_DIARIO_MAX ?? '100')
  const reais = isFinite(v) && v > 0 ? v : 100
  return Math.round(reais * 1_000_000)
}

export function reaisParaMicros(reais: number): number {
  return Math.round(reais * 1_000_000)
}

/** Barreira única no topo de toda ferramenta de escrita. Retorna a mensagem de bloqueio, ou null se liberado. */
export function bloqueioDeEscrita(): { content: { type: 'text'; text: string }[]; isError: true } | null {
  if (!escritaLiberada()) {
    return {
      content: [
        {
          type: 'text',
          text:
            'Escrita desligada. Este MCP está em modo somente-leitura. Para permitir criar/pausar/ajustar ' +
            'campanhas, defina GOOGLE_ADS_PERMITIR_ESCRITA=true no .env e reinicie o servidor.',
        },
      ],
      isError: true,
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

export function reais(microsRaw: unknown): string {
  const micros = Number(microsRaw ?? 0)
  return (micros / 1_000_000).toLocaleString('pt-BR', { style: 'currency', currency: MOEDA })
}

export function inteiro(n: unknown): string {
  return Number(n ?? 0).toLocaleString('pt-BR')
}

export function decimal(n: unknown, casas = 2): string {
  return Number(n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: casas })
}

export function custoPorConversao(custoMicros: unknown, conversoes: unknown): string {
  const c = Number(conversoes ?? 0)
  if (c === 0) return '—'
  return reais(Number(custoMicros ?? 0) / c)
}

export function texto(t: string) {
  return { content: [{ type: 'text' as const, text: t }] }
}

export function erro(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  return { content: [{ type: 'text' as const, text: `Erro no Google Ads: ${msg}` }], isError: true as const }
}
