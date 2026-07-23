// Os 11 templates de WhatsApp (spec §5.1) — a Hilda nunca digita mensagem.
// Placeholders são resolvidos aqui; o envio abre wa.me com o texto pronto.

import type { WaTemplate } from './tipos'
import { diaCurto, diaPorExtenso, horaCurta } from './datas'

export function linkWhatsApp(telefone: string | null | undefined, texto: string): string {
  const numero = (telefone ?? '').replace(/\D/g, '')
  const completo = numero.startsWith('55') ? numero : numero ? `55${numero}` : ''
  const base = completo ? `https://wa.me/${completo}` : 'https://wa.me/'
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base
}

export function primeiroNome(nome: string | null | undefined): string {
  return (nome ?? '').trim().split(/\s+/)[0] || ''
}

export type Vaga = { inicio: string | Date }

export type DadosMensagem = {
  nome?: string | null
  tratamento?: string | null
  nota?: number | null
  hora?: string | Date | null
  dia?: string | Date | null
  endereco?: string | null
  objetivo?: string | null
  evaPre?: number | null
  evaPos?: number | null
  evaBase?: number | null
  dataCredito?: string | Date | null
  decisor?: string | null
  vagas?: Vaga[]
}

const vaga = (d: DadosMensagem, i: number): string =>
  d.vagas?.[i] ? `${diaCurto(d.vagas[i].inicio)} às ${horaCurta(d.vagas[i].inicio)}` : '[a combinar]'

const chama = (d: DadosMensagem): string => primeiroNome(d.tratamento || d.nome)

export const TITULO_TEMPLATE: Record<WaTemplate, string> = {
  resposta_lead: 'Responder o lead',
  lembrete_vespera: 'Lembrete de amanhã',
  checkin_2a: 'Como foi a semana? (2ª sessão)',
  pos_primeira_24h: 'Como passou a noite?',
  boa_noite_fechamento: 'Boa noite do fechamento',
  retorno_48h: 'Retorno combinado',
  credito_expira: 'Crédito vencendo',
  followup_30d: 'Um mês da alta',
  falta_reagendar: 'Senti sua falta',
  remarcacao: 'Confirmação de remarcação',
  livre: 'Conversa livre',
}

export function montarMensagem(template: WaTemplate, d: DadosMensagem): string {
  switch (template) {
    case 'resposta_lead': {
      const abertura =
        d.nota != null
          ? `Uma dor ${d.nota}/10 realmente manda na rotina — vamos cuidar disso.`
          : 'Que bom que você me escreveu — vamos cuidar dessa dor.'
      return (
        `Olá, ${chama(d)}! Aqui é a Hilda. ${abertura} ` +
        `Sua Primeira Sessão Completa dura 90 minutos: eu avalio sua dor por completo, você já recebe o primeiro tratamento e sai com seu plano por escrito. ` +
        `Investimento: R$ 450 (que vira crédito integral se você fechar um programa em até 7 dias). ` +
        `Tenho horário ${vaga(d, 0)} ou ${vaga(d, 1)} — qual fica melhor?`
      )
    }
    case 'lembrete_vespera':
      return (
        `Oi, ${chama(d)}! Amanhã às ${d.hora ? horaCurta(d.hora) : '[hora]'} é nossa sessão` +
        `${d.endereco ? `, em ${d.endereco}` : ''}. ` +
        `Venha com roupa confortável (de preferência que dobre até o joelho e libere os ombros), ` +
        `evite chegar de estômago totalmente vazio e, se usar medicações, traga a listinha. Até amanhã!`
      )
    case 'checkin_2a':
      return (
        `Oi, ${chama(d)}! Amanhã às ${d.hora ? horaCurta(d.hora) : '[hora]'} é nossa segunda sessão. ` +
        `Me conta uma coisa antes: como foi a semana com a dor, de 0 a 10? Até amanhã!`
      )
    case 'pos_primeira_24h':
      return (
        `Oi, ${chama(d)}! Hilda aqui. Como passou a noite depois da nossa primeira sessão? ` +
        `Sonolência, um pontinho roxo ou a dor mudando de lugar são reações normais — ` +
        `mas me conta qualquer coisa que sentir, que eu te oriento. Um abraço!`
      )
    case 'boa_noite_fechamento':
      return (
        `${chama(d) ? `Dona ${chama(d)}` : 'Olá'}, que alegria começar seu tratamento hoje! ` +
        `${d.objetivo ? `Anotei aqui nosso objetivo: ${d.objetivo}. ` : ''}` +
        `${d.dia && d.hora ? `Sua próxima sessão é ${diaCurto(d.dia)} às ${horaCurta(d.hora)}. ` : ''}` +
        `Hoje à noite beba bastante água e não estranhe se dormir mais pesado — é ótimo sinal. ` +
        `Qualquer coisa, me chama. — Hilda`
      )
    case 'retorno_48h':
      return (
        `Oi, ${chama(d)}! Hilda aqui. Fiquei pensando no seu caso desde a nossa sessão — ` +
        `${d.evaPre != null && d.evaPos != null ? `aquela queda de ${d.evaPre} para ${d.evaPos} foi só o começo. ` : ''}` +
        `Seu crédito de R$ 450 vale até ${d.dataCredito ? diaPorExtenso(d.dataCredito) : '[data]'}, ` +
        `e esta semana tenho ${vaga(d, 0)} ou ${vaga(d, 1)} livres. Conseguiu pensar com calma?` +
        `${d.decisor ? ` O que ${d.decisor} achou?` : ''}`
      )
    case 'credito_expira':
      return (
        `Oi, ${chama(d)}! Passando para te lembrar com carinho: seu crédito de R$ 450 vale até ` +
        `${d.dataCredito ? diaPorExtenso(d.dataCredito) : '[data]'}. ` +
        `Guardei ${vaga(d, 0)} para você — quer que eu deixe reservado?`
      )
    case 'followup_30d':
      return (
        `Oi, ${chama(d)}! Hilda aqui. Faz um mês que fechamos seu ciclo — ` +
        `como está aquela dor que começou em ${d.evaBase ?? '[X]'}/10? ` +
        `Se estiver se mantendo bem, fico feliz demais. Se sentir que está voltando, ` +
        `uma sessão de manutenção agora evita recomeçar do zero depois.`
      )
    case 'falta_reagendar':
      return (
        `Oi, ${chama(d)}! Senti sua falta hoje. Aconteceu alguma coisa? ` +
        `Tenho ${vaga(d, 0)} ou ${vaga(d, 1)} livres — qual fica melhor para remarcarmos?`
      )
    case 'remarcacao':
      return (
        `Oi, ${chama(d)}! Combinado: nossa sessão ficou para ` +
        `${d.dia ? diaCurto(d.dia) : '[dia]'} às ${d.hora ? horaCurta(d.hora) : '[hora]'}. Até lá!`
      )
    case 'livre':
      return ''
  }
}
