// Relatório de Evolução (spec §3.3): página de impressão A4 com a marca,
// preenchendo o template campo a campo. Imprimir grava relatorio_impresso_em —
// relatório gerado e não entregue não existe.

import { diaPorExtenso } from '../../../lib/datas'
import { NOME_CONDICAO, NOME_PROGRAMA } from '../../../lib/tipos'
import type { Avaliacao } from '../../../lib/tipos'
import { marcarRelatorioImpresso } from '../dadosSessao'
import { frasesDaAvaliacao, listar, NOME_ZONA, rotuloFreq, type CtxSessao } from '../tiposSessao'

type Props = {
  ctx: CtxSessao
  avaliacao: Avaliacao
  aoFechar: () => void
}

export default function RelatorioEvolucao({ ctx, avaliacao, aoFechar }: Props) {
  const { paciente, ciclo, avaliacaoInicial, sessoesConcluidas } = ctx

  const doCiclo = ciclo ? sessoesConcluidas.filter((s) => s.ciclo_id === ciclo.id) : sessoesConcluidas
  const sessoesFeitas = ctx.numeroDaSessao ?? doCiclo.length + 1
  const destravamentos = doCiclo.filter((s) => s.destravamento).length + (ctx.sessao.destravamento ? 1 : 0)
  const frasesAntes = frasesDaAvaliacao(avaliacaoInicial)
  const frasesHoje = frasesDaAvaliacao(avaliacao)

  function imprimir() {
    window.print()
    void marcarRelatorioImpresso(avaliacao.id)
      .then((quando) => ctx.definirCheckpoint({ ...avaliacao, relatorio_impresso_em: quando }))
      .catch(() => {
        // sem internet o carimbo fica pendente — o botão-estado da ficha cobra
      })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: 'rgba(31,27,22,0.5)',
        overflowY: 'auto',
        padding: '24px 12px 120px',
      }}
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .relatorio-a4, .relatorio-a4 * { visibility: visible !important; }
          .relatorio-a4 {
            position: absolute !important;
            inset: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .nao-imprimir { display: none !important; }
          @page { size: A4; margin: 18mm; }
        }
      `}</style>

      <div
        className="relatorio-a4"
        style={{
          maxWidth: 720,
          margin: '0 auto',
          background: '#fffdf9',
          color: '#1f1b16',
          borderRadius: 12,
          padding: '48px 52px',
          fontFamily: 'var(--font-body)',
        }}
      >
        <header style={{ borderBottom: '2px solid #2c5245', paddingBottom: 16, marginBottom: 24 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 26 }}>Hilda de Oliveira</p>
          <p className="eyebrow">acupuntura clínica · relatório de evolução</p>
        </header>

        <div className="stack">
          <p style={{ fontSize: 22, fontFamily: 'var(--font-display)' }}>{paciente.nome}</p>
          <p>
            {ciclo ? `Programa ${NOME_PROGRAMA[ciclo.programa]}` : 'Acompanhamento'} ·{' '}
            {paciente.condicao ? NOME_CONDICAO[paciente.condicao] : ''}
          </p>
          <p className="small" style={{ color: '#5c554b' }}>
            Avaliação inicial: {avaliacaoInicial ? diaPorExtenso(avaliacaoInicial.criado_em) : '—'} · Reavaliação:{' '}
            {diaPorExtenso(avaliacao.criado_em)}
          </p>

          <div
            style={{
              display: 'flex',
              gap: 28,
              alignItems: 'baseline',
              margin: '18px 0',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 54 }}>
              {avaliacao.eva_base ?? '—'} → {avaliacao.eva}
            </span>
            <span style={{ fontSize: 20 }}>
              queda de {avaliacao.queda_pontos ?? '—'} {avaliacao.queda_pontos === 1 ? 'ponto' : 'pontos'}
              {avaliacao.queda_pct != null ? ` · ${avaliacao.queda_pct}% a menos` : ''}
            </span>
          </div>

          <p style={{ fontWeight: 700, color: avaliacao.criterio_atingido ? '#2c5245' : '#5c554b' }}>
            {avaliacao.criterio_atingido
              ? '✓ Critério da garantia atingido (o combinado: cair 2 pontos ou 30%)'
              : 'Critério da garantia ainda não atingido (o combinado: cair 2 pontos ou 30%)'}
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(31,27,22,0.15)', margin: '12px 0' }} />

          <p>
            <strong>Frequência da dor:</strong> {rotuloFreq(avaliacaoInicial?.freq_dor_semana)} →{' '}
            {rotuloFreq(avaliacao.freq_dor_semana)}
          </p>
          <p>
            <strong>Regiões doloridas:</strong>{' '}
            {avaliacaoInicial && avaliacaoInicial.mapa_zonas.length > 0
              ? listar(avaliacaoInicial.mapa_zonas.map((z) => NOME_ZONA[z] ?? z))
              : '—'}{' '}
            → {avaliacao.mapa_zonas.length > 0 ? listar(avaliacao.mapa_zonas.map((z) => NOME_ZONA[z] ?? z)) : 'nenhuma marcada'}
          </p>
          {frasesAntes.length > 0 && (
            <p>
              <strong>O que a dor impedia:</strong> “{frasesAntes.join('” · “')}”
            </p>
          )}
          {frasesHoje.length > 0 && (
            <p>
              <strong>Hoje:</strong> “{frasesHoje.join('” · “')}”
            </p>
          )}
          <p>
            <strong>Sessões realizadas:</strong> {sessoesFeitas}
            {ciclo ? ` de ${ciclo.sessoes_total}` : ''} · <strong>massagens preparatórias:</strong> {destravamentos}
          </p>

          <div style={{ marginTop: 48 }}>
            <div style={{ borderTop: '1px solid #1f1b16', width: 280, paddingTop: 6 }}>
              <p className="small">Hilda de Oliveira — acupunturista</p>
            </div>
            <p className="small" style={{ color: '#5c554b', marginTop: 10 }}>
              {diaPorExtenso(new Date())}
            </p>
          </div>
        </div>
      </div>

      <div
        className="nao-imprimir"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          background: 'rgba(247,242,234,0.96)',
          borderTop: '1px solid rgba(31,27,22,0.12)',
        }}
      >
        <button type="button" className="btn btn-primary" onClick={imprimir}>
          Imprimir agora
        </button>
        <button type="button" className="btn btn-ghost" onClick={aoFechar}>
          Voltar à sessão
        </button>
      </div>
    </div>
  )
}
