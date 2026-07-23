import type { Json } from '../../lib/database.types'
import { diaPorExtenso } from '../../lib/datas'
import { NOME_CONDICAO, NOME_PROGRAMA, type Avaliacao, type Ciclo, type Paciente, type Sessao } from '../../lib/tipos'

type Props = {
  paciente: Paciente
  ciclo: Ciclo
  inicial: Avaliacao | null
  checkpoint: Avaliacao
  sessoesDoCiclo: Sessao[]
}

function frasesDe(j: Json | undefined): string[] {
  return Array.isArray(j) ? j.filter((x): x is string => typeof x === 'string') : []
}

function freqTexto(n: number | null): string {
  if (n == null) return '—'
  if (n >= 7) return 'todos os dias'
  if (n === 0) return 'nenhum dia da semana'
  return `${n} ${n === 1 ? 'dia' : 'dias'} por semana`
}

// Relatório de Evolução (spec §3.3): visão de impressão simples, A4, marca da
// casa, Gloock nos números. Invisível na tela; aparece só no @media print.
export default function RelatorioImpressao({ paciente, ciclo, inicial, checkpoint, sessoesDoCiclo }: Props) {
  const base = checkpoint.eva_base ?? inicial?.eva ?? null
  const queda = checkpoint.queda_pontos ?? (base != null ? base - checkpoint.eva : null)
  const pct =
    checkpoint.queda_pct != null
      ? Math.round(checkpoint.queda_pct)
      : base
        ? Math.round(((base - checkpoint.eva) / base) * 100)
        : null
  const atingido = checkpoint.criterio_atingido ?? (queda != null && (queda >= 2 || (pct ?? 0) >= 30))
  const destravadas = sessoesDoCiclo.filter((s) => s.destravamento === true).length
  const antes = frasesDe(inicial?.impede_frases)
  const agora = frasesDe(checkpoint.impede_frases)
  const inicio = sessoesDoCiclo[0]?.iniciada_em ?? ciclo.iniciado_em

  return (
    <div className="relatorio-impressao" aria-hidden="true">
      <style>{`
        .relatorio-impressao { display: none; }
        @page { size: A4; margin: 16mm; }
        @media print {
          body { background: #fff !important; }
          .topnav, .ficha-conteudo, .ficha-rodape, .toast { display: none !important; }
          .relatorio-impressao {
            display: block !important;
            color: #1f1b16;
            font-size: 13pt;
            line-height: 1.55;
          }
        }
      `}</style>

      <header style={{ borderBottom: '2px solid #1f1b16', paddingBottom: 12, marginBottom: 18 }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '22pt', lineHeight: 1.1 }}>Hilda de Oliveira</p>
        <p style={{ letterSpacing: '0.18em', textTransform: 'uppercase', fontSize: '9pt' }}>
          Acupuntura clínica · Relatório de Evolução
        </p>
      </header>

      <p>
        <strong>Paciente:</strong> {paciente.nome}
      </p>
      <p>
        <strong>Condição tratada:</strong> {NOME_CONDICAO[ciclo.condicao]}
      </p>
      <p>
        <strong>Programa:</strong> {NOME_PROGRAMA[ciclo.programa]} · {ciclo.sessoes_total} sessões
      </p>
      {inicio && (
        <p>
          <strong>Período:</strong> de {diaPorExtenso(inicio)} até {diaPorExtenso(checkpoint.criado_em)}
        </p>
      )}

      <section style={{ margin: '18px 0', padding: '14px 18px', border: '1.5px solid #1f1b16' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '28pt', margin: '4px 0' }}>
          {base ?? '—'} → {checkpoint.eva}
        </p>
        <p>
          Dor (escala de 0 a 10): começou em <strong>{base ?? '—'}</strong>, hoje está em{' '}
          <strong>{checkpoint.eva}</strong>
          {queda != null && (
            <>
              {' '}
              — queda de <strong>
                {queda} {queda === 1 ? 'ponto' : 'pontos'}
              </strong>
              {pct != null && <> ({pct}% a menos)</>}
            </>
          )}
          .
        </p>
        <p>
          <strong>{atingido ? '✓ Critério combinado atingido' : 'Critério combinado ainda não atingido'}</strong>{' '}
          (o combinado: a dor cair 2 pontos ou 30% até a 5ª sessão).
        </p>
      </section>

      <p>
        <strong>Frequência da dor:</strong> {freqTexto(inicial?.freq_dor_semana ?? null)} →{' '}
        {freqTexto(checkpoint.freq_dor_semana)}
      </p>
      {antes.length > 0 && (
        <p>
          <strong>O que a dor impedia:</strong> {antes.map((f) => `“${f}”`).join(' · ')}
        </p>
      )}
      {agora.length > 0 && (
        <p>
          <strong>Hoje:</strong> {agora.map((f) => `“${f}”`).join(' · ')}
        </p>
      )}
      <p>
        <strong>Sessões realizadas até aqui:</strong> {sessoesDoCiclo.length}
        {destravadas > 0 && <> · com liberação miofascial em {destravadas}</>}
      </p>

      <p style={{ marginTop: 28 }}>{diaPorExtenso(new Date())}</p>
      <div style={{ marginTop: 48, borderTop: '1px solid #1f1b16', width: 300, paddingTop: 6, fontSize: '11pt' }}>
        Hilda de Oliveira — Acupuntura Clínica
      </div>
    </div>
  )
}
