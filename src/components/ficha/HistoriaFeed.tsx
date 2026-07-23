import { useState } from 'react'
import { Link } from 'react-router-dom'
import { diaCurto, diaPorExtenso, horaCurta } from '../../lib/datas'
import type { Avaliacao, Ciclo, Sessao } from '../../lib/tipos'

type Props = {
  /** Todas as sessões da paciente (as em andamento são ignoradas aqui) */
  sessoes: Sessao[]
  avaliacoes: Avaliacao[]
  ciclos: Ciclo[]
}

type Item =
  | { chave: string; quando: string; tipo: 'sessao'; sessao: Sessao; checkpoint: Avaliacao | null }
  | { chave: string; quando: string; tipo: 'marco'; texto: string }

function listar(coisas: string[]): string {
  if (coisas.length <= 1) return coisas.join('')
  return `${coisas.slice(0, -1).join(', ')} e ${coisas[coisas.length - 1]}`
}

function tituloSessao(s: Sessao): string {
  if (s.tipo === 'primeira') return 'Primeira sessão'
  if (s.numero_no_ciclo != null) return `Sessão ${s.numero_no_ciclo}`
  if (s.tipo === 'manutencao') return 'Manutenção'
  return 'Sessão avulsa'
}

function fraseSessao(s: Sessao, checkpoint: Avaliacao | null): string {
  const partes: string[] = []
  if (checkpoint) partes.push('Reavaliação.')
  if (s.status === 'abortada') partes.push('encerrada sem terminar — ficou guardado o que foi anotado.')
  if (s.eva_pre != null && s.eva_pos != null) {
    const d = s.eva_pre - s.eva_pos
    partes.push(`chegou ${s.eva_pre}, saiu ${s.eva_pos}${d > 0 ? ` (caiu ${d})` : d < 0 ? ` (subiu ${-d})` : ''}.`)
  } else if (s.eva_pre != null) {
    partes.push(`chegou ${s.eva_pre}.`)
  }
  if (checkpoint?.queda_pontos != null) {
    partes.push(`Caiu ${checkpoint.queda_pontos} ${checkpoint.queda_pontos === 1 ? 'ponto' : 'pontos'} desde o início.`)
  }
  if (checkpoint?.relatorio_impresso_em) partes.push('Relatório entregue.')
  if (s.destravamento && s.destrav_regioes.length > 0) partes.push(`Destravou ${listar(s.destrav_regioes)}.`)
  const comp: string[] = []
  if (s.moxa) comp.push('Moxa')
  if (s.eletro) comp.push('Eletro')
  if (s.ventosa) comp.push('Ventosa')
  if (s.respiracao_guiada) comp.push('Respiração guiada')
  if (comp.length > 0) partes.push(`${comp.join(' e ')}.`)
  if (s.auriculo) partes.push('Levou sementes.')
  if (s.intercorrencias.length > 0) partes.push(`Houve ${listar(s.intercorrencias)}.`)
  return partes.join(' ') || 'sem anotações neste dia.'
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <p className="small">
      <span className="muted">{rotulo}: </span>
      {valor}
    </p>
  )
}

