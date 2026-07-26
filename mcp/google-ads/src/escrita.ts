/**
 * Ferramentas de ESCRITA (criar / pausar / ajustar), com três travas:
 *  1. só funcionam com GOOGLE_ADS_PERMITIR_ESCRITA=true;
 *  2. respeitam o teto de orçamento diário (GOOGLE_ADS_ORCAMENTO_DIARIO_MAX);
 *  3. campanha nova nasce PAUSADA — nada gasta até um humano ativar na conta.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { enums } from 'google-ads-api'
import { z } from 'zod'
import {
  bloqueioDeEscrita,
  customer,
  erro,
  reais,
  reaisParaMicros,
  tetoDiarioMicros,
  texto,
} from './comum.js'

type CampanhaInfo = {
  resource_name: string
  id: string
  name: string
  status: string
  budget_resource: string
  budget_micros: number
}

async function acharCampanha(termo: string): Promise<CampanhaInfo | { erro: string }> {
  const rows = await customer().query(`
    SELECT campaign.id, campaign.name, campaign.status, campaign.resource_name,
           campaign_budget.resource_name, campaign_budget.amount_micros
    FROM campaign
    WHERE campaign.status != 'REMOVED'
  `)
  const alvo = termo.trim().toLowerCase()
  const casam = rows.filter((r) => {
    const nome = String(r.campaign?.name ?? '').toLowerCase()
    const id = String(r.campaign?.id ?? '')
    return id === alvo || nome === alvo || (alvo.length >= 3 && nome.includes(alvo))
  })
  if (casam.length === 0) return { erro: `Nenhuma campanha encontrada com "${termo}".` }
  if (casam.length > 1) {
    const nomes = casam.map((r) => `"${r.campaign?.name}"`).join(', ')
    return { erro: `Mais de uma campanha casa com "${termo}": ${nomes}. Use o nome exato ou o ID.` }
  }
  const r = casam[0]
  return {
    resource_name: String(r.campaign?.resource_name),
    id: String(r.campaign?.id),
    name: String(r.campaign?.name),
    status: String(r.campaign?.status),
    budget_resource: String(r.campaign_budget?.resource_name ?? ''),
    budget_micros: Number(r.campaign_budget?.amount_micros ?? 0),
  }
}

export function registrarEscrita(server: McpServer): void {
  server.tool(
    'pausar_campanha',
    'Pausa uma campanha (por nome ou ID). Ação reversível — nada é apagado, só para de gastar. Requer escrita liberada.',
    { campanha: z.string().min(1).describe('Nome (exato ou parte) ou ID da campanha') },
    async ({ campanha }) => {
      const bloq = bloqueioDeEscrita()
      if (bloq) return bloq
      try {
        const c = await acharCampanha(campanha)
        if ('erro' in c) return { content: [{ type: 'text' as const, text: c.erro }], isError: true as const }
        await customer().campaigns.update([{ resource_name: c.resource_name, status: enums.CampaignStatus.PAUSED }])
        return texto(`Campanha "${c.name}" pausada. Não gasta mais nada até você retomar.`)
      } catch (e) {
        return erro(e)
      }
    },
  )

  server.tool(
    'retomar_campanha',
    'Reativa uma campanha pausada (por nome ou ID). Recusa se o orçamento diário dela passar do teto de segurança. Requer escrita liberada.',
    { campanha: z.string().min(1).describe('Nome (exato ou parte) ou ID da campanha') },
    async ({ campanha }) => {
      const bloq = bloqueioDeEscrita()
      if (bloq) return bloq
      try {
        const c = await acharCampanha(campanha)
        if ('erro' in c) return { content: [{ type: 'text' as const, text: c.erro }], isError: true as const }
        if (c.budget_micros > tetoDiarioMicros()) {
          return {
            content: [
              {
                type: 'text' as const,
                text:
                  `Não retomei: o orçamento diário da "${c.name}" é ${reais(c.budget_micros)}, ` +
                  `acima do teto de segurança de ${reais(tetoDiarioMicros())}/dia. ` +
                  `Baixe o orçamento (ajustar_orcamento) ou aumente o teto no .env antes de retomar.`,
              },
            ],
            isError: true as const,
          }
        }
        await customer().campaigns.update([{ resource_name: c.resource_name, status: enums.CampaignStatus.ENABLED }])
        return texto(`Campanha "${c.name}" reativada (orçamento ${reais(c.budget_micros)}/dia).`)
      } catch (e) {
        return erro(e)
      }
    },
  )

  server.tool(
    'ajustar_orcamento',
    'Muda o orçamento diário de uma campanha. Recusa qualquer valor acima do teto de segurança. Requer escrita liberada.',
    {
      campanha: z.string().min(1).describe('Nome (exato ou parte) ou ID da campanha'),
      valor_diario: z.number().positive().describe('Novo orçamento diário, em reais (ex.: 30 = R$ 30/dia)'),
    },
    async ({ campanha, valor_diario }) => {
      const bloq = bloqueioDeEscrita()
      if (bloq) return bloq
      try {
        const micros = reaisParaMicros(valor_diario)
        if (micros > tetoDiarioMicros()) {
          return {
            content: [
              {
                type: 'text' as const,
                text:
                  `Recusado: ${reais(micros)}/dia passa do teto de segurança de ${reais(tetoDiarioMicros())}/dia. ` +
                  `Aumente GOOGLE_ADS_ORCAMENTO_DIARIO_MAX no .env se realmente quiser gastar mais.`,
              },
            ],
            isError: true as const,
          }
        }
        const c = await acharCampanha(campanha)
        if ('erro' in c) return { content: [{ type: 'text' as const, text: c.erro }], isError: true as const }
        if (!c.budget_resource) {
          return { content: [{ type: 'text' as const, text: `A "${c.name}" não tem orçamento próprio identificável.` }], isError: true as const }
        }
        await customer().campaignBudgets.update([{ resource_name: c.budget_resource, amount_micros: micros }])
        return texto(`Orçamento da "${c.name}" ajustado para ${reais(micros)}/dia.`)
      } catch (e) {
        return erro(e)
      }
    },
  )

  server.tool(
    'criar_campanha_busca',
    'Cria uma campanha de rede de pesquisa (Search) já com orçamento, palavras-chave e um anúncio responsivo. ' +
      'A campanha e o anúncio nascem PAUSADOS: nada gasta até você revisar e ativar na conta do Google Ads. ' +
      'Orçamento limitado ao teto de segurança. Requer escrita liberada.',
    {
      nome: z.string().min(1).max(120).describe('Nome da campanha'),
      orcamento_diario: z.number().positive().describe('Orçamento diário em reais (ex.: 30 = R$ 30/dia)'),
      palavras_chave: z.array(z.string().min(1)).min(1).max(50).describe('Palavras-chave (correspondência de frase)'),
      titulos: z
        .array(z.string().min(1).max(30))
        .min(3)
        .max(15)
        .describe('Títulos do anúncio (3 a 15, até 30 caracteres cada)'),
      descricoes: z
        .array(z.string().min(1).max(90))
        .min(2)
        .max(4)
        .describe('Descrições do anúncio (2 a 4, até 90 caracteres cada)'),
      url_final: z.string().url().describe('URL de destino do anúncio (ex.: a landing da Hilda)'),
      cpc_maximo: z.number().positive().optional().describe('Lance máximo por clique em reais (padrão R$ 2)'),
    },
    async ({ nome, orcamento_diario, palavras_chave, titulos, descricoes, url_final, cpc_maximo }) => {
      const bloq = bloqueioDeEscrita()
      if (bloq) return bloq
      try {
        const orcMicros = reaisParaMicros(orcamento_diario)
        if (orcMicros > tetoDiarioMicros()) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Recusado: ${reais(orcMicros)}/dia passa do teto de ${reais(tetoDiarioMicros())}/dia. Reduza o orçamento ou aumente o teto no .env.`,
              },
            ],
            isError: true as const,
          }
        }
        const cust = customer()
        const carimbo = new Date().toISOString().slice(0, 16).replace('T', ' ')

        const orc = await cust.campaignBudgets.create([
          {
            name: `Orçamento — ${nome} — ${carimbo}`,
            amount_micros: orcMicros,
            delivery_method: enums.BudgetDeliveryMethod.STANDARD,
            explicitly_shared: false,
          },
        ])
        const budgetRes = orc.results[0].resource_name!

        const camp = await cust.campaigns.create([
          {
            name: nome,
            status: enums.CampaignStatus.PAUSED,
            advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
            campaign_budget: budgetRes,
            network_settings: {
              target_google_search: true,
              target_search_network: true,
              target_content_network: false,
              target_partner_search_network: false,
            },
            manual_cpc: { enhanced_cpc_enabled: false },
          },
        ])
        const campRes = camp.results[0].resource_name!

        const grupo = await cust.adGroups.create([
          {
            name: `${nome} — grupo 1`,
            campaign: campRes,
            status: enums.AdGroupStatus.ENABLED,
            type: enums.AdGroupType.SEARCH_STANDARD,
            cpc_bid_micros: reaisParaMicros(cpc_maximo ?? 2),
          },
        ])
        const grupoRes = grupo.results[0].resource_name!

        await cust.adGroupCriteria.create(
          palavras_chave.map((text) => ({
            ad_group: grupoRes,
            status: enums.AdGroupCriterionStatus.ENABLED,
            keyword: { text, match_type: enums.KeywordMatchType.PHRASE },
          })),
        )

        await cust.adGroupAds.create([
          {
            ad_group: grupoRes,
            status: enums.AdGroupAdStatus.PAUSED,
            ad: {
              final_urls: [url_final],
              responsive_search_ad: {
                headlines: titulos.map((text) => ({ text })),
                descriptions: descricoes.map((text) => ({ text })),
              },
            },
          },
        ])

        return texto(
          [
            `Campanha "${nome}" criada — e está PAUSADA (nada gasta ainda).`,
            `Orçamento: ${reais(orcMicros)}/dia · ${palavras_chave.length} palavras-chave · anúncio com ${titulos.length} títulos e ${descricoes.length} descrições.`,
            ``,
            `Próximo passo é seu, na conta do Google Ads: revise e, quando estiver satisfeito, mude o status da campanha e do anúncio para "ativo". Fiz de propósito assim para nada começar a gastar sem você conferir.`,
          ].join('\n'),
        )
      } catch (e) {
        return erro(e)
      }
    },
  )
}
