// Passo 9 — PRÓXIMA SESSÃO (spec §3.1): 1º botão "MESMA HORA, SEMANA QUE
// VEM" com verificação de vaga real; desvio escrito quando ocupada; 2ª vaga
// da semana só nas sessões 1–5; agenda; marcar depois; WhatsApp opcional.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { diaCurto, diaPorExtenso, horaCurta, dataISO, mesmaHoraSemanaQueVem } from '../../lib/datas'
import { proximasVagasLivres } from '../../lib/sessaoService'
import { nomeCurto } from '../../lib/tipos'
import BotaoWhatsApp from '../whatsapp/BotaoWhatsApp'
import { criarAgendamento, vagaLivre, vagasLivresDoDia } from './dadosSessao'
import type { CtxSessao } from './tiposSessao'
import type { Agendamento } from '../../lib/tipos'

type Opcao = { inicio: Date; rotulo: string; detalhe: string }

export default function PassoProximaSessao({ ctx }: { ctx: CtxSessao }) {
  const navegar = useNavigate()
  const { sessao, paciente, config, agendamento, numeroDaSessao } = ctx

  const [opcoes, setOpcoes] = useState<Opcao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [marcado, setMarcado] = useState<Agendamento | null>(null)

  useEffect(() => {
    let vivo = true
    async function montar() {
      try {
        const lista: Opcao[] = []
        const baseInicio = agendamento?.inicio ?? sessao.iniciada_em
        const alvo = mesmaHoraSemanaQueVem(baseInicio)

        if (await vagaLivre(alvo)) {
          lista.push({
            inicio: alvo,
            rotulo: 'Mesma hora, semana que vem',
            detalhe: `${diaPorExtenso(alvo)} · ${horaCurta(alvo)} ✓`,
          })
        } else {
          const doDia = await vagasLivresDoDia(alvo, config)
          const alternativa = doDia.find((v) => v.getTime() !== alvo.getTime())
          if (alternativa) {
            lista.push({
              inicio: alternativa,
              rotulo: 'Semana que vem, mesmo dia',
              detalhe: `${diaCurto(alternativa)} · ${horaCurta(alternativa)} — a das ${horaCurta(alvo)} já tem gente.`,
            })
          }
        }

        // 2ª vaga da semana — só na fase 2×/semana (sessões 1–5)
        if ((numeroDaSessao ?? 99) <= 5) {
          const livres = await proximasVagasLivres(12)
          const daSemana = livres
            .map((v) => new Date(v.inicio))
            .find(
              (v) =>
                v.getTime() < alvo.getTime() &&
                v.getTime() > Date.now() + 24 * 3600 * 1000 &&
                dataISO(v) !== dataISO(new Date()) &&
                !lista.some((o) => o.inicio.getTime() === v.getTime()),
            )
          if (daSemana) {
            lista.push({
              inicio: daSemana,
              rotulo: '2ª vaga da semana',
              detalhe: `${diaCurto(daSemana)} · ${horaCurta(daSemana)} (fase de 2× por semana)`,
            })
          }
        }

        if (lista.length === 0) {
          const livres = await proximasVagasLivres(2)
          for (const v of livres) {
            lista.push({
              inicio: new Date(v.inicio),
              rotulo: 'Próxima vaga livre',
              detalhe: `${diaPorExtenso(v.inicio)} · ${horaCurta(v.inicio)}`,
            })
          }
        }
        if (vivo) setOpcoes(lista)
      } catch {
        if (vivo) setErro('Não consegui olhar a agenda agora — dá para marcar depois, sem perda.')
      } finally {
        if (vivo) setCarregando(false)
      }
    }
    void montar()
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function marcar(opcao: Opcao) {
    setErro(null)
    try {
      const novo = await criarAgendamento({
        paciente_id: paciente.id,
        ciclo_id: sessao.ciclo_id,
        tipo: sessao.tipo === 'manutencao' ? 'manutencao' : 'ciclo',
        inicio: opcao.inicio,
        duracao_min: config?.duracao_ciclo_min ?? 50,
      })
      setMarcado(novo)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui marcar — tente outra vaga.')
    }
  }

  if (marcado) {
    return (
      <section className="stack-lg" style={{ textAlign: 'center' }}>
        <h2>Próxima sessão marcada ✓</h2>
        <p style={{ fontSize: 22 }}>
          {diaPorExtenso(marcado.inicio)} às {horaCurta(marcado.inicio)}
        </p>
        <BotaoWhatsApp
          pacienteId={paciente.id}
          telefone={paciente.telefone_wa}
          template="remarcacao"
          dados={{ nome: paciente.nome, tratamento: paciente.tratamento, dia: marcado.inicio, hora: marcado.inicio }}
          refs={{ agendamentoId: marcado.id, sessaoId: sessao.id }}
          rotulo="Mandar confirmação"
          className="btn btn-whatsapp btn-block"
        />
        <button type="button" className="btn btn-primary btn-xl" onClick={ctx.avancar}>
          Agora não — seguir para o fim →
        </button>
      </section>
    )
  }

  return (
    <section className="stack-lg">
      <h2>Próxima sessão da {nomeCurto(paciente)}</h2>

      {carregando && <p className="muted">Olhando a agenda…</p>}

      {opcoes.map((o, i) => (
        <button
          key={o.inicio.toISOString()}
          type="button"
          className={i === 0 ? 'btn btn-primary btn-xl' : 'btn btn-ghost btn-xl'}
          style={{ flexDirection: 'column', gap: 4 }}
          onClick={() => void marcar(o)}
        >
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{o.rotulo}</span>
          <span style={{ fontWeight: 400, fontSize: 18 }}>{o.detalhe}</span>
        </button>
      ))}

      {!carregando && opcoes.length === 0 && (
        <p className="muted">Não achei vaga pronta — escolha na agenda ou marque depois.</p>
      )}

      <button type="button" className="btn btn-ghost btn-block" onClick={() => navegar('/agenda')}>
        escolher outro dia › (abre a agenda)
      </button>
      <button type="button" className="btn btn-ghost btn-block" onClick={ctx.avancar}>
        marcar depois
      </button>

      {erro && (
        <p className="small" style={{ fontWeight: 600, color: 'var(--ink-60)' }}>
          {erro}
        </p>
      )}
    </section>
  )
}