// A HISTÓRIA da ficha (spec §1.2): frases geradas por sessão, nunca tabela.
// Cada item expande o prontuário completo do dia; "ver desde o começo" abre tudo.
export default function HistoriaFeed({ sessoes, avaliacoes, ciclos }: Props) {
  const [abertos, setAbertos] = useState<Record<string, boolean>>({})
  const [tudo, setTudo] = useState(false)

  const itens: Item[] = []

  for (const s of sessoes) {
    if (s.status === 'em_andamento') continue
    const checkpoint = avaliacoes.find((a) => a.sessao_id === s.id && a.tipo === 'checkpoint') ?? null
    itens.push({ chave: `s-${s.id}`, quando: s.concluida_em ?? s.iniciada_em, tipo: 'sessao', sessao: s, checkpoint })
  }

  for (const c of ciclos) {
    if (c.status === 'concluido' && c.proxima_fase === 'alta' && c.concluido_em) {
      const base = avaliacoes.find((a) => a.ciclo_id === c.id && a.tipo === 'inicial')?.eva ?? null
      const ultima = [...sessoes].reverse().find((s) => s.ciclo_id === c.id && s.status === 'concluida' && s.eva_pos != null)
      const extra = base != null && ultima?.eva_pos != null ? ` Começou em ${base}, saiu em ${ultima.eva_pos}.` : ''
      itens.push({
        chave: `alta-${c.id}`,
        quando: c.concluido_em,
        tipo: 'marco',
        texto: `Alta em ${diaPorExtenso(c.concluido_em)}.${extra}`,
      })
    }
    if (c.status === 'garantia_acionada') {
      itens.push({
        chave: `garantia-${c.id}`,
        quando: c.concluido_em ?? c.atualizado_em,
        tipo: 'marco',
        texto: 'Garantia acionada — ciclo encerrado com devolução.',
      })
    }
  }

  itens.sort((a, b) => b.quando.localeCompare(a.quando))

  if (itens.length === 0) {
    return <p className="muted">A história começa na primeira sessão.</p>
  }

  const visiveis = tudo ? itens : itens.slice(0, 4)

  return (
    <div className="stack">
      {visiveis.map((item) => {
        if (item.tipo === 'marco') {
          return (
            <article key={item.chave} className="card-flat" style={{ padding: 16 }}>
              <p>{item.texto}</p>
            </article>
          )
        }

        const s = item.sessao
        const aberto = !!abertos[item.chave]
        const orientacoes = [...s.orientacoes, ...(s.orientacao_livre ? [s.orientacao_livre] : [])]
        return (
          <article key={item.chave} className="card-flat stack" style={{ padding: 16 }}>
            <button
              type="button"
              aria-expanded={aberto}
              onClick={() => setAbertos((a) => ({ ...a, [item.chave]: !a[item.chave] }))}
              style={{ textAlign: 'left', width: '100%', minHeight: 56 }}
            >
              <span style={{ display: 'block', lineHeight: 1.5 }}>
                <strong>{tituloSessao(s)}</strong>
                <span className="mono small muted"> · {diaCurto(item.quando)}</span>
                {' — '}
                {fraseSessao(s, item.checkpoint)}
              </span>
              <span className="small" style={{ display: 'block', marginTop: 4, color: 'var(--jade)', fontWeight: 600 }}>
                {aberto ? 'fechar os detalhes' : 'ver o dia completo'}
              </span>
            </button>

            {aberto && (
              <div className="stack" style={{ borderTop: '1px solid var(--hairline)', paddingTop: 12 }}>
                <Linha
                  rotulo="Horário"
                  valor={`${horaCurta(s.iniciada_em)}${s.concluida_em ? ` até ${horaCurta(s.concluida_em)}` : ''}`}
                />
                <Linha
                  rotulo="Dor"
                  valor={
                    s.eva_pre != null || s.eva_pos != null
                      ? `chegou ${s.eva_pre ?? '—'} → saiu ${s.eva_pos ?? '—'}`
                      : 'não registrada'
                  }
                />
                <Linha
                  rotulo="Massagem preparatória"
                  valor={
                    s.destravamento === true
                      ? s.destrav_regioes.length > 0
                        ? listar(s.destrav_regioes)
                        : 'sim'
                      : s.destravamento === false
                        ? 'não precisou'
                        : 'não anotado'
                  }
                />
                <Linha rotulo="Pontos" valor={s.pontos.length > 0 ? s.pontos.join(' · ') : 'não anotados'} />
                {s.auriculo && s.auriculo_pontos.length > 0 && (
                  <Linha rotulo="Sementes (auriculo)" valor={s.auriculo_pontos.join(', ')} />
                )}
                <Linha
                  rotulo="Agulhas"
                  valor={
                    s.agulhas_colocadas != null
                      ? `${s.agulhas_colocadas} colocadas · ${s.agulhas_retiradas ?? s.agulhas_colocadas} retiradas${
                          s.agulhas_conferidas ? ' · conferidas ✓' : ''
                        }`
                      : 'não anotadas'
                  }
                />
                <Linha rotulo="Orientação de casa" valor={orientacoes.length > 0 ? orientacoes.join(' · ') : 'nenhuma anotada'} />
                <Linha
                  rotulo="Correu tudo bem?"
                  valor={
                    s.intercorrencias.length > 0
                      ? `houve ${listar(s.intercorrencias)}${s.intercorrencia_obs ? ` — ${s.intercorrencia_obs}` : ''}`
                      : 'sim, tudo bem'
                  }
                />
                {s.historia && <Linha rotulo="História da dor" valor={s.historia} />}
                {s.medicacoes && <Linha rotulo="Medicações" valor={s.medicacoes} />}
                <Link to={`/sessao/${s.id}`} className="small" style={{ fontWeight: 600 }}>
                  corrigir esta sessão →
                </Link>
              </div>
            )}
          </article>
        )
      })}

      {itens.length > 4 && (
        <button type="button" className="btn btn-ghost btn-block" onClick={() => setTudo(!tudo)}>
          {tudo ? 'mostrar só os últimos' : `ver desde o começo (${itens.length} registros)`}
        </button>
      )}
    </div>
  )
}
