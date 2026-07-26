/** Ferramentas de LEITURA (relatórios) — não alteram nada na conta. */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  PERIODOS,
  custoPorConversao,
  customer,
  decimal,
  erro,
  inteiro,
  periodoSchema,
  reais,
  rotuloPeriodo,
  texto,
} from './comum.js'

export function registrarLeitura(server: McpServer): void {
  server.tool(
    'resumo_conta',
    'Resumo geral da conta de Google Ads no período: investimento, cliques, impressões, conversões e custo por conversão. Use para responder "quanto gastei" e "quantos pacientes o anúncio trouxe".',
    { periodo: periodoSchema },
    async ({ periodo }) => {
      try {
        const rows = await customer().query(`
          SELECT metrics.cost_micros, metrics.impressions, metrics.clicks,
                 metrics.conversions, metrics.ctr, metrics.average_cpc
          FROM customer
          WHERE segments.date DURING ${PERIODOS[periodo]}
        `)
        if (rows.length === 0) return texto(`Sem dados de Google Ads em ${rotuloPeriodo(periodo)}.`)
        const m = rows[0].metrics ?? {}
        return texto(
          [
            `Google Ads — ${rotuloPeriodo(periodo)}`,
            `Investimento: ${reais(m.cost_micros)}`,
            `Impressões: ${inteiro(m.impressions)}`,
            `Cliques: ${inteiro(m.clicks)}  ·  CTR: ${decimal(Number(m.ctr ?? 0) * 100, 2)}%`,
            `Custo por clique: ${reais(m.average_cpc)}`,
            `Conversões: ${decimal(m.conversions, 1)}`,
            `Custo por conversão: ${custoPorConversao(m.cost_micros, m.conversions)}`,
          ].join('\n'),
        )
      } catch (e) {
        return erro(e)
      }
    },
  )

  server.tool(
    'campanhas',
    'Lista as campanhas com status e desempenho no período (investimento, cliques, conversões, custo por conversão), da que mais gasta para a que menos gasta.',
    { periodo: periodoSchema },
    async ({ periodo }) => {
      try {
        const rows = await customer().query(`
          SELECT campaign.id, campaign.name, campaign.status,
                 metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
          FROM campaign
          WHERE segments.date DURING ${PERIODOS[periodo]}
          ORDER BY metrics.cost_micros DESC
        `)
        if (rows.length === 0) return texto(`Nenhuma campanha com dados em ${rotuloPeriodo(periodo)}.`)
        const linhas = rows.map((r) => {
          const c = r.campaign ?? {}
          const m = r.metrics ?? {}
          return (
            `• ${c.name} [${String(c.status).toLowerCase()}]\n` +
            `   ${reais(m.cost_micros)} · ${inteiro(m.clicks)} cliques · ` +
            `${decimal(m.conversions, 1)} conversões · custo/conv: ${custoPorConversao(m.cost_micros, m.conversions)}`
          )
        })
        return texto(`Campanhas — ${rotuloPeriodo(periodo)}\n\n${linhas.join('\n')}`)
      } catch (e) {
        return erro(e)
      }
    },
  )

  server.tool(
    'termos_de_busca',
    'Termos que as pessoas realmente digitaram no Google antes de clicar no anúncio, ordenados por gasto. Ótimo para achar cliques desperdiçados que viram palavras-chave negativas.',
    { periodo: periodoSchema, limite: z.number().int().min(1).max(200).default(50).describe('Quantos termos trazer') },
    async ({ periodo, limite }) => {
      try {
        const rows = await customer().query(`
          SELECT search_term_view.search_term,
                 metrics.clicks, metrics.cost_micros, metrics.conversions
          FROM search_term_view
          WHERE segments.date DURING ${PERIODOS[periodo]}
          ORDER BY metrics.cost_micros DESC
          LIMIT ${limite}
        `)
        if (rows.length === 0) return texto(`Sem termos de busca em ${rotuloPeriodo(periodo)}.`)
        const linhas = rows.map((r) => {
          const t = r.search_term_view?.search_term ?? '(desconhecido)'
          const m = r.metrics ?? {}
          return `• "${t}" — ${reais(m.cost_micros)} · ${inteiro(m.clicks)} cliques · ${decimal(m.conversions, 1)} conv.`
        })
        return texto(`Termos de busca — ${rotuloPeriodo(periodo)} (top ${limite})\n\n${linhas.join('\n')}`)
      } catch (e) {
        return erro(e)
      }
    },
  )

  server.tool(
    'palavras_chave',
    'Desempenho das palavras-chave que você comprou (texto, tipo de correspondência, gasto, cliques, conversões), ordenado por gasto.',
    { periodo: periodoSchema, limite: z.number().int().min(1).max(200).default(50).describe('Quantas palavras trazer') },
    async ({ periodo, limite }) => {
      try {
        const rows = await customer().query(`
          SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
                 metrics.cost_micros, metrics.clicks, metrics.conversions, metrics.average_cpc
          FROM keyword_view
          WHERE segments.date DURING ${PERIODOS[periodo]}
          ORDER BY metrics.cost_micros DESC
          LIMIT ${limite}
        `)
        if (rows.length === 0) return texto(`Sem palavras-chave com dados em ${rotuloPeriodo(periodo)}.`)
        const linhas = rows.map((r) => {
          const k = r.ad_group_criterion?.keyword ?? {}
          const m = r.metrics ?? {}
          return (
            `• ${k.text} [${String(k.match_type).toLowerCase()}] — ${reais(m.cost_micros)} · ` +
            `${inteiro(m.clicks)} cliques · ${decimal(m.conversions, 1)} conv. · CPC ${reais(m.average_cpc)}`
          )
        })
        return texto(`Palavras-chave — ${rotuloPeriodo(periodo)} (top ${limite})\n\n${linhas.join('\n')}`)
      } catch (e) {
        return erro(e)
      }
    },
  )

  server.tool(
    'consulta',
    'Roda uma consulta GAQL (Google Ads Query Language) crua e devolve as linhas em JSON. Somente leitura — só aceita SELECT. Use para relatórios que as outras ferramentas não cobrem.',
    {
      gaql: z.string().min(1).describe('A consulta GAQL. Precisa começar com SELECT.'),
      limite_linhas: z.number().int().min(1).max(500).default(100).describe('Máximo de linhas no resultado'),
    },
    async ({ gaql, limite_linhas }) => {
      try {
        const limpo = gaql.trim()
        if (!/^select\b/i.test(limpo)) {
          return {
            content: [{ type: 'text' as const, text: 'Só aceito consultas de leitura (que começam com SELECT).' }],
            isError: true as const,
          }
        }
        const rows = await customer().query(limpo)
        const recorte = rows.slice(0, limite_linhas)
        const aviso = rows.length > recorte.length ? `\n\n(mostrando ${recorte.length} de ${rows.length} linhas)` : ''
        return texto(JSON.stringify(recorte, null, 2) + aviso)
      } catch (e) {
        return erro(e)
      }
    },
  )
}
