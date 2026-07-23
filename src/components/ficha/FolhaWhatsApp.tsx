import type { CSSProperties } from 'react'
import BotaoWhatsApp from '../whatsapp/BotaoWhatsApp'
import { montarMensagem, TITULO_TEMPLATE, type DadosMensagem } from '../../lib/mensagens'
import { nomeCurto, type Paciente, type WaTemplate } from '../../lib/tipos'

export type OpcaoMensagem = {
  template: WaTemplate
  dados: DadosMensagem
  refs?: {
    agendamentoId?: string | null
    sessaoId?: string | null
    cicloId?: string | null
    propostaId?: string | null
  }
}

type Props = {
  paciente: Paciente
  /** Templates aplicáveis ao estado da paciente + conversa livre (spec §5) */
  opcoes: OpcaoMensagem[]
  aoFechar: () => void
}

const SOBREPOSICAO: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 200,
  background: 'rgba(31, 27, 22, 0.45)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
}

const FOLHA: CSSProperties = {
  width: '100%',
  maxWidth: 680,
  maxHeight: '88dvh',
  overflowY: 'auto',
  borderRadius: '22px 22px 0 0',
}

// A folha de WhatsApp da ficha: cada opção mostra o texto pronto (a Hilda
// nunca digita mensagem) e envia via BotaoWhatsApp (otimista + Desfazer 10s).
export default function FolhaWhatsApp({ paciente, opcoes, aoFechar }: Props) {
  const temTelefone = !!paciente.telefone_wa?.trim()

  return (
    <div style={SOBREPOSICAO} role="dialog" aria-label={`Mensagens de WhatsApp para ${nomeCurto(paciente)}`} onClick={aoFechar}>
      <div className="card stack" style={FOLHA} onClick={(e) => e.stopPropagation()}>
        <h2>WhatsApp — {nomeCurto(paciente)}</h2>

        {!temTelefone && (
          <p className="muted">
            Ainda não tenho o WhatsApp de {nomeCurto(paciente)} anotado. Complete o cadastro para as mensagens
            saírem prontas daqui.
          </p>
        )}

        {temTelefone &&
          opcoes.map((op, i) => {
            const corpo = op.template === 'livre' ? '' : montarMensagem(op.template, op.dados)
            return (
              <div key={`${op.template}-${i}`} className="card-flat stack" style={{ padding: 16 }}>
                <strong style={{ fontSize: 18 }}>{TITULO_TEMPLATE[op.template]}</strong>
                {corpo && (
                  <p className="small muted" style={{ whiteSpace: 'pre-wrap' }}>
                    {corpo}
                  </p>
                )}
                <BotaoWhatsApp
                  pacienteId={paciente.id}
                  telefone={paciente.telefone_wa}
                  template={op.template}
                  dados={op.dados}
                  refs={op.refs}
                  rotulo={op.template === 'livre' ? 'Abrir conversa livre' : 'Mandar esta mensagem'}
                  className="btn btn-whatsapp btn-block"
                />
              </div>
            )
          })}

        <button type="button" className="btn btn-ghost btn-block" onClick={aoFechar}>
          Voltar para a ficha
        </button>
      </div>
    </div>
  )
}
