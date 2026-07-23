type Props = {
  valor: number | null
  aoEscolher: (valor: number) => void
  rotulo?: string
}

const PALAVRAS = [
  'sem dor',
  'muito leve',
  'leve',
  'leve a moderada',
  'moderada',
  'moderada',
  'moderada a forte',
  'forte',
  'muito forte',
  'quase insuportável',
  'a pior possível',
]

// Escala EVA 0–10 em botões grandes: a Hilda toca no número que a paciente falar.
export default function EvaScale({ valor, aoEscolher, rotulo }: Props) {
  return (
    <div className="stack" role="group" aria-label={rotulo ?? 'Escala de dor de 0 a 10'}>
      {rotulo && <p style={{ fontWeight: 600, fontSize: 20 }}>{rotulo}</p>}
      <div className="eva-grid">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            className={`eva-btn${n >= 7 ? ' eva-alta' : ''}`}
            data-selected={valor === n}
            aria-pressed={valor === n}
            onClick={() => aoEscolher(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="muted" style={{ minHeight: 24, fontStyle: 'italic' }}>
        {valor != null ? `${valor}/10 — ${PALAVRAS[valor]}` : 'Toque no número que a paciente falar'}
      </p>
    </div>
  )
}
