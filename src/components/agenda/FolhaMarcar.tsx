// Vaga livre tocada → folha para escolher a paciente (busca) e o tipo (spec §1.3).
// O tipo vem sugerido pelo app; a Primeira Sessão (90 min) só aparece se a vaga
// comporta — o front bloqueia o slot seguinte por construção.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { diaPorExtenso, horaCurta } from '../../lib/datas'
import { NOME_CONDICAO, nomeCurto, type Ciclo, type Paciente } from '../../lib/tipos'
import {
  buscarPacientes,
  capitalizar,
  cicloAtivoDe,
  criarAgendamento,
  tipoSugerido,
  vagaComporta,
  type AgTipo,
  type ConfigAgenda,
  type DiaAgenda,
} from './agendaDados'
import Folha from './Folha'

type Props = {
  dia: DiaAgenda
  inicio: Date
  config: ConfigAgenda
  aoMarcou: (paciente: Paciente) => void
  aoFechar: () => void
}

type Escolhida = { paciente: Paciente; ciclo: Ciclo | null }

export default function FolhaMarcar({ dia, inicio, config, aoMarcou, aoFechar }: Props) {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<Paciente[]>([])
  const [escolhida, setEscolhida] = useState<Escolhida | null>(null)
  const [tipo, setTipo] = useState<AgTipo>('ciclo')
  const [tipoManual, setTipoManual] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const comportaPrimeira = vagaComporta(dia, inicio, config.duracaoPrimeiraMin)

  useEffect(() => {
    let vivo = true
    const t = setTimeout(() => {
      buscarPacientes(termo).then(
        (r) => {
          if (vivo) setResultados(r)
        },
        () => {
          if (vivo) setResultados([])
        },
      )
    }, termo ? 250 : 0)
    return () => {
      vivo = false
      clearTimeout(t)
    }
  }, [termo])

  // Sugestão do app: recalculada quando o ciclo ativo chega, a menos que a
  // Hilda já tenha tocado num tipo (aí a escolha dela vale).
  useEffect(() => {
    if (!escolhida || tipoManual) return
    const sugestao = tipoSugerido(escolhida.paciente, escolhida.ciclo)
    setTipo(sugestao === 'primeira' && !comportaPrimeira ? 'avulsa' : sugestao)
  }, [escolhida, tipoManual, comportaPrimeira])

  function escolher(p: Paciente) {
    setEscolhida({ paciente: p, ciclo: null })
    setTipoManual(false)
    cicloAtivoDe(p.id).then(
      (c) => {
        setEscolhida((atual) => (atual && atual.paciente.id === p.id ? { paciente: p, ciclo: c } : atual))
      },
      () => undefined,
    )
  }

  async function marcar() {
    if (!escolhida || salvando) return
    setSalvando(true)
    setErro(null)
    const duracaoMin = tipo === 'primeira' ? config.duracaoPrimeiraMin : config.passoMin
    const r = await criarAgendamento({
      paciente: escolhida.paciente,
      cicloId: tipo === 'ciclo' || tipo === 'manutencao' ? (escolhida.ciclo?.id ?? null) : null,
      tipo,
      inicio,
      duracaoMin,
    })
    setSalvando(false)
    if ('erro' in r) {
      setErro(r.erro)
      return
    }
    aoMarcou(escolhida.paciente)
  }

  const opcoesTipo: { valor: AgTipo; rotulo: string; desabilitada?: boolean }[] = [
    { valor: 'primeira', rotulo: `Primeira Sessão · ${config.duracaoPrimeiraMin} min`, desabilitada: !comportaPrimeira },
    { valor: 'ciclo', rotulo: 'Sessão do ciclo' },
    { valor: 'manutencao', rotulo: 'Manutenção' },
    { valor: 'avulsa', rotulo: 'Avulsa' },
  ]

  return (
    <Folha rotuloAria="Marcar sessão nesta vaga" aoFechar={aoFechar}>
      <div>
        <div className="eyebrow">Marcar nesta vaga</div>
        <h2>
          {capitalizar(diaPorExtenso(inicio))}, às {horaCurta(inicio)}
        </h2>
      </div>

      {!escolhida && (
        <>
          <label className="field">
            <span className="field-label">Quem vem nessa vaga?</span>
            <input
              className="input"
              type="search"
              autoFocus
              placeholder="Buscar pelo nome…"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
            />
          </label>
          <div className="touch-list" style={{ gap: 10 }}>
            {resultados.map((p) => (
              <button key={p.id} type="button" className="touch-item" onClick={() => escolher(p)}>
                <span style={{ flex: 1 }}>
                  <strong>{p.nome}</strong>
                  <span className="small muted" style={{ display: 'block' }}>
                    {p.condicao ? NOME_CONDICAO[p.condicao] : 'sem condição anotada'}
                  </span>
                </span>
              </button>
            ))}
            {resultados.length === 0 && (
              <p className="muted small">Ninguém com esse nome por aqui ainda.</p>
            )}
          </div>
          <p className="small">
            <Link to="/novo">+ cadastrar paciente nova</Link>
          </p>
        </>
      )}

      {escolhida && (
        <>
          <div className="card-flat row-between" style={{ padding: 16 }}>
            <strong>{escolhida.paciente.nome}</strong>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ minHeight: 48, padding: '8px 16px' }}
              onClick={() => setEscolhida(null)}
            >
              trocar
            </button>
          </div>

          <div>
            <p style={{ fontWeight: 600, marginBottom: 10 }}>Que sessão é?</p>
            <div className="choice-row">
              {opcoesTipo.map((op) => (
                <button
                  key={op.valor}
                  type="button"
                  className="choice"
                  data-selected={tipo === op.valor}
                  disabled={op.desabilitada}
                  onClick={() => {
                    setTipo(op.valor)
                    setTipoManual(true)
                  }}
                >
                  {op.rotulo}
                </button>
              ))}
            </div>
            {!comportaPrimeira && (
              <p className="small muted" style={{ marginTop: 8 }}>
                Primeira Sessão não cabe nesta vaga: o horário seguinte já tem gente.
              </p>
            )}
          </div>

          {erro && <p style={{ color: 'var(--cinnabar)', fontWeight: 600 }}>{erro}</p>}

          <button
            type="button"
            className="btn btn-primary btn-xl"
            disabled={salvando}
            onClick={() => {
              void marcar()
            }}
          >
            {salvando
              ? 'Guardando…'
              : `Marcar ${nomeCurto(escolhida.paciente)} — ${horaCurta(inicio)}`}
          </button>
        </>
      )}

      <button type="button" className="btn btn-ghost btn-block" onClick={aoFechar}>
        Voltar sem marcar
      </button>
    </Folha>
  )
}
