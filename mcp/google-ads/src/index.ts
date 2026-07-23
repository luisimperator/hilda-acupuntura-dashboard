#!/usr/bin/env node
/**
 * MCP do Google Ads — consultório da Hilda.
 *
 * Leitura sempre; escrita (criar/pausar/ajustar) só com as travas ligadas.
 * Configuração por variáveis de ambiente — veja o .env.example e o README.md.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { credenciaisFaltando, escritaLiberada } from './comum.js'
import { registrarLeitura } from './leitura.js'
import { registrarEscrita } from './escrita.js'

const server = new McpServer({ name: 'hilda-google-ads', version: '0.1.0' })

registrarLeitura(server)
registrarEscrita(server)

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // stderr não interfere no protocolo (que roda no stdout).
  const modo = escritaLiberada() ? 'leitura + escrita (com travas)' : 'somente leitura'
  console.error(`MCP Google Ads pronto — modo: ${modo}.`)
  const faltando = credenciaisFaltando()
  if (faltando.length > 0) {
    console.error(`Aviso: faltam credenciais (${faltando.join(', ')}). As ferramentas avisam quando forem chamadas.`)
  }
}

main().catch((e) => {
  console.error('Falha ao iniciar o MCP do Google Ads:', e)
  process.exit(1)
})
