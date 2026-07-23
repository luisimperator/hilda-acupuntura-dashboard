import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { linkWhatsApp, montarMensagem, type DadosMensagem } from '../../lib/mensagens'
import type { WaTemplate } from '../../lib/tipos'

type Refs = {
  agendamentoId?: string | null
  sessaoId?: string | null
  cicloId?: string | null
  propostaId?: string | null
}

type Props = {
  pacienteId: string
  telefone: string | null | undefined
  template: WaTemplate
  dados: DadosMensagem
  refs?: Refs
  rotulo: string
  className?: string
  aoEnviar?: () => void
}

// Envio otimista (spec §5): grava a linha em mensagens_wa E abre o wa.me.
// Barra na base: "Desfazer — não mandei" por 10 segundos (apaga a linha).
export default function BotaoWhatsApp({
  pacienteId,
  telefone,
  template,
  dados,
  refs,
  rotulo,
  className,
  aoEnviar,
}: Props) {
  const [desfazerId, setDesfazerId] = useState<string | null>(null)
  const [segundos, setSegundos] = useState(10)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [])

  async function enviar() {
    const corpo = montarMensagem(template, dados)
    const { data } = await supabase
      .from('mensagens_wa')
      .insert({
        paciente_id: pacienteId,
        template,
        corpo: corpo || '(conversa livre)',
        agendamento_id: refs?.agendamentoId ?? null,
        sessao_id: refs?.sessaoId ?? null,
        ciclo_id: refs?.cicloId ?? null,
        proposta_id: refs?.propostaId ?? null,
      })
      .select('id')
      .single()

    window.open(linkWhatsApp(telefone, corpo), '_blank', 'noopener')

    if (data?.id) {
      setDesfazerId(data.id)
      setSegundos(10)
      timer.current = setInterval(() => {
        setSegundos((s) => {
          if (s <= 1) {
            if (timer.current) clearInterval(timer.current)
            setDesfazerId(null)
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    aoEnviar?.()
  }

  async function desfazer() {
    if (timer.current) clearInterval(timer.current)
    if (desfazerId) await supabase.from('mensagens_wa').delete().eq('id', desfazerId)
    setDesfazerId(null)
  }

  return (
    <>
      <button type="button" className={className ?? 'btn btn-whatsapp'} onClick={enviar}>
        💬 {rotulo}
      </button>
      {desfazerId && (
        <div className="toast" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span>Registrada como enviada</span>
          <button
            type="button"
            onClick={desfazer}
            style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'underline' }}
          >
            Desfazer — não mandei ({segundos})
          </button>
        </div>
      )}
    </>
  )
}
