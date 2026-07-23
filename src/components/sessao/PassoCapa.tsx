// Passo 0 — CAPA: a memória do caso em 10 segundos (spec §3.1 passo 0,
// §3.2 A e §3.3). Checkpoint nasce dourado; primeira mostra o lead.

import { diaCurto, horaCurta } from '../../lib/datas'
import { NOME_CONDICAO, NOME_PROGRAMA, nomeCurto, selosCautela } from '../../lib/tipos'
import { listar, type CtxSessao } from './tiposSessao'

function Colar({ total, feitas }: { total: number; feitas: number }) {
  return (
    <div className="progress-dots" aria-label={`${feitas} de ${total} sessões feitas`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className="progress-dot"
          data-done={i < feitas}
          data-checkpoint={i === 4}
          title={i === 4 ? '5ª sessão — reavaliação' : `sessão ${i + 1}`}
        />
      ))}
    </div>
  )
}

export default function PassoCapa({ ctx }: { ctx: CtxSessao }) {
  const { paciente, ciclo, sessao, ultimaSessao, variante, numeroDaSessao, avaliacaoInicial } = ctx
  const nome = nomeCurto(paciente)
  const selos = selosCautela(paciente)
  const ehCheckpoint = variante === 'checkpoint'
  const ehPrimeira = variante === 'primeira'

  const subtitulo = ciclo
    ? `Sessão ${numeroDaSessao ?? '?'} de ${ciclo.sessoes_total} · ${NOME_PROGRAMA[ciclo.programa]}${
        paciente.condicao ? ` · ${NOME_CONDICAO[paciente.condicao]}` : ''
      }`
    : sessao.tipo === 'manutencao'
      ? 'Sessão de manutenção'
      : sessao.tipo === 'avulsa'
        ? 'Sessão avulsa'
        : paciente.condicao
          ? NOME_CONDICAO[paciente.condicao]
          : ''

  return (
    <section className="stack-lg">
      <div
        className="card stack"
        style={
          ehCheckpoint
            ? { background: 'var(--gold-soft)', border: '2px solid var(--gold)', textAlign: 'center' }
            : { textAlign: 'center' }
        }
      >
        {ehCheckpoint && (
          <p className="eyebrow" style={{ color: '#7a5c26' }}>
            reavaliação · 5ª sessão
          </p>
        )}
        <h1 style={{ fontSize: 38 }}>
          {ehCheckpoint ? `Hoje é a reavaliação da ${nome} ★` : paciente.nome}
        </h1>
        {ehPrimeira ? (
          <p style={{ fontSize: 21 }}>Primeira Sessão Completa · 90 minutos</p>
        ) : (
          subtitulo && <p style={{ fontSize: 21 }}>{subtitulo}</p>
        )}
        {ciclo && <div style={{ display: 'flex', justifyContent: 'center' }}><Colar total={ciclo.sessoes_total} feitas={Math.max(0, (numeroDaSessao ?? 1) - 1)} /></div>}
      </div>

      {ehPrimeira ? (
        <div className="card-flat stack">
          <p className="eyebrow">o que já sabemos dela</p>
          {paciente.eva_landing != null ? (
            <p style={{ fontSize: 20 }}>
              No WhatsApp ela falou de uma dor <strong>{paciente.eva_landing}/10</strong>.
            </p>
          ) : (
            <p className="muted">Ela ainda não deu nota para a dor — hoje a gente mede direito.</p>
          )}
          {paciente.condicao && <p>Queixa: {NOME_CONDICAO[paciente.condicao]}.</p>}
          <p className="muted small">
            Veio de: {paciente.origem === 'landing' ? 'anúncio' : paciente.origem}
            {paciente.observacoes ? ` · ${paciente.observacoes}` : ''}
          </p>
          <p className="muted small">O tablet acompanha as pausas naturais — a conversa vem primeiro.</p>
        </div>
      ) : (
        <div className="card-flat stack">
          <p className="eyebrow">na última sessão{ultimaSessao ? ` (${diaCurto(ultimaSessao.concluida_em ?? ultimaSessao.iniciada_em)})` : ''}</p>
          {ultimaSessao ? (
            <>
              <p style={{ fontSize: 20 }}>
                {ultimaSessao.eva_pre != null && ultimaSessao.eva_pos != null
                  ? `entrou ${ultimaSessao.eva_pre} → saiu ${ultimaSessao.eva_pos}`
                  : 'dor não registrada'}
                {ultimaSessao.destravamento && ultimaSessao.destrav_regioes.length > 0
                  ? ` · destravou ${listar(ultimaSessao.destrav_regioes)}`
                  : ''}
              </p>
              {ultimaSessao.orientacoes.length > 0 && (
                <p>Orientação dada: {listar(ultimaSessao.orientacoes)}.</p>
              )}
              <p className="muted small">
                Sessão às {horaCurta(ultimaSessao.iniciada_em)} · {ultimaSessao.agulhas_colocadas ?? '—'} agulhas
              </p>
            </>
          ) : (
            <p className="muted">Esta é a primeira sessão registrada aqui.</p>
          )}
          {ehCheckpoint && avaliacaoInicial && (
            <p>
              Número de partida (dia 1): <strong>{avaliacaoInicial.eva}</strong> — hoje a gente compara.
            </p>
          )}
          {paciente.objetivo_frase && (
            <p style={{ fontStyle: 'italic' }}>Objetivo dela: “{paciente.objetivo_frase}”</p>
          )}
        </div>
      )}

      {selos.length > 0 && (
        <div
          className="card-flat stack"
          style={{ background: 'var(--gold-soft)', borderColor: 'var(--gold)' }}
          role="note"
        >
          {selos.map((s) => (
            <p key={s.chave} style={{ fontWeight: 600 }}>
              ⚠ {s.rotulo}
            </p>
          ))}
        </div>
      )}

      <button type="button" className="btn btn-primary btn-xl" onClick={ctx.avancar}>
        {ehCheckpoint ? 'Começar a reavaliação →' : 'Começar →'}
      </button>
    </section>
  )
}
