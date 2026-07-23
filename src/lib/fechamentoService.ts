// "Ela fechou!" depois de ter saído pensando — o caminho fechou_7_dias.
// Espelha as escritas do fechamento na sala (dadosSessao.fecharPrograma),
// incluindo o backfill do ciclo na sessão da primeira e na avaliação inicial.

import { supabase } from './supabase'
import type { Ciclo, Config, Paciente, Proposta } from './tipos'
import type { Enums } from './database.types'
import { NOME_PROGRAMA } from './tipos'

export async function fecharPropostaPendente(args: {
  proposta: Proposta
  paciente: Paciente
  config: Config | null
  forma: Enums<'pagamento_forma_t'>
  parcelas: number
}): Promise<Ciclo> {
  const { proposta, paciente, config } = args
  const programa = proposta.programa_oferecido
  if (programa !== 'reset_10' && programa !== 'alivio_5') {
    throw new Error('Esta proposta não é de um programa fechável por aqui.')
  }
  const preco = proposta.valor_centavos
  const credito = config?.preco_primeira_centavos ?? 45000
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

  const { data: ciclo, error: erroCiclo } = await supabase
    .from('ciclos')
    .insert({
      paciente_id: paciente.id,
      programa,
      condicao: paciente.condicao ?? 'outra',
      sessoes_total: programa === 'reset_10' ? 10 : 5,
      preco_centavos: preco,
      credito_centavos: credito,
      parcelas: args.parcelas,
      iniciado_em: hoje,
    })
    .select('*')
    .single()
  if (erroCiclo || !ciclo) throw new Error('Não consegui registrar o programa — confira a internet e tente de novo.')

  await supabase
    .from('propostas')
    .update({ resultado: 'fechou_7_dias', ciclo_id: ciclo.id, decidido_em: hoje })
    .eq('id', proposta.id)

  // A Primeira Sessão Completa vira a sessão 1 do ciclo, e a avaliação
  // inicial ganha o ciclo — é dela que o checkpoint da 5ª copia a base.
  if (proposta.sessao_id) {
    await supabase
      .from('sessoes')
      .update({ ciclo_id: ciclo.id, numero_no_ciclo: 1 })
      .eq('id', proposta.sessao_id)
    await supabase.from('avaliacoes').update({ ciclo_id: ciclo.id }).eq('sessao_id', proposta.sessao_id)
  }

  await supabase.from('pagamentos').insert({
    paciente_id: paciente.id,
    ciclo_id: ciclo.id,
    valor_centavos: preco - credito,
    forma: args.forma,
    parcelas: args.parcelas,
    descricao: `Programa ${NOME_PROGRAMA[programa]} — fechou no prazo do crédito`,
  })
  await supabase.from('pacientes').update({ status: 'em_programa' }).eq('id', paciente.id)

  return ciclo
}

export async function desistirPropostaPendente(args: {
  proposta: Proposta
  objecao: Enums<'objecao_t'>
}): Promise<void> {
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const { error } = await supabase
    .from('propostas')
    .update({ resultado: 'nao_fechou', objecao: args.objecao, decidido_em: hoje })
    .eq('id', args.proposta.id)
  if (error) throw new Error('Não consegui registrar — confira a internet e tente de novo.')
  await supabase
    .from('pacientes')
    .update({ status: 'inativa' })
    .eq('id', args.proposta.paciente_id)
}
