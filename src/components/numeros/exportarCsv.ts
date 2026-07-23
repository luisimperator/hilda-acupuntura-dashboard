// Exportar mês (CSV) — gerado no navegador (Blob), sem servidor.
// Separador ';' e vírgula decimal: abre certo no Excel/Planilhas em pt-BR.
// As linhas vêm das mesmas views que a tela renderiza.

import { NOME_OBJECAO, rotuloMes, type DadosNumeros } from './dadosNumeros'

type Celula = string | number | null | undefined

function campo(v: Celula): string {
  if (v == null) return ''
  const texto = typeof v === 'number' ? String(v).replace('.', ',') : v
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

function linha(...celulas: Celula[]): string {
  return celulas.map(campo).join(';')
}

export function montarCsvMes(d: DadosNumeros): string {
  const linhas: string[] = []
  const L = (...c: Celula[]) => linhas.push(linha(...c))

  L(`Números do consultório — ${rotuloMes(d.mes)}`)
  L('gerado em', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))
  L()

  L('RECEITA DO MÊS (v_receita_mensal — devoluções de garantia entram negativas)')
  L('mes', 'receita_reais', 'lancamentos', 'programas_fechados', 'ticket_medio_programa')
  L(
    d.mes,
    d.receita?.receita_reais ?? 0,
    d.receita?.lancamentos ?? 0,
    d.receita?.programas_fechados ?? 0,
    d.receita?.ticket_medio_programa,
  )
  L()

  L('FUNIL DO MÊS (v_funil_mensal)')
  L(
    'mes',
    'leads',
    'primeiras_sessoes',
    'propostas',
    'fechou_na_sala',
    'fechou_total',
    'taxa_sala_pct',
    'taxa_total_pct',
  )
  L(
    d.mes,
    d.funil?.leads ?? 0,
    d.funil?.primeiras_sessoes ?? 0,
    d.funil?.propostas ?? 0,
    d.funil?.fechou_na_sala ?? 0,
    d.funil?.fechou_total ?? 0,
    d.funil?.taxa_sala_pct,
    d.funil?.taxa_total_pct,
  )
  L()

  L('OBJEÇÕES DO MÊS (v_objecoes_mensal)')
  L('objecao', 'vezes')
  if (d.objecoes.length === 0) L('(nenhuma)', 0)
  for (const o of d.objecoes) L(NOME_OBJECAO[o.objecao], o.vezes)
  L()

  L('OCUPAÇÃO SEMANAL (v_ocupacao_semanal · capacidade da config: ' + d.capacidadeSemana + ')')
  L('semana', 'realizadas', 'faltas', 'agendadas')
  if (d.ocupacao.length === 0) L('(nenhuma)')
  for (const s of d.ocupacao) L(s.semana, s.realizadas ?? 0, s.faltas ?? 0, s.agendadas ?? 0)
  L()

  L('GARANTIAS ACIONADAS NO MÊS (pagamentos negativos)')
  L('paciente', 'valor_reais', 'data', 'descricao')
  if (d.garantias.length === 0) L('(nenhuma)')
  for (const g of d.garantias) L(g.paciente, g.valorCentavos / 100, g.pagoEm, g.descricao)
  L()

  L('EVA NO CHECKPOINT — desde o início (v_eva_marketing)')
  L(
    'reavaliacoes',
    'queda_media_pontos',
    'queda_media_pct',
    'criterio_atingido',
    'criterio_nao_atingido',
  )
  L(
    d.evaMarketing?.reavaliacoes ?? 0,
    d.evaMarketing?.queda_media_pontos,
    d.evaMarketing?.queda_media_pct,
    d.evaMarketing?.criterio_atingido ?? 0,
    d.evaMarketing?.criterio_nao_atingido ?? 0,
  )
  L()

  L('EFEITO DO DESTRAVAMENTO — desde o início (v_efeito_destravamento)')
  L('destravamento', 'sessoes', 'queda_media_na_sessao')
  for (const e of d.destravamento) {
    L(
      e.destravamento == null ? 'não respondido' : e.destravamento ? 'com' : 'sem',
      e.sessoes ?? 0,
      e.queda_media_na_sessao,
    )
  }
  L()

  L('ASSINANTES DE CONTINUIDADE (ciclos ativos)')
  L('assinantes', 'previsivel_mes_reais')
  L(d.continuidadeAtivos, (d.continuidadeAtivos * d.precoContinuidadeCentavos) / 100)

  return linhas.join('\r\n')
}

export function baixarCsvMes(d: DadosNumeros): void {
  // BOM para o Excel reconhecer UTF-8 (acentos certos)
  const blob = new Blob(['\uFEFF' + montarCsvMes(d)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `numeros-${d.mes.slice(0, 7)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
