// AGENDA (spec §1.3) — a semana como lista vertical de dias, só os dias da
// grade. Vaga livre = "+ marcar aqui"; agendamento tocado = cartão de ações;
// remarcar é um diálogo com título persistente, nunca um "modo" escondido.
// ?paciente=<id> (vindo da Ficha/Sessão) entra já marcando para a paciente.

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import CartaoAgendamento from '../components/agenda/CartaoAgendamento'
import DialogoRemarcar from '../components/agenda/DialogoRemarcar'
import FolhaMarcar from '../components/agenda/FolhaMarcar'
import SemanaLista from '../components/agenda/SemanaLista'
import type { ModoAgenda } from '../components/agenda/SlotLinha'
import {
  carregarSemana,
  cicloAtivoDe,
  criarAgendamento,
  instanteDoDia,
  somarDias,
  tipoSugerido,
  vagaComporta,
  type DadosAgenda,
  type DiaAgenda,
} from '../components/agenda/agendaDados'
import { diaPorExtenso, horaCurta } from '../lib/datas'
import { supabase } from '../lib/supabase'
import { nomeCurto, type Agendamento, type Ciclo, type Paciente } from '../lib/tipos'

const FUSO = 'America/Sao_Paulo'

function rotuloSemana(segundaISO: string): string {
  const seg = instanteDoDia(segundaISO, '12:00')
  const dom = instanteDoDia(somarDias(segundaISO, 6), '12:00')
  const diaSeg = seg.toLocaleDateString('pt-BR', { timeZone: FUSO, day: 'numeric' })
  const diaDom = dom.toLocaleDateString('pt-BR', { timeZone: FUSO, day: 'numeric' })
  const mesSeg = seg.toLocaleDateString('pt-BR', { timeZone: FUSO, month: 'long' })
  const mesDom = dom.toLocaleDateString('pt-BR', { timeZone: FUSO, month: 'long' })
  return mesSeg === mesDom
    ? `de ${diaSeg} a ${diaDom} de ${mesDom}`
    : `de ${diaSeg} de ${mesSeg} a ${diaDom} de ${mesDom}`
}

type MarcandoPara = { paciente: Paciente; ciclo: Ciclo | null }
type Remarcando = { agendamento: Agendamento; paciente: Paciente | null }
type FolhaVaga = { dia: DiaAgenda; inicio: Date }
type CartaoAberto = { agendamento: Agendamento; paciente: Paciente | null }

