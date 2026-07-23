// Ocupação semanal (v_ocupacao_semanal) contra a capacidade da config.
// Cada semana: barra de realizadas (jade escuro) + agendadas (jade claro,
// separadas por respiro de 2px) sobre o trilho da capacidade — e os números
// sempre escritos ao lado, porque cor sozinha não informa.

import { diaMes, type OcupacaoSemana } from './dadosNumeros'

export default function OcupacaoSemanal({
  semanas,
  capacidade,
}: {
  semanas: OcupacaoSemana[]
  capacidade: number
}) {
  if (semanas.length === 0) {
    return (
      <p className="muted" style={{ padding: '8px 0' }}>
        Nenhuma sessão na agenda deste mês.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {semanas.map((s, i) => {
        const realizadas = s.realizadas ?? 0
        const agendadas = s.agendadas ?? 0
        const faltas = s.faltas ?? 0
        const ocupadas = realizadas + agendadas
        const pct = capacidade > 0 ? Math.round((ocupadas / capacidade) * 100) : 0
        const larguraReal = capacidade > 0 ? Math.min((realizadas / capacidade) * 100, 100) : 0
        const larguraAgend =
          capacidade > 0 ? Math.min((agendadas / capacidade) * 100, 100 - larguraReal) : 0
        return (
          <div key={s.semana ?? `semana-${i}`}>
            <div className="row-between" style={{ marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
              <span className="small" style={{ fontWeight: 600 }}>
                semana de {s.semana ? diaMes(s.semana) : '—'}
              </span>
              <span className="mono small">
                {ocupadas} de {capacidade} · {pct}%
                {faltas > 0 && (
                  <span style={{ color: 'var(--ink-60)' }}>
                    {' '}
                    · {faltas} {faltas === 1 ? 'falta' : 'faltas'}
                  </span>
                )}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 2,
                background: 'var(--sand)',
                borderRadius: 6,
                height: 22,
                overflow: 'hidden',
              }}
              aria-hidden="true"
            >
              {larguraReal > 0 && (
                <div
                  style={{
                    width: `${larguraReal}%`,
                    background: '#2c5245',
                    borderRadius: '6px 4px 4px 6px',
                  }}
                />
              )}
              {larguraAgend > 0 && (
                <div
                  style={{
                    width: `${larguraAgend}%`,
                    background: '#a9c6b8',
                    border: '1px solid rgba(31, 27, 22, 0.14)',
                    borderRadius: larguraReal > 0 ? 4 : '6px 4px 4px 6px',
                  }}
                />
              )}
            </div>
          </div>
        )
      })}
      <p className="small" style={{ color: 'var(--ink-60)', marginTop: 2 }}>
        Jade escuro = realizadas · jade claro = ainda agendadas · capacidade da config:{' '}
        {capacidade} sessões por semana.
      </p>
    </div>
  )
}
