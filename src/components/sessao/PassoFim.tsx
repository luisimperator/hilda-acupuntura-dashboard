// Passo 10 — FIM (spec §3.1): "Tudo anotado, Hilda." + resumo. Conclui a
// sessão (status concluida + agendamento realizada). No fim do ciclo,
// pergunta a próxima fase antes de voltar para o dia.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { diaCurto, horaCurta } from '../../lib/datas'
import { nomeCurto, NOME_PROGRAMA } from '../../lib/tipos'
import type { Agendamento } from '../../lib/tipos'
import type { Enums } from '../../lib/database.types'
import { concluirSessao, definirProximaFase, proximoAgendamento } from './dadosSessao'
import { listar, type CtxSessao } from './tiposSessao'

export default function PassoFim({ ctx }: { ctx: CtxSessao }) {
  const navegar = useNavigate()
  const { sessao, paciente, ciclo, correcao, numeroDaSessao } = ctx

  const [estado, setEstado] = useState<'gravando' | 'pronto' | 'erro'>(
    correcao || sessao.status === 'concluida' ? 'pronto' : 'gravando',
  )
  const [erro, setErro] = useState<string | null>(null)
  const [proxima, setProxima] = useState<Agendamento | null>(null)
  const [faseEscolhida, setFaseEscolhida] = useState<Enums<'proxima_fase_t'> | null>(ciclo?.proxima_fase ?? null)
  const [faseAdiada, setFaseAdiada] = useState(false)
  const [erroFase, setErroFase] = useState<string | null>(null)

  const fimDoCiclo =
    !correcao && ciclo != null && numeroDaSessao != null && numeroDaSessao >= ciclo.sessoes_total

  async function concluir() {
    setErro(null)
    setEstado('gravando')
    try {
      await concluirSessao(sessao)
      ctx.atualizarSessao({ status: 'concluida' })
      setEstado('pronto')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui concluir ainda — tente de novo.')
      setEstado('erro')
    }
  }

  useEffect(() => {
    if (!correcao && sessao.status === 'em_andamento') void concluir()
    void proximoAgendamento(paciente.id).then(setProxima)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function escolherFase(fase: Enums<'proxima_fase_t'>) {
    if (!ciclo) return
    setErroFase(null)
    try {
      const novo = await definirProximaFase({ ciclo, fase })
      ctx.definirCiclo(novo)
      setFaseEscolhida(fase)
    } catch (e) {
      setErroFase(e instanceof Error ? e.message : 'Não consegui registrar — tente de novo.')
    }
  }

  if (correcao) {
    return (
      <section className="stack-lg" style={{ textAlign: 'center' }}>
        <p className="num-display" style={{ fontSize: 64, color: 'var(--jade)' }}>✓</p>
        <h1>Registro corrigido.</h1>
        <p className="muted">Tudo guardado — a história da ficha já mostra a versão nova.</p>
        <button
          type="button"
          className="btn btn-primary btn-xl"
          onClick={() => navegar(`/paciente/${paciente.id}`)}
        >
          Voltar para a ficha →
        </button>
      </section>
    )
  }

  if (estado === 'erro') {
    return (
      <section className="stack-lg" style={{ textAlign: 'center' }}>
        <h2>Quase lá.</h2>
        <p className="muted">{erro}</p>
        <button type="button" className="btn btn-primary btn-xl" onClick={() => void concluir()}>
          Tentar concluir de novo
        </button>
      </section>
    )
  }

  if (estado === 'gravando') {
    return (
      <section className="stack-lg" style={{ textAlign: 'center' }}>
        <p className="muted" style={{ fontSize: 22 }}>Guardando a sessão…</p>
      </section>
    )
  }

  const resumo: string[] = []
  if (sessao.eva_pre != null && sessao.eva_pos != null) resumo.push(`${sessao.eva_pre} → ${sessao.eva_pos}`)
  if (sessao.destravamento && sessao.destrav_regioes.length > 0)
    resumo.push(`destravou ${listar(sessao.destrav_regioes)}`)
  if (sessao.agulhas_colocadas != null) resumo.push(`${sessao.agulhas_colocadas} agulhas ✓`)

  return (
    <section className="stack-lg" style={{ textAlign: 'center' }}>
      <p className="num-display" style={{ fontSize: 64, color: 'var(--jade)' }}>✓</p>
      <h1>Tudo anotado, Hilda.</h1>
      <div className="card-flat stack">
        <p style={{ fontSize: 20, fontWeight: 600 }}>
          {paciente.nome}
          {ciclo && numeroDaSessao != null
            ? ` · sessão ${numeroDaSessao} de ${ciclo.sessoes_total} (${NOME_PROGRAMA[ciclo.programa]})`
            : ''}
        </p>
        {resumo.length > 0 && <p style={{ fontSize: 20 }}>{resumo.join(' · ')}</p>}
        <p className="muted">
          {proxima
            ? `próxima: ${diaCurto(proxima.inicio)}, ${horaCurta(proxima.inicio)}`
            : 'próxima sessão ainda não marcada — fica lembrado na ficha.'}
        </p>
      </div>

      {fimDoCiclo && (
        <div className="card stack" style={{ borderColor: 'var(--gold)', textAlign: 'left' }}>
          <p className="eyebrow" style={{ color: '#7a5c26' }}>fim do ciclo</p>
          <p style={{ fontWeight: 600, fontSize: 20 }}>
            Este foi o último encontro do ciclo da {nomeCurto(paciente)} — o que vem agora?
          </p>
          {faseEscolhida ? (
            <p style={{ color: 'var(--jade)', fontWeight: 600 }}>
              {faseEscolhida === 'manutencao'
                ? 'Manutenção mensal registrada ✓'
                : faseEscolhida === 'alta'
                  ? 'Alta registrada ✓ — o follow-up de 30 dias entra sozinho nas mensagens.'
                  : 'Registrado ✓'}
            </p>
          ) : faseAdiada ? (
            <p className="muted">Sem pressa — o botão da ficha lembra você de decidir.</p>
          ) : (
            <div className="choice-row">
              <button type="button" className="choice" onClick={() => void escolherFase('manutencao')}>
                Manutenção mensal
              </button>
              <button type="button" className="choice" onClick={() => void escolherFase('alta')}>
                Alta
              </button>
              <button type="button" className="choice" onClick={() => setFaseAdiada(true)}>
                Decidir depois
              </button>
            </div>
          )}
          {erroFase && (
            <p className="small" style={{ fontWeight: 600, color: 'var(--ink-60)' }}>
              {erroFase}
            </p>
          )}
        </div>
      )}

      <button type="button" className="btn btn-primary btn-xl" onClick={() => navegar('/inicio')}>
        Voltar para o meu dia →
      </button>
    </section>
  )
}
