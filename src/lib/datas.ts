// Datas sempre no fuso do consultório e por extenso — nunca "23/07" seco para a Hilda.
const FUSO = 'America/Sao_Paulo'

export function agora(): Date {
  return new Date()
}

export function dataSP(iso: string | Date): Date {
  return typeof iso === 'string' ? new Date(iso) : iso
}

/** "quarta, 23 de julho" */
export function diaPorExtenso(d: string | Date): string {
  const texto = dataSP(d).toLocaleDateString('pt-BR', {
    timeZone: FUSO,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return texto.replace('-feira', '')
}

/** "quinta, 25/07" (curto para botões) */
export function diaCurto(d: string | Date): string {
  const data = dataSP(d)
  const semana = data.toLocaleDateString('pt-BR', { timeZone: FUSO, weekday: 'long' }).replace('-feira', '')
  const dm = data.toLocaleDateString('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit' })
  return `${semana}, ${dm}`
}

/** "9h" ou "10h30" */
export function horaCurta(d: string | Date): string {
  const data = dataSP(d)
  const h = Number(data.toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: 'numeric', hour12: false }))
  const m = data.toLocaleTimeString('pt-BR', { timeZone: FUSO, minute: '2-digit' })
  return m === '00' ? `${h}h` : `${h}h${m}`
}

export function dataHoraCurta(d: string | Date): string {
  return `${diaCurto(d)} · ${horaCurta(d)}`
}

/** Data (AAAA-MM-DD) de um instante, no fuso do consultório */
export function dataISO(d: string | Date): string {
  return dataSP(d).toLocaleDateString('sv-SE', { timeZone: FUSO })
}

export function ehHoje(d: string | Date): boolean {
  return dataISO(d) === dataISO(new Date())
}

/** Soma dias a uma data AAAA-MM-DD sem depender do fuso do aparelho. */
export function somarDias(dataAMD: string, dias: number): string {
  const [a, m, d] = dataAMD.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10)
}

/** Dia da semana (0 = domingo) de uma data AAAA-MM-DD, sem escorregar de fuso. */
export function diaDaSemana(dataAMD: string): number {
  const [a, m, d] = dataAMD.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay()
}

/** Instante de um horário "HH:MM" de um dia AAAA-MM-DD, no fuso do consultório. */
export function instanteDoDia(dataAMD: string, hhmm: string): Date {
  return new Date(`${dataAMD}T${hhmm.padStart(5, '0')}:00-03:00`)
}

export function ehAmanha(d: string | Date): boolean {
  const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return dataISO(d) === dataISO(amanha)
}

/** Minutos (com sinal) entre agora e o instante: negativo = ainda falta */
export function minutosDesde(d: string | Date): number {
  return Math.round((Date.now() - dataSP(d).getTime()) / 60000)
}

/** Mesma hora, semana que vem */
export function mesmaHoraSemanaQueVem(d: string | Date): Date {
  return new Date(dataSP(d).getTime() + 7 * 24 * 60 * 60 * 1000)
}

export function dinheiro(centavos: number | null | undefined): string {
  if (centavos == null) return '—'
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: centavos % 100 === 0 ? 0 : 2,
  })
}

export function dataHora(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
