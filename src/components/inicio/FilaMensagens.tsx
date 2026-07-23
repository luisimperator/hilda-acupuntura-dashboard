// MENSAGENS DE HOJE (spec §1.1 e §5) — a fila de WhatsApp de 1 toque, derivada
// da view v_mensagens_hoje. Nada para lembrar, nada para dar baixa.
// Cada linha usa o BotaoWhatsApp (envio otimista + Desfazer 10s).

import { useState } from 'react'
import { TITULO_TEMPLATE } from '../../lib/mensagens'
import { nomeCurto } from '../../lib/tipos'
import BotaoWhatsApp from '../whatsapp/BotaoWhatsApp'
import type { MensagemPronta } from './dadosInicio'

export default function FilaMensagens({ mensagens }: { mensagens: MensagemPronta[] }) {
  const [enviadas, setEnviadas] = useState<ReadonlySet<string>>(new Set())

  if (mensagens.length === 0) {
    return (
      <section>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          ✉ Mensagens de hoje
        </div>
        <p className="muted">Nenhuma mensagem pendente. Tudo em dia ✓</p>
      </section>
    )
  }

  return (
    <section>
      <div className="eyebrow" style={{ marginBottom: 12 }}>
        ✉ Mensagens de hoje ({mensagens.length})
      </div>
      <div className="touch-list">
        {mensagens.map((m) => {
          const enviada = enviadas.has(m.chave)
          return (
            <div key={m.chave} className="touch-item" style={{ cursor: 'default' }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong>{TITULO_TEMPLATE[m.template]}</strong> — {nomeCurto(m.paciente)}
                {m.contexto && (
                  <span className="small muted" style={{ display: 'block' }}>
                    {m.contexto}
                  </span>
                )}
                {enviada && (
                  <span className="pill pill-jade" style={{ marginTop: 6 }}>
                    Enviada ✓
                  </span>
                )}
              </span>
              <BotaoWhatsApp
                pacienteId={m.paciente.id}
                telefone={m.paciente.telefone_wa}
                template={m.template}
                dados={m.dados}
                refs={m.refs}
                rotulo={enviada ? 'Reabrir' : 'Enviar'}
                aoEnviar={() => setEnviadas((s) => new Set(s).add(m.chave))}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
