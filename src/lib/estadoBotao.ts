// A máquina de estados do botão-estado (spec §2).
// Função pura: recebe os dados da paciente, devolve o próximo passo certo.
// Prioridade de cima para baixo; o primeiro que casar vence.

import type { Agendamento, Avaliacao, Ciclo, MensagemHoje, Paciente, Proposta, Sessao } from './tipos'
import { ehHoje } from './datas'
import { TITULO_TEMPLATE } from './mensagens'

export type AcaoBotao =
  | { tipo: 'continuar_sessao'; sessaoId: string }
  | { tipo: 'comecar_sessao'; agendamentoId: string; variante: 'primeira' | 'checkpoint' | 'ciclo' }
  | { tipo: 'registrar_proposta'; sessaoId: string }
  | { tipo: 'imprimir_relatorio'; avaliacaoId: string }
  | { tipo: 'mandar_mensagem'; mensagem: MensagemHoje }
  | { tipo: 'marcar_proxima' }
  | { tipo: 'decidir_fase'; cicloId: string }
  | { tipo: 'responder_lead' }
  | { tipo: 'retorno_proposta'; propostaId: string }
  | { tipo: 'marcar_sessao' }

export type BotaoEstado = { rotulo: string; acao: AcaoBotao; destaque?: 'checkpoint' }

export type DadosBotao = {
  paciente: Paciente
  cicloAtivo: Ciclo | null
  sessoesDoCiclo: Sessao[] // concluídas do ciclo ativo
  sessaoAberta: Sessao | null // status em_andamento
  agendamentoHoje: Agendamento | null // status agendada, hoje
  propostaPendente: Proposta | null
  avaliacaoCheckpoint: Avaliacao | null // do ciclo ativo, se houver
  primeiraConcluidaHoje: Sessao | null // tipo primeira, concluída hoje
  temPropostaDaPrimeira: boolean
  mensagemDevida: MensagemHoje | null // desta paciente, na v_mensagens_hoje
  temAgendamentoFuturo?: boolean // alguma sessão agendada depois de hoje
}

const ROTULO_PASSO: Record<string, string> = {
  capa: 'na capa',
  eva_pre: 'na dor de chegada',
  destravamento: 'no destravamento',
  pontos: 'nos pontos',
  complementos: 'nos complementos',
  agulhas: 'nas agulhas',
  eva_pos: 'na dor de saída',
  intercorrencia: 'no "correu tudo bem?"',
  orientacao: 'na orientação de casa',
  proxima: 'na próxima sessão',
  termo: 'no termo de consentimento',
  condicao: 'na condição',
  historia: 'na história',
  red_flags: 'nas perguntas de segurança',
  cautelas: 'nas cautelas',
  mapa: 'no mapa do corpo',
  frases: 'nas frases dela',
  frequencia: 'na frequência da dor',
  veredito: 'na reavaliação',
  prescricao: 'na prescrição',
  desfecho: 'no desfecho',
  pagamento: 'no pagamento',
}

export function calcularBotaoEstado(d: DadosBotao): BotaoEstado {
  // 1. sessão em andamento
  if (d.sessaoAberta) {
    const onde = ROTULO_PASSO[d.sessaoAberta.passo_atual] ?? 'de onde parou'
    return {
      rotulo: `Continuar a sessão — parou ${onde}`,
      acao: { tipo: 'continuar_sessao', sessaoId: d.sessaoAberta.id },
    }
  }

  // 2–4. agendamento de hoje
  if (d.agendamentoHoje && ehHoje(d.agendamentoHoje.inicio)) {
    if (d.agendamentoHoje.tipo === 'primeira') {
      return {
        rotulo: 'Começar a Primeira Sessão',
        acao: { tipo: 'comecar_sessao', agendamentoId: d.agendamentoHoje.id, variante: 'primeira' },
      }
    }
    const numeroHoje = d.sessoesDoCiclo.length + 1
    if (d.cicloAtivo && numeroHoje === 5) {
      return {
        rotulo: 'Começar a 5ª sessão — Reavaliação ★',
        destaque: 'checkpoint',
        acao: { tipo: 'comecar_sessao', agendamentoId: d.agendamentoHoje.id, variante: 'checkpoint' },
      }
    }
    const contagem = d.cicloAtivo ? ` (${numeroHoje}ª de ${d.cicloAtivo.sessoes_total})` : ''
    return {
      rotulo: `Começar a sessão de hoje${contagem}`,
      acao: { tipo: 'comecar_sessao', agendamentoId: d.agendamentoHoje.id, variante: 'ciclo' },
    }
  }

  // 5. primeira concluída hoje sem proposta registrada
  if (d.primeiraConcluidaHoje && !d.temPropostaDaPrimeira) {
    return {
      rotulo: 'Registrar o que ficou combinado',
      acao: { tipo: 'registrar_proposta', sessaoId: d.primeiraConcluidaHoje.id },
    }
  }

  // 6. checkpoint feito, relatório não impresso
  if (d.avaliacaoCheckpoint && !d.avaliacaoCheckpoint.relatorio_impresso_em) {
    return {
      rotulo: 'Imprimir o Relatório de Evolução',
      acao: { tipo: 'imprimir_relatorio', avaliacaoId: d.avaliacaoCheckpoint.id },
    }
  }

  // 7. mensagem devida
  if (d.mensagemDevida?.template) {
    return {
      rotulo: `Mandar mensagem — ${TITULO_TEMPLATE[d.mensagemDevida.template].toLowerCase()}`,
      acao: { tipo: 'mandar_mensagem', mensagem: d.mensagemDevida },
    }
  }

  // 8. ciclo ativo sem próxima sessão marcada (nem hoje, nem no futuro)
  if (
    d.cicloAtivo &&
    d.sessoesDoCiclo.length < d.cicloAtivo.sessoes_total &&
    !d.agendamentoHoje &&
    !d.temAgendamentoFuturo
  ) {
    return { rotulo: 'Marcar a próxima sessão', acao: { tipo: 'marcar_proxima' } }
  }

  // 9. ciclo completo sem próxima fase
  if (
    d.cicloAtivo &&
    d.sessoesDoCiclo.length >= d.cicloAtivo.sessoes_total &&
    !d.cicloAtivo.proxima_fase
  ) {
    return { rotulo: 'Decidir a próxima fase', acao: { tipo: 'decidir_fase', cicloId: d.cicloAtivo.id } }
  }

  // 10. lead sem sessão marcada
  if (d.paciente.status === 'lead') {
    return { rotulo: 'Responder no WhatsApp', acao: { tipo: 'responder_lead' } }
  }

  // 11. proposta pendente (crédito correndo)
  if (d.propostaPendente) {
    return {
      rotulo: 'Mandar o retorno combinado',
      acao: { tipo: 'retorno_proposta', propostaId: d.propostaPendente.id },
    }
  }

  // 12. nada pendente
  return { rotulo: 'Marcar sessão', acao: { tipo: 'marcar_sessao' } }
}
