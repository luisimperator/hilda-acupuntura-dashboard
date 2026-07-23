// TrilhoSessao — orquestra o Modo Sessão inteiro (spec §3): decide o trilho
// pela variante, grava CADA toque via autosave, mantém o cabeçalho da
// paciente sempre visível e cuida de retomada, rascunho local e saída segura.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { aoMudarEstadoAutosave, salvarSessao } from '../../lib/autosave'
import { supabase } from '../../lib/supabase'
import { varianteDaSessao } from '../../lib/sessaoService'
import type { TablesUpdate } from '../../lib/database.types'
import type { Avaliacao, Ciclo, Paciente, Proposta, RedFlags, Sessao } from '../../lib/tipos'
import type { PacoteSessao } from './dadosSessao'
import {
  passosDe,
  RASCUNHO_VAZIO,
  type CtxSessao,
  type Rascunho,
} from './tiposSessao'
import CabecalhoSessao from './CabecalhoSessao'
import FichaSobreposta from './FichaSobreposta'
import PassoCapa from './PassoCapa'
import PassoEva from './PassoEva'
import PassoDestravamento from './PassoDestravamento'
import PassoPontos from './PassoPontos'
import PassoComplementos from './PassoComplementos'
import PassoAgulhas from './PassoAgulhas'
import PassoIntercorrencia from './PassoIntercorrencia'
import PassoOrientacao from './PassoOrientacao'
import PassoProximaSessao from './PassoProximaSessao'
import PassoFim from './PassoFim'
import PassoMapa from './PassoMapa'
import PassoFrases from './PassoFrases'
import PassoFrequencia from './PassoFrequencia'
import PassoTermo from './primeira/PassoTermo'
import PassoCondicao from './primeira/PassoCondicao'
import PassoHistoria from './primeira/PassoHistoria'
import PassoRedFlags from './primeira/PassoRedFlags'
import PassoCautelas from './primeira/PassoCautelas'
import PassoPrescricao from './primeira/PassoPrescricao'
import PassoDesfecho from './primeira/PassoDesfecho'
import PassoPagamento from './primeira/PassoPagamento'
import PassoVeredito from './checkpoint/PassoVeredito'

