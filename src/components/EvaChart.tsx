import { useState } from 'react'

export type PontoEva = {
  sessao: number
  pre: number | null
  pos: number | null
}

// Cores de gráfico validadas para daltonismo sobre o fundo #FFFDF9
// (tokens --chart-pre / --chart-pos do design system).
const COR_PRE = '#cc5530'
const COR_POS = '#0e9060'

const W = 640
const H = 260
const PAD = { top: 18, right: 64, bottom: 34, left: 34 }

// Evolução da EVA por sessão: linha "antes" e linha "depois", eixo fixo 0–10.
// A lista de sessões logo abaixo do gráfico funciona como a visão em tabela.
export default function EvaChart({ pontos }: { pontos: PontoEva[] }) {
  const [hover, setHover] = useState<number | null>(null)

  const dados = pontos.filter((p) => p.pre != null || p.pos != null)
  if (dados.length === 0) {
    return <p className="muted">Ainda não há sessões registradas para desenhar a evolução.</p>
  }

  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const n = dados.length
  const x = (i: number) => PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (v: number) => PAD.top + innerH - (v / 10) * innerH

  const linha = (chave: 'pre' | 'pos') =>
    dados
      .map((p, i) => (p[chave] == null ? null : `${x(i)},${y(p[chave]!)}`))
      .filter(Boolean)
      .join(' ')

  const ultimo = dados[n - 1]
  const hoverP = hover != null ? dados[hover] : null

  return (
    <div className="stack" style={{ position: 'relative' }}>
      <div className="row" style={{ gap: 20, flexWrap: 'wrap' }} aria-hidden="true">
        <span className="row" style={{ gap: 8, fontSize: 15.5, fontWeight: 600 }}>
          <span style={{ width: 14, height: 14, borderRadius: 4, background: COR_PRE, display: 'inline-block' }} />
          Dor antes da sessão
        </span>
        <span className="row" style={{ gap: 8, fontSize: 15.5, fontWeight: 600 }}>
          <span style={{ width: 14, height: 14, borderRadius: 4, background: COR_POS, display: 'inline-block' }} />
          Dor depois da sessão
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', minWidth: 320, display: 'block' }}
          role="img"
          aria-label={`Evolução da dor em ${n} sessões. Última sessão: antes ${ultimo.pre ?? '—'}, depois ${ultimo.pos ?? '—'}.`}
          onMouseLeave={() => setHover(null)}
        >
          {[0, 5, 10].map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(v)}
                y2={y(v)}
                stroke="rgba(31,27,22,0.10)"
                strokeWidth={1}
              />
              <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize={12} fill="#94897a">
                {v}
              </text>
            </g>
          ))}

          {hover != null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="rgba(31,27,22,0.22)"
              strokeWidth={1}
            />
          )}

          <polyline points={linha('pre')} fill="none" stroke={COR_PRE} strokeWidth={2} strokeLinejoin="round" />
          <polyline points={linha('pos')} fill="none" stroke={COR_POS} strokeWidth={2} strokeLinejoin="round" />

          {dados.map((p, i) => (
            <g key={p.sessao}>
              {p.pre != null && (
                <circle cx={x(i)} cy={y(p.pre)} r={4.5} fill={COR_PRE} stroke="#fffdf9" strokeWidth={2} />
              )}
              {p.pos != null && (
                <circle cx={x(i)} cy={y(p.pos)} r={4.5} fill={COR_POS} stroke="#fffdf9" strokeWidth={2} />
              )}
              <text x={x(i)} y={H - PAD.bottom + 20} textAnchor="middle" fontSize={12} fill="#5c554b">
                {p.sessao}
              </text>
              <rect
                x={x(i) - (n === 1 ? innerW / 2 : innerW / (n - 1) / 2)}
                y={PAD.top}
                width={n === 1 ? innerW : innerW / (n - 1)}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onTouchStart={() => setHover(i)}
              />
            </g>
          ))}

          {ultimo.pre != null && (
            <text x={W - PAD.right + 10} y={y(ultimo.pre) + 4} fontSize={13} fontWeight={600} fill="#1f1b16">
              {ultimo.pre} antes
            </text>
          )}
          {ultimo.pos != null && (
            <text x={W - PAD.right + 10} y={y(ultimo.pos) + 4} fontSize={13} fontWeight={600} fill="#1f1b16">
              {ultimo.pos} depois
            </text>
          )}

          <text x={PAD.left} y={H - 6} fontSize={12} fill="#94897a">
            sessão
          </text>
        </svg>
      </div>

      {hoverP && (
        <p className="mono small" style={{ textAlign: 'center', color: 'var(--ink-60)' }}>
          Sessão {hoverP.sessao}: antes {hoverP.pre ?? '—'}/10 · depois {hoverP.pos ?? '—'}/10
        </p>
      )}
    </div>
  )
}
