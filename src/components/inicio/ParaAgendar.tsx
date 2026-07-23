// PARA AGENDAR (spec §1.1) — cartão gold colapsado em uma linha.
// Leads com o script 2.1 armado (2 vagas livres reais já na mensagem) e
// propostas "pensando" com a contagem regressiva do crédito.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { dataISO, diaPorExtenso, dinheiro, ehHoje } from '../../lib/datas'
import { nomeCurto } from '../../lib/tipos'
import type { Paciente } from '../../lib/tipos'
import type { Vaga } from '../../lib/mensagens'
import BotaoWhatsApp from '../whatsapp/BotaoWhatsApp'
import { meioDia, textoDecisor, type PropostaPendente } from './dadosInicio'

function quandoChegou(iso: string): string {
  if (ehHoje(iso)) return 'hoje'
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (dias <= 1) return 'ontem'
  return `há ${dias} dias`
}

function prazoCredito(expira: string | null): string | null {
  if (!expira) return null
  const dias = Math.round(
    (Date.parse(meioDia(expira)) - Date.parse(meioDia(dataISO(new Date())))) / 86_400_000,
  )
  if (dias < 0) return `o crédito venceu em ${diaPorExtenso(meioDia(expira))}`
  if (dias === 0) return 'o crédito vence HOJE'
  if (dias === 1) return `o crédito vale até amanhã, ${diaPorExtenso(meioDia(expira))}`
  return `o crédito vale até ${diaPorExtenso(meioDia(expira))} — faltam ${dias} dias`
}

type Props = {
  leads: Paciente[]
  propostas: PropostaPendente[]
  vagas: Vaga[]
  creditoCentavos: number
}

export default function ParaAgendar({ leads, propostas, vagas, creditoCentavos }: Props) {
  const [aberto, setAberto] = useState(false)
  const total = leads.length + propostas.length
  if (total === 0) return null

  const credito = dinheiro(creditoCentavos)
  const primeiro = leads[0]
    ? `${nomeCurto(leads[0])}${leads[0].eva_landing != null ? `, dor ${leads[0].eva_landing}/10` : ''}`
    : propostas[0]
      ? `${nomeCurto(propostas[0].paciente)} pensando na proposta`
      : ''

  return (
    <section>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="row-between"
        style={{
          width: '100%',
          minHeight: 64,
          background: 'var(--gold-soft)',
          border: '1.5px solid var(--gold)',
          borderRadius: 'var(--r)',
          padding: '14px 20px',
          textAlign: 'left',
          fontSize: 18,
        }}
      >
        <span>
          📥 <strong>PARA AGENDAR ({total})</strong>
          {!aberto && primeiro ? <span className="muted"> — {primeiro}</span> : null}
        </span>
        <span aria-hidden="true" style={{ fontSize: 22 }}>
          {aberto ? '▴' : '›'}
        </span>
      </button>

      {aberto && (
        <div className="stack" style={{ marginTop: 12 }}>
          {leads.map((p) => (
            <div key={p.id} className="card-flat" style={{ borderColor: 'var(--gold)' }}>
              <div className="row-between" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div>
                  <span className="pill pill-gold">Lead novo</span>
                  <strong style={{ display: 'block', fontSize: 20, marginTop: 6 }}>{p.nome}</strong>
                  <span className="small muted" style={{ display: 'block', marginTop: 2 }}>
                    {p.eva_landing != null ? `mandou dor ${p.eva_landing}/10` : 'sem nota de dor'} ·
                    chegou {quandoChegou(p.criado_em)}
                  </span>
                </div>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <BotaoWhatsApp
                    pacienteId={p.id}
                    telefone={p.telefone_wa}
                    template="resposta_lead"
                    dados={{ nome: p.nome, tratamento: p.tratamento, nota: p.eva_landing, vagas }}
                    rotulo="Responder agora"
                  />
                  <Link to={`/paciente/${p.id}`} className="btn btn-ghost">
                    ver ficha ›
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {propostas.map(({ proposta, paciente, evaPre, evaPos }) => {
            const prazo = prazoCredito(proposta.credito_expira)
            return (
              <div key={proposta.id} className="card-flat" style={{ borderColor: 'var(--gold)' }}>
                <div className="row-between" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div>
                    <span className="pill pill-gold">crédito de {credito}</span>
                    <strong style={{ display: 'block', fontSize: 20, marginTop: 6 }}>
                      {paciente.nome}
                    </strong>
                    <span className="small muted" style={{ display: 'block', marginTop: 2 }}>
                      Pensando na proposta{prazo ? ` — ${prazo}` : ''}
                    </span>
                  </div>
                  <div className="row" style={{ flexWrap: 'wrap' }}>
                    <BotaoWhatsApp
                      pacienteId={paciente.id}
                      telefone={paciente.telefone_wa}
                      template="retorno_48h"
                      dados={{
                        nome: paciente.nome,
                        tratamento: paciente.tratamento,
                        evaPre,
                        evaPos,
                        dataCredito: proposta.credito_expira ? meioDia(proposta.credito_expira) : null,
                        decisor: textoDecisor(paciente),
                        vagas,
                      }}
                      refs={{ propostaId: proposta.id, sessaoId: proposta.sessao_id }}
                      rotulo="Mandar o retorno"
                    />
                    <Link to={`/paciente/${paciente.id}`} className="btn btn-ghost">
                      ver ficha ›
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
