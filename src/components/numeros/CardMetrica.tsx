import type { ReactNode } from 'react'

// Card de métrica dos Números: número Gloock grande + rótulo + nota.
// Cor nunca é o único sinal — o selo sempre traz a palavra junto.
export default function CardMetrica({
  rotulo,
  valor,
  selo,
  nota,
}: {
  rotulo: string
  /** O número grande (já formatado) */
  valor: string
  /** Selo de meta/estado — sempre com palavra ("meta 50% · batida ✓") */
  selo?: { texto: string; tom: 'jade' | 'gold' | 'sand' } | null
  /** Nota de rodapé (ex.: "devoluções de garantia entram negativas") */
  nota?: ReactNode
}) {
  return (
    <div className="card-flat" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span className="eyebrow" style={{ color: 'var(--ink-60)' }}>
        {rotulo}
      </span>
      <span className="num-display" style={{ fontSize: 'clamp(30px, 3.6vw, 42px)' }}>
        {valor}
      </span>
      {selo && <span className={`pill pill-${selo.tom}`}>{selo.texto}</span>}
      {nota != null && (
        <span className="small" style={{ color: 'var(--ink-60)', lineHeight: 1.45 }}>
          {nota}
        </span>
      )}
    </div>
  )
}
