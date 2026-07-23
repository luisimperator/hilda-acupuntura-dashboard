// Objeções do mês (v_objecoes_mensal) + o diagnóstico automático do playbook:
// quando preço passa de 50% das perdas, o problema é valor percebido na
// sessão, não o preço. Barra + número + % sempre escritos.

import { NOME_OBJECAO } from './dadosNumeros'
import type { Objecao } from '../../lib/tipos'

export default function TabelaObjecoes({
  objecoes,
}: {
  objecoes: { objecao: Objecao; vezes: number }[]
}) {
  const total = objecoes.reduce((soma, o) => soma + o.vezes, 0)

  if (total === 0) {
    return (
      <p className="muted" style={{ padding: '8px 0' }}>
        Nenhuma objeção registrada neste mês.
      </p>
    )
  }

  const maior = Math.max(...objecoes.map((o) => o.vezes))
  const precoVezes = objecoes.find((o) => o.objecao === 'preco')?.vezes ?? 0
  const precoPct = Math.round((precoVezes / total) * 100)
  const topo = objecoes[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {objecoes.map((o) => {
        const pct = Math.round((o.vezes / total) * 100)
        return (
          <div key={o.objecao} className="row" style={{ gap: 12 }}>
            <span className="small" style={{ width: 150, flexShrink: 0, fontWeight: 600 }}>
              {NOME_OBJECAO[o.objecao]}
            </span>
            <div
              style={{
                flex: 1,
                background: 'var(--sand)',
                borderRadius: 6,
                height: 20,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.max((o.vezes / maior) * 100, 4)}%`,
                  height: '100%',
                  background: '#527b69',
                  borderRadius: '6px 4px 4px 6px',
                  border: '1px solid rgba(31, 27, 22, 0.14)',
                }}
                aria-hidden="true"
              />
            </div>
            <span className="mono small" style={{ width: 90, textAlign: 'right', flexShrink: 0 }}>
              {o.vezes} · {pct}%
            </span>
          </div>
        )
      })}

      <div
        className="small"
        style={{
          background: 'var(--sand)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-sm)',
          padding: '12px 16px',
          lineHeight: 1.5,
        }}
      >
        <strong>Diagnóstico do playbook: </strong>
        {precoPct > 50 ? (
          <>
            preço foi {precoPct}% das perdas → o problema é valor percebido na sessão, não o
            preço.
          </>
        ) : (
          <>
            nenhuma objeção passou da metade das perdas — a mais comum foi{' '}
            {NOME_OBJECAO[topo.objecao].toLowerCase()} ({topo.vezes} de {total}).
          </>
        )}
      </div>
    </div>
  )
}
