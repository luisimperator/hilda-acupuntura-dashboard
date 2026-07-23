import type { Condicao } from './tipos'

// Protocolos-base N.01–N.05 (protocolo de atendimento, seção 6).
// A Hilda adapta pelo diagnóstico de cada caso — isto são os defaults.

export type Ponto = { codigo: string; nome?: string }

export type ProtocoloBase = {
  condicao: Condicao
  titulo: string
  base: Ponto[]
  extras: { rotulo: string; pontos: Ponto[] }[]
  regulacao: Ponto[]
  destravTipico: string[]
  orientacoesTipicas: string[]
  auriculoTipico: string[]
}

export const REGIOES_DESTRAV = [
  'trapézio superior',
  'cervical',
  'quadrado lombar',
  'glúteo',
  'ombro',
  'perna',
  'braço',
  'outra',
] as const

export const ORIENTACOES_CASA = [
  'beber bastante água',
  'sementinhas: apertar 3x/dia',
  'compressa morna/calor local',
  'alongamento que ensinei',
  'evitar esforço hoje',
  'caminhada leve',
  'pode dormir mais pesado',
] as const

export const INTERCORRENCIAS = ['tontura', 'sangramento pontual', 'hematoma', 'outra'] as const

export const PONTOS_CONTRAINDICADOS_GESTACAO = ['LI4', 'SP6', 'BL60', 'BL67'] as const

const REGULACAO: Ponto[] = [
  { codigo: 'HT7', nome: 'Shenmen' },
  { codigo: 'PC6', nome: 'Neiguan' },
  { codigo: 'Yintang' },
  { codigo: 'GV20', nome: 'Baihui' },
]

