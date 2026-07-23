// Scripts de WhatsApp do protocolo de atendimento (seção 2).
// A Hilda nunca digita mensagem longa: cada script vira um botão de 1 toque.

export function linkWhatsApp(telefone: string | null | undefined, texto: string): string {
  const numero = (telefone ?? '').replace(/\D/g, '')
  const base = numero ? `https://wa.me/${numero.startsWith('55') ? numero : '55' + numero}` : 'https://wa.me/'
  return `${base}?text=${encodeURIComponent(texto)}`
}

export function primeiroNome(nome: string | null | undefined): string {
  return (nome ?? '').trim().split(/\s+/)[0] || ''
}

type DadosScript = {
  nome?: string | null
  evaInicial?: number | null
  dia?: string | null
  hora?: string | null
  endereco?: string | null
}

// Script 2.1 — resposta ao lead (usa a nota de dor que veio da landing)
export function scriptRespostaLead(d: DadosScript): string {
  const dor = d.evaInicial != null ? `Uma dor ${d.evaInicial}/10 realmente manda na rotina — vamos cuidar disso. ` : ''
  return (
    `Olá, ${primeiroNome(d.nome)}! Aqui é a Hilda. ${dor}` +
    `Sua Primeira Sessão Completa dura 90 minutos: eu avalio sua dor por completo, você já recebe o primeiro tratamento e sai com seu plano por escrito. ` +
    `Investimento: R$ 450 (que vira crédito integral se você fechar um programa em até 7 dias). ` +
    `Tenho horário ${d.dia ?? '[dia]'} às ${d.hora ?? '[hora]'} — fica bom para você?`
  )
}

// Script 2.2 — lembrete de véspera
export function scriptLembreteVespera(d: DadosScript): string {
  return (
    `Oi, ${primeiroNome(d.nome)}! Amanhã às ${d.hora ?? '[hora]'} é nossa sessão` +
    `${d.endereco ? `, em ${d.endereco}` : ''}. ` +
    `Venha com roupa confortável (de preferência que dobre até o joelho e libere os ombros), ` +
    `evite chegar de estômago totalmente vazio e, se usar medicações, traga a listinha. Até amanhã!`
  )
}

// Mensagem da noite do fechamento (playbook, seção 5)
export function scriptReforco24h(d: DadosScript & { objetivo?: string | null }): string {
  return (
    `${primeiroNome(d.nome)}, que alegria começar seu tratamento hoje! ` +
    `${d.objetivo ? `Anotei aqui nosso objetivo: ${d.objetivo}. ` : ''}` +
    `${d.dia && d.hora ? `Sua próxima sessão é ${d.dia} às ${d.hora}. ` : ''}` +
    `Hoje à noite beba bastante água e não estranhe se dormir mais pesado — é ótimo sinal. Qualquer coisa, me chama. — Hilda`
  )
}

// Script 2.3 — follow-up 30 dias pós-alta
export function scriptFollowUp30d(d: DadosScript): string {
  return (
    `Oi, ${primeiroNome(d.nome)}! Hilda aqui. Faz um mês que fechamos seu ciclo — ` +
    `como está aquela dor que começou em ${d.evaInicial ?? '[X]'}/10? ` +
    `Se estiver se mantendo bem, fico feliz demais. Se sentir que está voltando, ` +
    `uma sessão de manutenção agora evita recomeçar do zero depois.`
  )
}

// Acompanhamento em até 24h após a primeira sessão (inegociável nº 6)
export function scriptAcompanhamento24h(d: DadosScript): string {
  return (
    `Oi, ${primeiroNome(d.nome)}! Aqui é a Hilda. Passando para saber como você está depois da nossa primeira sessão. ` +
    `É normal sentir o corpo mais solto ou um sono mais pesado. Como você está se sentindo, de 0 a 10?`
  )
}
