// Mapa corporal (spec §3.2 G / §3.3): silhueta SVG simples frente/verso com
// as 12 zonas de MAPA_ZONAS tocáveis. Zona marcada pinta de cinnabar; no
// checkpoint, as zonas do dia 1 aparecem em contorno dourado. Abaixo do
// desenho, as mesmas 12 zonas em chips de palavra — cor nunca é o único sinal.

import type { KeyboardEvent as TeclaEvento } from 'react'
import { MAPA_ZONAS } from '../../lib/protocolos'
import { listar, NOME_ZONA } from './tiposSessao'

type Props = {
  zonas: string[]
  aoMudar: (zonas: string[]) => void
  /** contorno dourado de comparação (zonas do dia 1, no checkpoint) */
  zonasDia1?: string[]
}

type Forma =
  | { tipo: 'circulo'; cx: number; cy: number; r: number }
  | { tipo: 'rect'; x: number; y: number; w: number; h: number; rx: number }

// FRENTE (figura da esquerda): a paciente de frente — o lado direito DELA
// fica à esquerda de quem olha. COSTAS (figura da direita): direito = direita.
const FORMAS: Record<string, Forma> = {
  cabeca: { tipo: 'circulo', cx: 140, cy: 56, r: 32 },
  ombro_direito: { tipo: 'circulo', cx: 94, cy: 110, r: 27 },
  ombro_esquerdo: { tipo: 'circulo', cx: 186, cy: 110, r: 27 },
  braco_direito: { tipo: 'rect', x: 62, y: 140, w: 40, h: 86, rx: 20 },
  braco_esquerdo: { tipo: 'rect', x: 178, y: 140, w: 40, h: 86, rx: 20 },
  quadril: { tipo: 'rect', x: 100, y: 232, w: 80, h: 46, rx: 20 },
  joelho_direito: { tipo: 'circulo', cx: 116, cy: 336, r: 26 },
  joelho_esquerdo: { tipo: 'circulo', cx: 164, cy: 336, r: 26 },
  pes: { tipo: 'rect', x: 94, y: 396, w: 92, h: 40, rx: 16 },
  cervical: { tipo: 'rect', x: 352, y: 86, w: 56, h: 36, rx: 14 },
  lombar_esquerda: { tipo: 'rect', x: 344, y: 186, w: 36, h: 52, rx: 12 },
  lombar_direita: { tipo: 'rect', x: 382, y: 186, w: 36, h: 52, rx: 12 },
}

function Silhueta({ cx }: { cx: number }) {
  const cor = 'rgba(31,27,22,0.18)'
  return (
    <g stroke={cor} strokeWidth={2} fill="rgba(31,27,22,0.035)">
      <circle cx={cx} cy={56} r={24} />
      <rect x={cx - 40} y={88} width={80} height={150} rx={26} />
      <rect x={cx - 66} y={96} width={22} height={120} rx={11} />
      <rect x={cx + 44} y={96} width={22} height={120} rx={11} />
      <rect x={cx - 34} y={240} width={26} height={158} rx={13} />
      <rect x={cx + 8} y={240} width={26} height={158} rx={13} />
    </g>
  )
}

export default function MapaCorporal({ zonas, aoMudar, zonasDia1 = [] }: Props) {
  function alternar(zona: string) {
    aoMudar(zonas.includes(zona) ? zonas.filter((z) => z !== zona) : [...zonas, zona])
  }

  function estiloZona(zona: string) {
    const marcada = zonas.includes(zona)
    const dia1 = zonasDia1.includes(zona)
    return {
      fill: marcada ? 'var(--cinnabar)' : 'rgba(31,27,22,0.07)',
      fillOpacity: marcada ? 0.9 : 1,
      stroke: dia1 ? 'var(--gold)' : 'rgba(31,27,22,0.25)',
      strokeWidth: dia1 ? 3.5 : 1.5,
      strokeDasharray: dia1 ? '7 5' : undefined,
      cursor: 'pointer',
    }
  }

  return (
    <div className="stack">
      <div style={{ overflowX: 'auto' }}>
        <svg
          viewBox="0 0 520 460"
          style={{ width: '100%', maxWidth: 560, display: 'block', margin: '0 auto' }}
          role="group"
          aria-label="Mapa corporal — toque nas zonas doloridas"
        >
          <Silhueta cx={140} />
          <Silhueta cx={380} />
          <text x={140} y={452} textAnchor="middle" fontSize={15} fill="#5c554b" fontWeight={600}>
            FRENTE
          </text>
          <text x={380} y={452} textAnchor="middle" fontSize={15} fill="#5c554b" fontWeight={600}>
            COSTAS
          </text>

          {MAPA_ZONAS.map((zona) => {
            const f = FORMAS[zona]
            if (!f) return null
            const comum = {
              role: 'button' as const,
              tabIndex: 0,
              'aria-pressed': zonas.includes(zona),
              'aria-label': NOME_ZONA[zona] ?? zona,
              onClick: () => alternar(zona),
              onKeyDown: (e: TeclaEvento) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  alternar(zona)
                }
              },
              style: estiloZona(zona),
            }
            return f.tipo === 'circulo' ? (
              <circle key={zona} cx={f.cx} cy={f.cy} r={f.r} {...comum}>
                <title>{NOME_ZONA[zona] ?? zona}</title>
              </circle>
            ) : (
              <rect key={zona} x={f.x} y={f.y} width={f.w} height={f.h} rx={f.rx} {...comum}>
                <title>{NOME_ZONA[zona] ?? zona}</title>
              </rect>
            )
          })}
        </svg>
      </div>

      <div className="choice-row">
        {MAPA_ZONAS.map((zona) => (
          <button
            key={zona}
            type="button"
            className="choice"
            data-selected={zonas.includes(zona)}
            style={
              zonas.includes(zona)
                ? { background: 'var(--cinnabar)', borderColor: 'var(--cinnabar)', color: '#fff' }
                : zonasDia1.includes(zona)
                  ? { borderColor: 'var(--gold)', borderStyle: 'dashed' }
                  : undefined
            }
            onClick={() => alternar(zona)}
          >
            {NOME_ZONA[zona] ?? zona}
          </button>
        ))}
      </div>

      <p className="muted" aria-live="polite">
        {zonas.length > 0
          ? `Doloridas hoje: ${listar(zonas.map((z) => NOME_ZONA[z] ?? z))}.`
          : 'Nenhuma zona marcada ainda.'}
        {zonasDia1.length > 0 &&
          ` No dia 1 (contorno dourado): ${listar(zonasDia1.map((z) => NOME_ZONA[z] ?? z))}.`}
      </p>
    </div>
  )
}
