// Funil do mês: Leads → Primeiras → Propostas → Fechadas.
// Barras horizontais em divs (largura %), rampa sequencial de jade
// (claro → escuro), e o valor absoluto + % SEMPRE escritos ao lado —
// cor nunca carrega informação sozinha.

import type { FunilMes } from './dadosNumeros'

const RAMPA_JADE = ['#a9c6b8', '#7ba28f', '#527b69', '#2c5245']

type Etapa = { rotulo: string; valor: number; cor: string }

export default function FunilBarras({ funil }: { funil: FunilMes | null }) {
  const etapas: Etapa[] = [
    { rotulo: 'Leads', valor: funil?.leads ?? 0, cor: RAMPA_JADE[0] },
    { rotulo: 'Primeiras sessões', valor: funil?.primeiras_sessoes ?? 0, cor: RAMPA_JADE[1] },
    { rotulo: 'Propostas', valor: funil?.propostas ?? 0, cor: RAMPA_JADE[2] },
    { rotulo: 'Fechadas', valor: funil?.fechou_total ?? 0, cor: RAMPA_JADE[3] },
  ]
  const maior = Math.max(...etapas.map((e) => e.valor))
  const base = etapas[0].valor

  if (maior === 0) {
    return (
      <p className="muted" style={{ padding: '8px 0' }}>
        Nenhum lead registrado neste mês — o funil começa quando a primeira pessoa escrever.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {etapas.map((e) => {
        const larguraPct = Math.max((e.valor / maior) * 100, e.valor > 0 ? 3 : 0)
        const pctDosLeads = base > 0 ? Math.round((e.valor / base) * 100) : null
        return (
          <div key={e.rotulo}>
            <div className="row-between" style={{ marginBottom: 4 }}>
              <span className="small" style={{ fontWeight: 600 }}>
                {e.rotulo}
              </span>
              <span className="mono small">
                {e.valor}
                {pctDosLeads != null && (
                  <span style={{ color: 'var(--ink-60)' }}> · {pctDosLeads}% dos leads</span>
                )}
              </span>
            </div>
            <div
              style={{
                background: 'var(--sand)',
                borderRadius: 6,
                height: 26,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${larguraPct}%`,
                  height: '100%',
                  background: e.cor,
                  borderRadius: e.valor >= maior ? 6 : '6px 4px 4px 6px',
                  border: '1px solid rgba(31, 27, 22, 0.14)',
                }}
                aria-hidden="true"
              />
            </div>
          </div>
        )
      })}
      {funil && (
        <p className="small" style={{ color: 'var(--ink-60)', marginTop: 2 }}>
          Das {funil.propostas ?? 0} propostas: {funil.fechou_na_sala ?? 0} fechadas na sala e{' '}
          {funil.fechou_total ?? 0} no total (contando os 7 dias do crédito).
        </p>
      )}
    </div>
  )
}
