// "ver ficha ›" (spec §3): a Ficha abre POR CIMA da sessão como folha
// deslizante — curva da EVA + últimas sessões em frases — com o botão
// "voltar à sessão" fixo. Consulta no meio do atendimento sem sair do wizard.

import EvaChart, { type PontoEva } from '../EvaChart'
import { diaCurto } from '../../lib/datas'
import { NOME_CONDICAO, selosCautela } from '../../lib/tipos'
import type { Paciente, Sessao } from '../../lib/tipos'
import { listar } from './tiposSessao'

type Props = {
  paciente: Paciente
  sessoesConcluidas: Sessao[]
  aoFechar: () => void
}

function tituloSessao(s: Sessao): string {
  if (s.tipo === 'primeira') return 'Primeira sessão'
  if (s.numero_no_ciclo != null) return `Sessão ${s.numero_no_ciclo}`
  if (s.tipo === 'manutencao') return 'Manutenção'
  return 'Sessão avulsa'
}

function frase(s: Sessao): string {
  const partes: string[] = []
  if (s.eva_pre != null && s.eva_pos != null) partes.push(`chegou ${s.eva_pre}, saiu ${s.eva_pos}.`)
  if (s.destravamento && s.destrav_regioes.length > 0) partes.push(`Destravou ${listar(s.destrav_regioes)}.`)
  if (s.moxa) partes.push('Moxa.')
  if (s.ventosa) partes.push('Ventosa.')
  if (s.eletro) partes.push('Eletro.')
  if (s.auriculo) partes.push('Levou sementes.')
  if (s.orientacoes.length > 0) partes.push(`Orientação: ${listar(s.orientacoes)}.`)
  return partes.join(' ') || 'sem anotações neste dia.'
}

export default function FichaSobreposta({ paciente, sessoesConcluidas, aoFechar }: Props) {
  const selos = selosCautela(paciente)
  // numeração sequencial (evita repetir "sessão 1" entre ciclos diferentes)
  const pontos: PontoEva[] = sessoesConcluidas.map((s, i) => ({
    sessao: i + 1,
    pre: s.eva_pre,
    pos: s.eva_pos,
  }))
  const ultimas = [...sessoesConcluidas].reverse().slice(0, 6)

  return (
    <div
      role="dialog"
      aria-label={`Ficha de ${paciente.nome} — por cima da sessão`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: 'var(--cream)',
        overflowY: 'auto',
        animation: 'none',
      }}
    >
      <div className="wrap" style={{ maxWidth: 760, padding: '24px 20px 140px' }}>
        <div className="stack-lg">
          <header className="stack">
            <p className="eyebrow">ficha rápida — a sessão continua guardada</p>
            <h1 style={{ fontSize: 30 }}>{paciente.nome}</h1>
            {paciente.objetivo_frase && (
              <p style={{ fontStyle: 'italic', fontSize: 20 }}>“{paciente.objetivo_frase}”</p>
            )}
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {paciente.condicao && <span className="pill pill-sand">{NOME_CONDICAO[paciente.condicao]}</span>}
              {selos.map((s) => (
                <span key={s.chave} className="pill pill-red" style={{ whiteSpace: 'normal' }}>
                  ⚠ {s.rotulo}
                </span>
              ))}
            </div>
          </header>

          <section className="card-flat stack">
            <p className="eyebrow">a curva da dor</p>
            <EvaChart pontos={pontos} />
          </section>

          <section className="stack">
            <p className="eyebrow">últimas sessões</p>
            {ultimas.length === 0 && <p className="muted">A história começa na primeira sessão.</p>}
            {ultimas.map((s) => (
              <article key={s.id} className="card-flat" style={{ padding: 16 }}>
                <p style={{ lineHeight: 1.5 }}>
                  <strong>{tituloSessao(s)}</strong>
                  <span className="mono small muted"> · {diaCurto(s.concluida_em ?? s.iniciada_em)}</span>
                  {' — '}
                  {frase(s)}
                </p>
              </article>
            ))}
          </section>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          background: 'rgba(247,242,234,0.96)',
          borderTop: '1px solid var(--hairline)',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <button type="button" className="btn btn-primary btn-xl" style={{ maxWidth: 480 }} onClick={aoFechar}>
          ← Voltar à sessão
        </button>
      </div>
    </div>
  )
}