export default function Agenda() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const pacienteParam = searchParams.get('paciente')

  const [desloc, setDesloc] = useState(0)
  const [dados, setDados] = useState<DadosAgenda | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [marcandoPara, setMarcandoPara] = useState<MarcandoPara | null>(null)
  const [folhaVaga, setFolhaVaga] = useState<FolhaVaga | null>(null)
  const [cartao, setCartao] = useState<CartaoAberto | null>(null)
  const [remarcando, setRemarcando] = useState<Remarcando | null>(null)
  const [destinoRemarcar, setDestinoRemarcar] = useState<Date | null>(null)
  // Remarcar começa na folha rápida (as próximas vagas livres). Só quem pede
  // "escolher outra vaga na agenda" cai no modo de varrer a semana.
  const [folhaRemarcar, setFolhaRemarcar] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const varrendoAgenda = remarcando != null && !folhaRemarcar

  const recarregar = useCallback(() => {
    carregarSemana(desloc).then(
      (d) => {
        setDados(d)
        setErro(null)
        setCarregando(false)
      },
      () => {
        setErro('Não consegui abrir a agenda agora. Confira a internet e toque em "tentar de novo".')
        setCarregando(false)
      },
    )
  }, [desloc])

  useEffect(() => {
    setCarregando(true)
    recarregar()
  }, [recarregar])

  // ?paciente=<id> — entra já no modo "marcando para a paciente X"
  useEffect(() => {
    if (!pacienteParam) {
      setMarcandoPara(null)
      return
    }
    let vivo = true
    ;(async () => {
      const r = await supabase.from('pacientes').select('*').eq('id', pacienteParam).maybeSingle()
      if (!vivo || !r.data) return
      const ciclo = await cicloAtivoDe(r.data.id)
      if (!vivo) return
      setMarcandoPara({ paciente: r.data, ciclo })
    })().catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [pacienteParam])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(t)
  }, [toast])

  function sairDoMarcar() {
    setMarcandoPara(null)
    if (pacienteParam) setSearchParams({}, { replace: true })
  }

  async function marcarParaPaciente(dia: DiaAgenda, inicio: Date) {
    if (!marcandoPara || !dados) return
    const { paciente, ciclo } = marcandoPara
    const tipo = tipoSugerido(paciente, ciclo)
    const duracaoMin = tipo === 'primeira' ? dados.config.duracaoPrimeiraMin : dados.config.passoMin
    if (!vagaComporta(dia, inicio, duracaoMin)) {
      setToast(`Essa vaga não comporta a Primeira Sessão de ${duracaoMin} min — o horário seguinte já tem gente.`)
      return
    }
    const r = await criarAgendamento({
      paciente,
      cicloId: tipo === 'ciclo' || tipo === 'manutencao' ? (ciclo?.id ?? null) : null,
      tipo,
      inicio,
      duracaoMin,
    })
    if ('erro' in r) {
      setToast(r.erro)
      recarregar()
      return
    }
    setToast(`Guardado: ${nomeCurto(paciente)}, ${diaPorExtenso(inicio)} às ${horaCurta(inicio)}.`)
    sairDoMarcar()
    recarregar()
  }

  function aoTocarVagaLivre(dia: DiaAgenda, inicio: Date) {
    if (varrendoAgenda && remarcando) {
      if (!vagaComporta(dia, inicio, remarcando.agendamento.duracao_min, remarcando.agendamento.id)) {
        setToast(
          `Essa vaga não comporta a sessão de ${remarcando.agendamento.duracao_min} min — o horário seguinte já tem gente.`,
        )
        return
      }
      setDestinoRemarcar(inicio)
      return
    }
    if (marcandoPara) {
      void marcarParaPaciente(dia, inicio)
      return
    }
    setFolhaVaga({ dia, inicio })
  }

  function aoTocarAgendamento(agendamento: Agendamento, paciente: Paciente | null) {
    if (remarcando) return // ocupadas ficam inertes durante a remarcação
    setCartao({ agendamento, paciente })
  }

  function fecharRemarcar(concluiu: boolean) {
    setDestinoRemarcar(null)
    // Fechar a folha rápida sem remarcar sai de vez; no modo agenda, ela só
    // volta para a semana e continua escolhendo.
    if (concluiu || folhaRemarcar) setRemarcando(null)
    setFolhaRemarcar(false)
  }

  const modo: ModoAgenda = varrendoAgenda ? 'remarcando' : marcandoPara ? 'marcando' : 'normal'
  const rotuloVagaLivre = varrendoAgenda
    ? 'mover a sessão para cá'
    : marcandoPara
      ? `+ marcar ${nomeCurto(marcandoPara.paciente)} aqui`
      : '+ marcar aqui'

  return (
    <div className="stack-lg">
      <div>
        <div className="eyebrow">Agenda</div>
        <h1>A semana</h1>
      </div>

      {/* Título persistente do modo remarcar — sem "modo" que ela possa esquecer */}
      {varrendoAgenda && remarcando && (
        <div
          className="card"
          style={{
            position: 'sticky',
            top: 8,
            zIndex: 150,
            background: 'var(--jade)',
            color: 'var(--cream)',
            padding: '16px 20px',
          }}
        >
          <div className="row-between" style={{ flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 18 }}>
              Remarcando a sessão de {remarcando.paciente ? nomeCurto(remarcando.paciente) : 'paciente'} —
              toque na nova vaga ou volte.
            </strong>
            <button
              type="button"
              className="btn"
              style={{ border: '1.5px solid rgba(247, 242, 234, 0.55)', color: 'var(--cream)' }}
              onClick={() => setRemarcando(null)}
            >
              Voltar sem remarcar
            </button>
          </div>
        </div>
      )}

      {/* Marcando para uma paciente vinda da Ficha/Sessão (?paciente=…) */}
      {!varrendoAgenda && marcandoPara && (
        <div
          className="card"
          style={{
            position: 'sticky',
            top: 8,
            zIndex: 150,
            background: 'var(--jade)',
            color: 'var(--cream)',
            padding: '16px 20px',
          }}
        >
          <div className="row-between" style={{ flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 18 }}>
              Marcando sessão para {nomeCurto(marcandoPara.paciente)} — toque numa vaga livre.
            </strong>
            <button
              type="button"
              className="btn"
              style={{ border: '1.5px solid rgba(247, 242, 234, 0.55)', color: 'var(--cream)' }}
              onClick={sairDoMarcar}
            >
              Voltar sem marcar
            </button>
          </div>
        </div>
      )}

      {/* ‹ semana anterior · semana seguinte › */}
      <div className="row-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <button type="button" className="btn btn-ghost" onClick={() => setDesloc((d) => d - 1)}>
          ‹ semana anterior
        </button>
        <div style={{ textAlign: 'center' }}>
          <strong style={{ fontSize: 20 }}>
            {dados ? `Semana ${rotuloSemana(dados.segundaISO)}` : '…'}
          </strong>
          {desloc !== 0 && (
            <button
              type="button"
              className="small"
              style={{
                display: 'block',
                margin: '4px auto 0',
                color: 'var(--jade)',
                textDecoration: 'underline',
                minHeight: 44,
              }}
              onClick={() => setDesloc(0)}
            >
              voltar para esta semana
            </button>
          )}
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => setDesloc((d) => d + 1)}>
          semana seguinte ›
        </button>
      </div>

      {carregando && <p className="muted">Abrindo a agenda…</p>}

      {!carregando && erro && (
        <div className="card stack">
          <p>{erro}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setCarregando(true)
              recarregar()
            }}
          >
            Tentar de novo
          </button>
        </div>
      )}

      {!carregando && !erro && dados && dados.config.grade.length === 0 && (
        <div className="empty-state">
          <div className="big">🗓</div>
          <p>A grade de horários ainda não está preenchida.</p>
          <p className="small">O Fernando resolve isso na configuração do consultório.</p>
        </div>
      )}

      {!carregando && !erro && dados && dados.config.grade.length > 0 && (
        <SemanaLista
          dias={dados.dias}
          modo={modo}
          agRemarcandoId={remarcando?.agendamento.id ?? null}
          rotuloVagaLivre={rotuloVagaLivre}
          aoTocarVagaLivre={aoTocarVagaLivre}
          aoTocarAgendamento={aoTocarAgendamento}
        />
      )}

      {folhaVaga && dados && (
        <FolhaMarcar
          dia={folhaVaga.dia}
          inicio={folhaVaga.inicio}
          config={dados.config}
          aoMarcou={(paciente) => {
            setToast(
              `Guardado: ${nomeCurto(paciente)}, ${diaPorExtenso(folhaVaga.inicio)} às ${horaCurta(folhaVaga.inicio)}.`,
            )
            setFolhaVaga(null)
            recarregar()
          }}
          aoFechar={() => setFolhaVaga(null)}
        />
      )}

      {cartao && (
        <CartaoAgendamento
          agendamento={cartao.agendamento}
          paciente={cartao.paciente}
          aoVerPaciente={() => navigate(`/paciente/${cartao.agendamento.paciente_id}`)}
          aoRemarcar={() => {
            setRemarcando({ agendamento: cartao.agendamento, paciente: cartao.paciente })
            setDestinoRemarcar(null)
            setFolhaRemarcar(true)
            setCartao(null)
          }}
          recarregar={recarregar}
          avisar={setToast}
          aoFechar={() => setCartao(null)}
        />
      )}

      {remarcando && (folhaRemarcar || destinoRemarcar) && (
        <DialogoRemarcar
          agendamento={remarcando.agendamento}
          paciente={remarcando.paciente}
          novoInicio={destinoRemarcar}
          aoRemarcou={recarregar}
          aoEscolherNaAgenda={folhaRemarcar ? () => setFolhaRemarcar(false) : undefined}
          aoFechar={fecharRemarcar}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
