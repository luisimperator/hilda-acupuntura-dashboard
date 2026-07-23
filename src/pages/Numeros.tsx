// NÚMEROS — a área do Fernando (spec §7).
// Densidade adulta, mesma marca. Filtro de mês no topo; tudo lê das views
// (v_receita_mensal, v_funil_mensal, v_objecoes_mensal, v_ocupacao_semanal,
// v_eva_marketing, v_efeito_destravamento) — o front só renderiza.

import { useEffect, useState, type CSSProperties } from 'react'
import { dinheiro } from '../lib/datas'
import CardMetrica from '../components/numeros/CardMetrica'
import FunilBarras from '../components/numeros/FunilBarras'
import TabelaObjecoes from '../components/numeros/TabelaObjecoes'
import OcupacaoSemanal from '../components/numeros/OcupacaoSemanal'
import { baixarCsvMes } from '../components/numeros/exportarCsv'
import {
  carregarNumeros,
  diaMes,
  mesAtualISO,
  pctTexto,
  reais,
  rotuloMes,
  somarMeses,
  type DadosNumeros,
} from '../components/numeros/dadosNumeros'

/** "3,2" — número decimal em pt-BR */
function virgula(v: number | null | undefined): string {
  return v == null ? '—' : String(v).replace('.', ',')
}

const GRID_CARDS: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))',
  gap: 14,
}

