// Busca de paciente (spec §1.1) — campo grande, resultados a partir da 2ª letra
// (ilike no nome; o índice trigram do banco faz o resto). Abaixo, as 4 pacientes
// vistas há pouco — na prática, 90% dos toques.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { NOME_CONDICAO, nomeCurto } from '../../lib/tipos'
import type { Paciente } from '../../lib/tipos'

const STATUS_HUMANO: Record<Paciente['status'], string> = {
  lead: 'ainda não agendou',
  primeira_agendada: 'primeira sessão marcada',
  proposta_pendente: 'pensando na proposta',
  em_programa: 'em programa',
  manutencao: 'manutenção mensal',
  alta: 'de alta',
  inativa: 'arquivada',
}

export default function BuscaPaciente({ recentes }: { recentes: Paciente[] }) {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<Paciente[] | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    const t = termo.trim()
    setAviso(null)
    if (t.length < 2) {
      setResultados(null)
      return
    }
    let cancelado = false
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const { data, error } = await supabase
            .from('pacientes')
            .select('*')
            .ilike('nome', `%${t}%`)
            .order('nome')
            .limit(8)
          if (error) throw error
          if (!cancelado) setResultados(data ?? [])
        } catch {
          if (!cancelado) setAviso('A busca não respondeu agora — tente outra vez.')
        }
      })()
    }, 250)
    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [termo])

  return (
    <section className="stack">
      <label htmlFor="busca-paciente" className="eyebrow">
        Buscar paciente
      </label>
      <input
        id="busca-paciente"
        className="input"
        type="search"
        autoComplete="off"
        placeholder="🔍 Digite o nome da paciente…"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        style={{ fontSize: 22, minHeight: 64 }}
      />
      {aviso && <p className="small muted">{aviso}</p>}

      {resultados !== null ? (
        resultados.length > 0 ? (
          <div className="touch-list">
            {resultados.map((p) => (
              <Link key={p.id} to={`/paciente/${p.id}`} className="touch-item">
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{p.nome}</strong>
                  <span className="small muted" style={{ display: 'block' }}>
                    {p.condicao ? `${NOME_CONDICAO[p.condicao]} · ` : ''}
                    {STATUS_HUMANO[p.status]}
                  </span>
                </span>
                <span aria-hidden="true" className="muted">
                  ›
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted">
            Nenhuma paciente com esse nome. Confira a grafia ou{' '}
            <Link to="/novo">cadastre uma nova paciente</Link>.
          </p>
        )
      ) : (
        recentes.length > 0 && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Vistas há pouco
            </div>
            <div className="choice-row">
              {recentes.map((p) => (
                <Link
                  key={p.id}
                  to={`/paciente/${p.id}`}
                  className="choice"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  {nomeCurto(p)}
                </Link>
              ))}
            </div>
          </div>
        )
      )}
    </section>
  )
}