export default function TrilhoSessao({ pacote }: { pacote: PacoteSessao }) {
  const navegar = useNavigate()

  const [sessao, setSessao] = useState<Sessao>(pacote.sessao)
  const [paciente, setPaciente] = useState<Paciente>(pacote.paciente)
  const [ciclo, setCiclo] = useState<Ciclo | null>(pacote.ciclo)
  const [propostaDaSessao, setProposta] = useState<Proposta | null>(pacote.propostaDaSessao)
  const [redFlagDaSessao, setRedFlag] = useState<RedFlags | null>(pacote.redFlagDaSessao)

  // sessão concluída reaberta pela ficha → modo correção (trilho clínico curto)
  const [correcao] = useState(() => pacote.sessao.status !== 'em_andamento')
  const variante = varianteDaSessao(sessao)
  const passos = useMemo(() => passosDe(variante, correcao), [variante, correcao])

  // Em modo correção o passo vive só na tela (não regrava passo_atual de
  // sessão concluída); no fluxo normal, retomada exata pelo passo_atual.
  const [passoCorrecao, setPassoCorrecao] = useState('eva_pre')
  const indiceBruto = passos.indexOf(correcao ? passoCorrecao : sessao.passo_atual)
  const indice = indiceBruto >= 0 ? indiceBruto : 0
  const passoAtual = passos[indice]

  // ---------- derivados do pacote ----------
  const avaliacaoInicial = useMemo(() => {
    if (sessao.ciclo_id) {
      const doCiclo = pacote.avaliacoes.find((a) => a.ciclo_id === sessao.ciclo_id && a.tipo === 'inicial')
      if (doCiclo) return doCiclo
    }
    return pacote.avaliacoes.find((a) => a.sessao_id === sessao.id && a.tipo === 'inicial') ?? null
  }, [pacote.avaliacoes, sessao.ciclo_id, sessao.id])

  const [avaliacaoCheckpoint, setCheckpoint] = useState<Avaliacao | null>(
    pacote.avaliacoes.find((a) => a.sessao_id === pacote.sessao.id && a.tipo === 'checkpoint') ?? null,
  )

  const ultimaSessao = useMemo(() => {
    const outras = pacote.sessoesConcluidas.filter((s) => s.id !== sessao.id)
    const doCiclo = sessao.ciclo_id ? outras.filter((s) => s.ciclo_id === sessao.ciclo_id) : []
    const lista = doCiclo.length > 0 ? doCiclo : outras
    return lista.length > 0 ? lista[lista.length - 1] : null
  }, [pacote.sessoesConcluidas, sessao.id, sessao.ciclo_id])

  // ---------- rascunho local (mapa, frases, frequência…) ----------
  const chaveRascunho = `hilda-sessao-rascunho-${sessao.id}`
  const [rascunho, setRascunho] = useState<Rascunho>(() => {
    try {
      const cru = localStorage.getItem(chaveRascunho)
      return cru ? { ...RASCUNHO_VAZIO, ...(JSON.parse(cru) as Partial<Rascunho>) } : RASCUNHO_VAZIO
    } catch {
      return RASCUNHO_VAZIO
    }
  })
  function mudarRascunho(parte: Partial<Rascunho>) {
    setRascunho((atual) => {
      const novo = { ...atual, ...parte }
      try {
        localStorage.setItem(chaveRascunho, JSON.stringify(novo))
      } catch {
        // sem localStorage o rascunho vive só em memória — segue o baile
      }
      return novo
    })
  }

  // ---------- autosave: selo "✓ guardado" + banner calmo de rede ----------
  const [guardado, setGuardado] = useState(false)
  const timerGuardado = useRef<number | null>(null)
  function piscarGuardado() {
    setGuardado(true)
    if (timerGuardado.current) window.clearTimeout(timerGuardado.current)
    timerGuardado.current = window.setTimeout(() => setGuardado(false), 2200)
  }
  useEffect(() => {
    return () => {
      if (timerGuardado.current) window.clearTimeout(timerGuardado.current)
    }
  }, [])

  const [rede, setRede] = useState<{ online: boolean; pendentes: number }>({ online: true, pendentes: 0 })
  useEffect(() => {
    aoMudarEstadoAutosave((online, pendentes) => setRede({ online, pendentes }))
  }, [])

  const [avisoFicha, setAvisoFicha] = useState<string | null>(null)

  // ---------- gravação a cada toque ----------
  function atualizarSessao(campos: TablesUpdate<'sessoes'>) {
    setSessao((s) => ({ ...s, ...campos }) as Sessao)
    void salvarSessao(sessao.id, campos).then(piscarGuardado)
  }

  function atualizarPaciente(campos: TablesUpdate<'pacientes'>) {
    setPaciente((p) => ({ ...p, ...campos }) as Paciente)
    void supabase
      .from('pacientes')
      .update(campos)
      .eq('id', paciente.id)
      .then(({ error }) => {
        if (error) setAvisoFicha('Uma anotação da ficha não subiu ainda — vou tentar de novo em breve.')
        else {
          setAvisoFicha(null)
          piscarGuardado()
        }
      })
  }

  // ---------- navegação entre passos (nada se perde ao voltar) ----------
  function irPara(passo: string) {
    if (!passos.includes(passo)) return
    if (correcao) setPassoCorrecao(passo)
    else atualizarSessao({ passo_atual: passo })
    window.scrollTo({ top: 0 })
  }
  function avancar() {
    if (indice < passos.length - 1) irPara(passos[indice + 1])
  }
  const [saindo, setSaindo] = useState(false)
  function voltar() {
    if (indice === 0) setSaindo(true)
    else irPara(passos[indice - 1])
  }

  const [fichaAberta, setFichaAberta] = useState(false)

  const ctx: CtxSessao = {
    sessao,
    paciente,
    ciclo,
    config: pacote.config,
    agendamento: pacote.agendamento,
    variante,
    correcao,
    numeroDaSessao: sessao.numero_no_ciclo,
    ultimaSessao,
    sessoesConcluidas: pacote.sessoesConcluidas,
    avaliacaoInicial,
    avaliacaoCheckpoint,
    redFlagDaSessao,
    propostaDaSessao,
    pagamento450Feito: pacote.pagamento450Feito,
    rascunho,
    mudarRascunho,
    atualizarSessao,
    atualizarPaciente,
    definirCheckpoint: setCheckpoint,
    definirRedFlag: setRedFlag,
    definirCiclo: setCiclo,
    definirProposta: setProposta,
    avancar,
    voltar,
    irPara,
  }

  function renderPasso() {
    switch (passoAtual) {
      case 'capa':
        return <PassoCapa ctx={ctx} />
      case 'termo':
        return <PassoTermo ctx={ctx} />
      case 'condicao':
        return <PassoCondicao ctx={ctx} />
      case 'historia':
        return <PassoHistoria ctx={ctx} />
      case 'red_flags':
        return <PassoRedFlags ctx={ctx} />
      case 'cautelas':
        return <PassoCautelas ctx={ctx} />
      case 'mapa':
        return <PassoMapa ctx={ctx} />
      case 'frases':
        return <PassoFrases ctx={ctx} />
      case 'frequencia':
        return <PassoFrequencia ctx={ctx} />
      case 'eva_pre':
        return <PassoEva ctx={ctx} campo="eva_pre" />
      case 'veredito':
        return <PassoVeredito ctx={ctx} />
      case 'destravamento':
        return <PassoDestravamento ctx={ctx} />
      case 'pontos':
        return <PassoPontos ctx={ctx} />
      case 'complementos':
        return <PassoComplementos ctx={ctx} />
      case 'agulhas':
        return <PassoAgulhas ctx={ctx} />
      case 'eva_pos':
        return <PassoEva ctx={ctx} campo="eva_pos" />
      case 'intercorrencia':
        return <PassoIntercorrencia ctx={ctx} />
      case 'orientacao':
        return <PassoOrientacao ctx={ctx} />
      case 'prescricao':
        return <PassoPrescricao ctx={ctx} />
      case 'desfecho':
        return <PassoDesfecho ctx={ctx} />
      case 'pagamento':
        return <PassoPagamento ctx={ctx} />
      case 'proxima':
        return <PassoProximaSessao ctx={ctx} />
      case 'fim':
        return <PassoFim ctx={ctx} />
      default:
        return <PassoCapa ctx={ctx} />
    }
  }

  const bannerRede =
    !rede.online || rede.pendentes > 0 ? (
      <div
        role="status"
        style={{
          background: 'var(--sand)',
          borderBottom: '1px solid var(--hairline)',
          padding: '10px 20px',
          textAlign: 'center',
          fontWeight: 600,
        }}
      >
        {!rede.online
          ? 'Sem internet — pode continuar, vou guardar tudo quando voltar.'
          : `Guardando o que ficou pendente… (${rede.pendentes})`}
      </div>
    ) : null

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--sand)' }}>
      <CabecalhoSessao
        paciente={paciente}
        sessao={sessao}
        passos={passos}
        indice={indice}
        guardado={guardado}
        aoVoltar={voltar}
        aoAbrirFicha={() => setFichaAberta(true)}
        aoSair={() => setSaindo(true)}
        aoCorrigirEva={() => irPara('eva_pre')}
      />
      {bannerRede}
      {avisoFicha && (
        <div
          role="status"
          style={{
            background: 'var(--sand)',
            borderBottom: '1px solid var(--hairline)',
            padding: '8px 20px',
            textAlign: 'center',
          }}
          className="small"
        >
          {avisoFicha}
        </div>
      )}

      <main className="wrap" style={{ maxWidth: 760, padding: '24px 20px 140px' }}>
        <div key={passoAtual}>{renderPasso()}</div>
      </main>

      {saindo && (
        <div
          role="dialog"
          aria-label="Sair da sessão"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 350,
            background: 'rgba(31,27,22,0.45)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div className="card stack" style={{ maxWidth: 520, width: '100%' }}>
            <h3>Sair e continuar depois?</h3>
            <p className="muted">Está tudo guardado — a sessão espera você no cartão AGORA.</p>
            <button type="button" className="btn btn-primary btn-xl" onClick={() => navegar('/inicio')}>
              Sair — eu volto depois
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setSaindo(false)}>
              Ficar na sessão
            </button>
          </div>
        </div>
      )}

      {fichaAberta && (
        <FichaSobreposta
          paciente={paciente}
          sessoesConcluidas={pacote.sessoesConcluidas}
          aoFechar={() => setFichaAberta(false)}
        />
      )}
    </div>
  )
}