export default function Numeros() {
  const [mes, setMes] = useState(mesAtualISO)
  const [dados, setDados] = useState<DadosNumeros | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro(null)
    carregarNumeros(mes)
      .then((d) => {
        if (!ativo) return
        setDados(d)
        setCarregando(false)
      })
      .catch(() => {
        if (!ativo) return
        setErro('Não consegui somar os números agora. Confira a internet e tente de novo.')
        setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [mes, tentativa])

  const noMesAtual = mes >= mesAtualISO()
  const funil = dados?.funil ?? null
  const receita = dados?.receita ?? null
  const evaMkt = dados?.evaMarketing ?? null

  // Metas do playbook, impressas na tela: fechamento 50% na sala → 60% em 7 dias
  const taxaSala = funil?.taxa_sala_pct ?? null
  const taxaTotal = funil?.taxa_total_pct ?? null
  const ticket = receita?.ticket_medio_programa ?? null

  const reavaliacoes = evaMkt?.reavaliacoes ?? 0
  const pctCriterio =
    reavaliacoes > 0 ? Math.round(((evaMkt?.criterio_atingido ?? 0) / reavaliacoes) * 100) : null

  const comDestrav = dados?.destravamento.find((e) => e.destravamento === true) ?? null
  const semDestrav = dados?.destravamento.find((e) => e.destravamento === false) ?? null

  const faltasMes = (dados?.ocupacao ?? []).reduce((soma, s) => soma + (s.faltas ?? 0), 0)
  const realizadasMes = (dados?.ocupacao ?? []).reduce((soma, s) => soma + (s.realizadas ?? 0), 0)
  const pctFaltas =
    faltasMes + realizadasMes > 0
      ? Math.round((faltasMes / (faltasMes + realizadasMes)) * 100)
      : null

  const previsivelCentavos = (dados?.continuidadeAtivos ?? 0) * (dados?.precoContinuidadeCentavos ?? 0)
  const totalGarantiasCentavos = (dados?.garantias ?? []).reduce((s, g) => s + g.valorCentavos, 0)

  return (
    <div className="stack-lg">
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 14 }}>
        <div>
          <span className="eyebrow">área do Fernando</span>
          <h1>Números do consultório</h1>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => dados && baixarCsvMes(dados)}
          disabled={!dados}
        >
          Exportar mês (CSV)
        </button>
      </div>

      {/* Filtro de mês */}
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <button className="btn btn-ghost" onClick={() => setMes((m) => somarMeses(m, -1))}>
          ‹ mês anterior
        </button>
        <h2>{rotuloMes(mes)}</h2>
        <button
          className="btn btn-ghost"
          onClick={() => setMes((m) => somarMeses(m, 1))}
          disabled={noMesAtual}
        >
          mês seguinte ›
        </button>
      </div>

      {erro && (
        <div className="card-flat" style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 14 }}>{erro}</p>
          <button className="btn btn-primary" onClick={() => setTentativa((t) => t + 1)}>
            Tentar de novo
          </button>
        </div>
      )}

      {!erro && carregando && !dados && <p className="muted">Somando o mês…</p>}

      {!erro && dados && (
        <>
          {carregando && <p className="muted small">Atualizando…</p>}

          {/* ---- Linha 1 · O MÊS ---- */}
          <section className="stack">
            <span className="eyebrow">O mês</span>
            <div style={GRID_CARDS}>
              <CardMetrica
                rotulo="Receita recebida"
                valor={reais(receita?.receita_reais ?? 0)}
                nota={
                  <>
                    {receita?.lancamentos ?? 0} lançamentos no caixa · devoluções de garantia
                    entram negativas
                  </>
                }
              />
              <CardMetrica
                rotulo="Primeiras sessões"
                valor={String(funil?.primeiras_sessoes ?? 0)}
                nota={`${receita?.programas_fechados ?? 0} programas fechados no mês`}
              />
              <CardMetrica
                rotulo="Fechamento na sala"
                valor={pctTexto(taxaSala)}
                selo={
                  taxaSala == null
                    ? null
                    : taxaSala >= 50
                      ? { texto: 'meta 50% · batida ✓', tom: 'jade' }
                      : { texto: 'meta 50% · abaixo', tom: 'sand' }
                }
                nota={taxaSala == null ? 'sem propostas neste mês' : undefined}
              />
              <CardMetrica
                rotulo="Fechamento em 7 dias"
                valor={pctTexto(taxaTotal)}
                selo={
                  taxaTotal == null
                    ? null
                    : taxaTotal >= 60
                      ? { texto: 'meta 60% · batida ✓', tom: 'jade' }
                      : { texto: 'meta 60% · abaixo', tom: 'sand' }
                }
                nota={taxaTotal == null ? 'sem propostas neste mês' : undefined}
              />
              <CardMetrica
                rotulo="Ticket médio de programa"
                valor={ticket == null ? '—' : reais(ticket)}
                selo={
                  ticket == null
                    ? null
                    : ticket >= 3000
                      ? { texto: 'meta R$ 3.000 · batida ✓', tom: 'jade' }
                      : { texto: 'meta R$ 3.000 · abaixo', tom: 'sand' }
                }
                nota={ticket == null ? 'nenhum programa fechado no mês' : undefined}
              />
            </div>
          </section>

          {/* ---- Linha 2 · O PRODUTO ---- */}
          <section className="stack">
            <span className="eyebrow">O produto</span>
            <div style={GRID_CARDS}>
              <CardMetrica
                rotulo="Queda média de EVA no checkpoint"
                valor={reavaliacoes > 0 ? `${virgula(evaMkt?.queda_media_pontos)} pontos` : '—'}
                selo={reavaliacoes > 0 ? { texto: 'desde o início', tom: 'sand' } : null}
                nota={
                  reavaliacoes > 0 ? (
                    <>
                      A headline pronta: “queda média de {virgula(evaMkt?.queda_media_pontos)}{' '}
                      pontos em {reavaliacoes} pacientes”
                    </>
                  ) : (
                    'Ainda sem reavaliações de 5ª sessão.'
                  )
                }
              />
              <CardMetrica
                rotulo="Ciclos com critério atingido"
                valor={pctCriterio == null ? '—' : `${pctCriterio}%`}
                nota={
                  pctCriterio == null
                    ? 'Ainda sem reavaliações de 5ª sessão.'
                    : `${evaMkt?.criterio_atingido ?? 0} de ${reavaliacoes} reavaliações · o combinado: cair 2 pontos ou 30%`
                }
              />
              <div className="card-flat" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="eyebrow" style={{ color: 'var(--ink-60)' }}>
                  Efeito do destravamento
                </span>
                {comDestrav || semDestrav ? (
                  <>
                    <div className="row" style={{ gap: 26, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div>
                        <span className="num-display" style={{ fontSize: 'clamp(26px, 3vw, 36px)' }}>
                          {virgula(comDestrav?.queda_media_na_sessao)}
                        </span>
                        <div className="small muted">
                          com · {comDestrav?.sessoes ?? 0} sessões
                        </div>
                      </div>
                      <div>
                        <span className="num-display" style={{ fontSize: 'clamp(26px, 3vw, 36px)' }}>
                          {virgula(semDestrav?.queda_media_na_sessao)}
                        </span>
                        <div className="small muted">
                          sem · {semDestrav?.sessoes ?? 0} sessões
                        </div>
                      </div>
                    </div>
                    <span className="small" style={{ color: 'var(--ink-60)' }}>
                      queda média de EVA na própria sessão · desde o início
                    </span>
                  </>
                ) : (
                  <span className="muted">Ainda sem sessões concluídas para comparar.</span>
                )}
              </div>
            </div>
            <div className="card-flat">
              <h3 style={{ marginBottom: 14 }}>Objeções do mês</h3>
              <TabelaObjecoes objecoes={dados.objecoes} />
            </div>
          </section>

          {/* ---- Linha 3 · A OPERAÇÃO ---- */}
          <section className="stack">
            <span className="eyebrow">A operação</span>
            <div className="grid-2">
              <div className="card-flat">
                <h3 style={{ marginBottom: 14 }}>Funil do mês</h3>
                <FunilBarras funil={funil} />
              </div>
              <div className="card-flat">
                <h3 style={{ marginBottom: 14 }}>Ocupação semanal</h3>
                <OcupacaoSemanal semanas={dados.ocupacao} capacidade={dados.capacidadeSemana} />
              </div>
            </div>
            <div style={GRID_CARDS}>
              <CardMetrica
                rotulo="Faltas no mês"
                valor={String(faltasMes)}
                nota={
                  pctFaltas == null
                    ? 'nenhuma sessão realizada ainda'
                    : `${pctFaltas}% das ${faltasMes + realizadasMes} sessões que aconteceriam`
                }
              />
              <CardMetrica
                rotulo="Assinantes de Continuidade"
                valor={String(dados.continuidadeAtivos)}
                selo={
                  dados.continuidadeAtivos > 0
                    ? { texto: `${dinheiro(previsivelCentavos)}/mês previsíveis`, tom: 'jade' }
                    : null
                }
                nota="cada 5 assinantes = R$ 6,4 mil por mês previsíveis"
              />
              <div className="card-flat" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="eyebrow" style={{ color: 'var(--ink-60)' }}>
                  Garantias acionadas
                </span>
                {dados.garantias.length === 0 ? (
                  <span className="muted">Nenhuma garantia acionada neste mês.</span>
                ) : (
                  <>
                    <span className="num-display" style={{ fontSize: 'clamp(26px, 3vw, 36px)' }}>
                      {dinheiro(totalGarantiasCentavos)}
                    </span>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {dados.garantias.map((g, i) => (
                        <li key={`${g.paciente}-${i}`} className="small">
                          {g.paciente} · <span className="mono">{dinheiro(g.valorCentavos)}</span>
                          {' · '}
                          {diaMes(g.pagoEm)}
                          {g.descricao ? ` · ${g.descricao}` : ''}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
