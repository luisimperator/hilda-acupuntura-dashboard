// Modo Sessão (spec §3) — tipos, trilhos de passos e utilitários
// compartilhados pelos passos do wizard. Tudo local deste diretório.

import type { TablesUpdate } from '../../lib/database.types'
import type { Agendamento, Avaliacao, Ciclo, Config, Paciente, Proposta, RedFlags, Sessao } from '../../lib/tipos'
import type { VarianteSessao } from '../../lib/sessaoService'

/**
 * Rascunho local (localStorage) do que ainda não tem coluna em `sessoes`:
 * mapa corporal, frases e frequência viram linha de `avaliacoes` quando a
 * EVA correspondente é confirmada. Nada se perde se o app fechar no meio.
 */
export type Rascunho = {
  mapaZonas: string[]
  frases: string[]
  freq: number | null
  programa: 'reset_10' | 'alivio_5'
  pagamento450: boolean
}

export const RASCUNHO_VAZIO: Rascunho = {
  mapaZonas: [],
  frases: [],
  freq: null,
  programa: 'reset_10',
  pagamento450: false,
}

export type CtxSessao = {
  sessao: Sessao
  paciente: Paciente
  ciclo: Ciclo | null
  config: Config | null
  agendamento: Agendamento | null
  variante: VarianteSessao
  /** Sessão já concluída reaberta pela ficha ("corrigir esta sessão") */
  correcao: boolean
  numeroDaSessao: number | null
  ultimaSessao: Sessao | null
  sessoesConcluidas: Sessao[]
  avaliacaoInicial: Avaliacao | null
  avaliacaoCheckpoint: Avaliacao | null
  redFlagDaSessao: RedFlags | null
  propostaDaSessao: Proposta | null
  pagamento450Feito: boolean
  rascunho: Rascunho
  mudarRascunho: (parte: Partial<Rascunho>) => void
  atualizarSessao: (campos: TablesUpdate<'sessoes'>) => void
  atualizarPaciente: (campos: TablesUpdate<'pacientes'>) => void
  definirCheckpoint: (a: Avaliacao) => void
  definirRedFlag: (r: RedFlags) => void
  definirCiclo: (c: Ciclo) => void
  definirProposta: (p: Proposta) => void
  avancar: () => void
  voltar: () => void
  irPara: (passo: string) => void
}

/** O trilho de cada variante — a Hilda nunca escolhe, o app decide (spec §3). */
export function passosDe(variante: VarianteSessao, correcao: boolean): string[] {
  if (correcao) {
    return ['eva_pre', 'destravamento', 'pontos', 'complementos', 'agulhas', 'eva_pos', 'intercorrencia', 'orientacao', 'fim']
  }
  if (variante === 'primeira') {
    return [
      'capa', 'termo', 'condicao', 'historia', 'red_flags', 'cautelas', 'mapa', 'frases', 'frequencia',
      'eva_pre', 'destravamento', 'pontos', 'complementos', 'agulhas', 'eva_pos',
      'prescricao', 'desfecho', 'pagamento', 'fim',
    ]
  }
  if (variante === 'checkpoint') {
    return [
      'capa', 'eva_pre', 'mapa', 'frases', 'frequencia', 'veredito',
      'destravamento', 'pontos', 'complementos', 'agulhas', 'eva_pos',
      'intercorrencia', 'orientacao', 'proxima', 'fim',
    ]
  }
  return ['capa', 'eva_pre', 'destravamento', 'pontos', 'complementos', 'agulhas', 'eva_pos', 'intercorrencia', 'orientacao', 'proxima', 'fim']
}

export const ROTULO_PASSO: Record<string, string> = {
  capa: 'Capa',
  termo: 'Termo de consentimento',
  condicao: 'Condição',
  historia: 'História essencial',
  red_flags: 'Antes da primeira agulha',
  cautelas: 'Cautelas',
  mapa: 'Mapa corporal',
  frases: 'As frases dela',
  frequencia: 'Frequência da dor',
  eva_pre: 'Dor de chegada',
  veredito: 'Evolução',
  destravamento: 'Massagem preparatória',
  pontos: 'Pontos',
  complementos: 'Complementos',
  agulhas: 'Agulhas e retenção',
  eva_pos: 'Dor de saída',
  intercorrencia: 'Correu tudo bem?',
  orientacao: 'Orientação de casa',
  prescricao: 'A prescrição',
  desfecho: 'O que ficou combinado',
  pagamento: 'Pagamento de hoje',
  proxima: 'Próxima sessão',
  fim: 'Fim',
}

/** Menor queda que satisfaz o critério (cair 2 pontos OU 30%) → meta em número. */
export function metaDaGarantia(evaBase: number): number {
  return Math.max(0, evaBase - Math.min(2, Math.ceil(evaBase * 0.3)))
}

export const NOME_ZONA: Record<string, string> = {
  cabeca: 'cabeça',
  cervical: 'cervical / pescoço',
  ombro_direito: 'ombro direito',
  ombro_esquerdo: 'ombro esquerdo',
  braco_direito: 'braço direito',
  braco_esquerdo: 'braço esquerdo',
  lombar_direita: 'lombar direita',
  lombar_esquerda: 'lombar esquerda',
  quadril: 'quadril / glúteo',
  joelho_direito: 'joelho direito',
  joelho_esquerdo: 'joelho esquerdo',
  pes: 'pés',
}

export const FREQ_OPCOES: { rotulo: string; valor: number }[] = [
  { rotulo: 'todos os dias', valor: 7 },
  { rotulo: '4 a 6 vezes na semana', valor: 5 },
  { rotulo: '2 a 3 vezes na semana', valor: 3 },
  { rotulo: '1 vez na semana', valor: 1 },
  { rotulo: 'menos que isso', valor: 0 },
]

export function rotuloFreq(valor: number | null | undefined): string {
  if (valor == null) return 'não anotada'
  if (valor >= 7) return 'todos os dias'
  if (valor >= 4) return '4 a 6 vezes na semana'
  if (valor >= 2) return '2 a 3 vezes na semana'
  if (valor >= 1) return '1 vez na semana'
  return 'menos de 1 vez na semana'
}

/** "quadrado lombar, glúteo e perna" */
export function listar(coisas: string[]): string {
  if (coisas.length <= 1) return coisas.join('')
  return `${coisas.slice(0, -1).join(', ')} e ${coisas[coisas.length - 1]}`
}

/** impede_frases (jsonb) → string[] com segurança */
export function frasesDaAvaliacao(a: Avaliacao | null): string[] {
  if (!a) return []
  const j = a.impede_frases
  return Array.isArray(j) ? j.filter((f): f is string => typeof f === 'string' && f.trim() !== '') : []
}

/** Aviso sonoro suave do cronômetro (WebAudio, dois toques baixos). */
export function tocarAvisoSuave(): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()
    const nota = (freq: number, quando: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + quando)
      gain.gain.linearRampToValueAtTime(0.07, ctx.currentTime + quando + 0.05)
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + quando + 0.6)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + quando)
      osc.stop(ctx.currentTime + quando + 0.7)
    }
    nota(660, 0)
    nota(880, 0.7)
    window.setTimeout(() => void ctx.close(), 1800)
  } catch {
    // sem som, sem drama — o mostrador visual continua lá
  }
}
