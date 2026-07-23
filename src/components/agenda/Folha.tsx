import type { CSSProperties, ReactNode } from 'react'

// Folha deslizante da Agenda (mesmo padrão visual da FolhaWhatsApp da ficha):
// sobreposição escura, cartão ancorado embaixo, toque fora fecha.

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

type Props = {
  rotuloAria: string
  aoFechar: () => void
  children: ReactNode
}

export default function Folha({ rotuloAria, aoFechar, children }: Props) {
  return (
    <div style={SOBREPOSICAO} role="dialog" aria-label={rotuloAria} onClick={aoFechar}>
      <div className="card stack" style={FOLHA} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
