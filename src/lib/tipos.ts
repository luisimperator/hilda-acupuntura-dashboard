import type { Tables, Enums } from './database.types'

export type Paciente = Tables<'pacientes'>
export type Ciclo = Tables<'ciclos'>
export type Agendamento = Tables<'agendamentos'>
export type Sessao = Tables<'sessoes'>
export type Avaliacao = Tables<'avaliacoes'>
export type RedFlags = Tables<'red_flags'>
export type Proposta = Tables<'propostas'>
export type Pagamento = Tables<'pagamentos'>
export type MensagemWa = Tables<'mensagens_wa'>
export type Config = Tables<'config'>
export type MensagemHoje = Tables<'v_mensagens_hoje'>

export type Condicao = Enums<'condicao_t'>
export type Programa = Enums<'programa_t'>
export type WaTemplate = Enums<'wa_template_t'>
export type ProximaFase = Enums<'proxima_fase_t'>
export type Objecao = Enums<'objecao_t'>
export type PacienteStatus = Enums<'paciente_status_t'>

export const NOME_CONDICAO: Record<Condicao, string> = {
  lombalgia: 'Lombar / ciática',
  cervical_ombros: 'Pescoço e ombros',
  enxaqueca: 'Enxaqueca / dor de cabeça',
  joelho: 'Joelho / articulações',
  estresse_sono: 'Dor + estresse / sono',
  outra: 'Outra',
}

export const NOME_PROGRAMA: Record<Programa, string> = {
  reset_10: 'Reset',
  alivio_5: 'Alívio',
  continuidade: 'Continuidade',
  avulsa: 'Avulsa',
}

// Nome que a Hilda usa na frente da paciente (tratamento se houver, senão o primeiro nome)
export function nomeCurto(p: Pick<Paciente, 'nome' | 'tratamento'>): string {
  return p.tratamento?.trim() || p.nome.trim().split(/\s+/)[0]
}

export function selosCautela(p: Paciente): { chave: string; rotulo: string }[] {
  const selos: { chave: string; rotulo: string }[] = []
  if (p.marcapasso) selos.push({ chave: 'marcapasso', rotulo: 'SEM ELETRO: marca-passo' })
  if (p.anticoagulante) selos.push({ chave: 'anticoagulante', rotulo: 'Anticoagulante: agulhamento superficial, comprimir ao retirar' })
  if (p.gestante) selos.push({ chave: 'gestante', rotulo: 'Gestante: evitar LI4 · SP6 · BL60 · BL67' })
  if (p.diabetes_neuropatia) selos.push({ chave: 'diabetes', rotulo: 'Diabetes c/ neuropatia: atenção a pés e cicatrização' })
  if (p.medo_agulha) selos.push({ chave: 'medo_agulha', rotulo: 'Medo de agulha: protocolo reduzido' })
  return selos
}