export const PROTOCOLOS: Record<Condicao, ProtocoloBase> = {
  lombalgia: {
    condicao: 'lombalgia',
    titulo: 'N.01 — Lombalgia (± ciática)',
    base: [
      { codigo: 'BL23', nome: 'Shenshu' },
      { codigo: 'BL25', nome: 'Dachangshu' },
      { codigo: 'GV3', nome: 'Yaoyangguan' },
      { codigo: 'ashi', nome: 'pontos ashi lombares' },
      { codigo: 'BL40', nome: 'Weizhong' },
      { codigo: 'BL60', nome: 'Kunlun' },
    ],
    extras: [
      {
        rotulo: '+ ciática',
        pontos: [
          { codigo: 'GB30', nome: 'Huantiao' },
          { codigo: 'GB34', nome: 'Yanglingquan' },
          { codigo: 'BL57', nome: 'Chengshan' },
        ],
      },
    ],
    regulacao: REGULACAO,
    destravTipico: ['quadrado lombar', 'glúteo'],
    orientacoesTipicas: ['compressa morna/calor local', 'caminhada leve'],
    auriculoTipico: ['shenmen', 'subcórtex', 'lombar'],
  },
  cervical_ombros: {
    condicao: 'cervical_ombros',
    titulo: 'N.02 — Cervicalgia & ombros',
    base: [
      { codigo: 'GB20', nome: 'Fengchi' },
      { codigo: 'GB21', nome: 'Jianjing' },
      { codigo: 'SI3', nome: 'Houxi' },
      { codigo: 'BL62', nome: 'Shenmai' },
      { codigo: 'LI4', nome: 'Hegu' },
      { codigo: 'ashi', nome: 'trapézio e elevador' },
      { codigo: 'Bailao' },
    ],
    extras: [],
    regulacao: REGULACAO,
    destravTipico: ['trapézio superior', 'cervical'],
    orientacoesTipicas: ['alongamento que ensinei', 'evitar esforço hoje'],
    auriculoTipico: ['shenmen', 'subcórtex', 'cervical'],
  },
  enxaqueca: {
    condicao: 'enxaqueca',
    titulo: 'N.03 — Enxaqueca & cefaleia tensional',
    base: [
      { codigo: 'GB20', nome: 'Fengchi' },
      { codigo: 'Taiyang' },
      { codigo: 'LV3', nome: 'Taichong' },
      { codigo: 'LI4', nome: 'Hegu' },
      { codigo: 'GB8', nome: 'Shuaigu' },
      { codigo: 'Yintang' },
      { codigo: 'GV20', nome: 'Baihui' },
    ],
    extras: [],
    regulacao: REGULACAO,
    destravTipico: ['cervical', 'trapézio superior'],
    orientacoesTipicas: ['beber bastante água', 'sementinhas: apertar 3x/dia'],
    auriculoTipico: ['shenmen', 'subcórtex', 'cabeça'],
  },
  joelho: {
    condicao: 'joelho',
    titulo: 'N.04 — Joelho & articulações',
    base: [
      { codigo: 'Xiyan', nome: 'olhos do joelho' },
      { codigo: 'ST36', nome: 'Zusanli' },
      { codigo: 'SP9', nome: 'Yinlingquan' },
      { codigo: 'SP10', nome: 'Xuehai' },
      { codigo: 'GB34', nome: 'Yanglingquan' },
      { codigo: 'ashi', nome: 'periarticulares' },
    ],
    extras: [],
    regulacao: REGULACAO,
    destravTipico: ['perna'],
    orientacoesTipicas: ['caminhada leve', 'compressa morna/calor local'],
    auriculoTipico: ['shenmen', 'subcórtex', 'joelho'],
  },
  estresse_sono: {
    condicao: 'estresse_sono',
    titulo: 'N.05 — Dor amplificada por estresse / sono',
    base: [
      { codigo: 'HT7', nome: 'Shenmen' },
      { codigo: 'PC6', nome: 'Neiguan' },
      { codigo: 'Yintang' },
      { codigo: 'GV20', nome: 'Baihui' },
      { codigo: 'Anmian' },
    ],
    extras: [],
    regulacao: [],
    destravTipico: ['trapézio superior'],
    orientacoesTipicas: ['pode dormir mais pesado', 'sementinhas: apertar 3x/dia'],
    auriculoTipico: ['shenmen', 'coração', 'subcórtex'],
  },
  outra: {
    condicao: 'outra',
    titulo: 'Outra condição',
    base: [],
    extras: [],
    regulacao: REGULACAO,
    destravTipico: [],
    orientacoesTipicas: ['beber bastante água'],
    auriculoTipico: ['shenmen', 'subcórtex'],
  },
}

// Os 8 itens do checklist de red flags (protocolo §4), na ordem da tela.
export const RED_FLAGS_ITENS = [
  { chave: 'trauma_recente', pergunta: 'Queda ou acidente recente sem exame?' },
  { chave: 'deficit_neuro', pergunta: 'Perda de força, formigamento que avança, pé caído?' },
  { chave: 'cauda_equina', pergunta: 'Alteração de xixi/intestino junto com dor lombar?' },
  { chave: 'febre_coluna', pergunta: 'Febre junto com dor na coluna?' },
  { chave: 'perda_peso', pergunta: 'Perda de peso sem explicação + dor nova?' },
  { chave: 'dor_noturna', pergunta: 'Dor noturna intensa que não alivia?' },
  { chave: 'historico_onco', pergunta: 'Histórico de câncer + dor de padrão diferente?' },
  { chave: 'fratura_infeccao', pergunta: 'Suspeita de fratura ou joelho quente e inchado?' },
] as const

// Zonas do mapa corporal (12 zonas tocáveis)
export const MAPA_ZONAS = [
  'cabeca',
  'cervical',
  'ombro_direito',
  'ombro_esquerdo',
  'braco_direito',
  'braco_esquerdo',
  'lombar_direita',
  'lombar_esquerda',
  'quadril',
  'joelho_direito',
  'joelho_esquerdo',
  'pes',
] as const
