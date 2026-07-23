// NOVA PACIENTE (spec §1.4) — 5 campos, menos de 60 segundos, usável no meio
// de uma conversa de WhatsApp (pela Hilda ou pelo Fernando de longe).
// O lead nasce registrado (status 'lead') e a tela final entrega o script
// resposta_lead pronto, com as 2 próximas vagas livres reais da agenda.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EvaScale from '../components/EvaScale'
import BotaoWhatsApp from '../components/whatsapp/BotaoWhatsApp'
import { supabase } from '../lib/supabase'
import { linkWhatsApp, montarMensagem, type DadosMensagem, type Vaga } from '../lib/mensagens'
import { proximasVagasLivres } from '../lib/sessaoService'
import { dataHoraCurta } from '../lib/datas'
import { NOME_CONDICAO, type Condicao, type Paciente } from '../lib/tipos'

// 'landing' é o valor que o resto do app já entende como "anúncio"
// (default do banco; a capa da sessão mostra "anúncio" para 'landing').
const ORIGENS = [
  { valor: 'landing', rotulo: 'Anúncio' },
  { valor: 'indicação', rotulo: 'Indicação' },
  { valor: 'retorno', rotulo: 'Retorno' },
] as const

const CONDICOES: Condicao[] = ['lombalgia', 'cervical_ombros', 'enxaqueca', 'joelho', 'estresse_sono', 'outra']

/** Só os dígitos nacionais (DDD + número), sem +55, sem zero à esquerda. */
function digitosNacionais(valor: string): string {
  let d = valor.replace(/\D/g, '')
  if (d.startsWith('55') && d.length > 11) d = d.slice(2)
  d = d.replace(/^0+/, '')
  return d.slice(0, 11)
}

/** "(11) 98765-4321" enquanto digita. */
function telefoneBonito(d: string): string {
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Sem vaga na grade: a mensagem vai sem a frase dos horários. */
function tirarHorarios(corpo: string): string {
  return corpo.replace(
    /\s*Tenho horário \[a combinar\] ou \[a combinar\] — qual fica melhor\?/,
    ' Me conta qual dia e horário ficam melhores para você?',
  )
}

export default function NovaPaciente() {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('') // só dígitos nacionais
  const [origem, setOrigem] = useState<string>('landing')
  const [eva, setEva] = useState<number | null>(null)
  const [naoFalou, setNaoFalou] = useState(false)
  const [condicao, setCondicao] = useState<Condicao | null>(null)

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salva, setSalva] = useState<Paciente | null>(null)

  // Busca as vagas já durante o preenchimento — a tela final abre pronta.
  const [vagas, setVagas] = useState<Vaga[] | null>(null)
  useEffect(() => {
    let ativo = true
    proximasVagasLivres(2)
      .then((v) => {
        if (ativo) setVagas(v)
      })
      .catch(() => {
        if (ativo) setVagas([])
      })
    return () => {
      ativo = false
    }
  }, [])

  const nomeLimpo = nome.trim()
  const telefoneValido = telefone.length >= 10
  const dorRespondida = naoFalou || eva != null

  const faltando: string[] = []
  if (!nomeLimpo) faltando.push('o nome')
  if (!telefoneValido) faltando.push('o WhatsApp com DDD')
  if (!dorRespondida) faltando.push('a nota de dor (ou toque em "não falou")')
  if (!condicao) faltando.push('a queixa')

  async function guardar() {
    if (faltando.length > 0 || salvando) return
    setSalvando(true)
    setErro(null)
    const { data, error } = await supabase
      .from('pacientes')
      .insert({
        nome: nomeLimpo,
        telefone_wa: `+55${telefone}`,
        origem,
        eva_landing: naoFalou ? null : eva,
        condicao,
        status: 'lead',
      })
      .select()
      .single()
    setSalvando(false)
    if (error || !data) {
      setErro('Não consegui guardar agora. Confira a internet e toque de novo — nada se perdeu daqui.')
      return
    }
    setSalva(data)
  }

  if (salva) return <TelaResposta paciente={salva} vagas={vagas} />

  return (
    <div className="stack-lg" style={{ maxWidth: 760, margin: '0 auto' }}>
      <header>
        <p className="eyebrow">Nova paciente</p>
        <h1 style={{ marginTop: 6 }}>Quem chegou?</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Cinco toques e a resposta sai pronta para o WhatsApp.
        </p>
      </header>

      <form
        className="card stack-lg"
        onSubmit={(e) => {
          e.preventDefault()
          void guardar()
        }}
      >
        <label className="field">
          <span className="field-label">Nome</span>
          <input
            className="input"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="off"
            autoCapitalize="words"
            placeholder="Como ela se apresentou"
          />
          <span className="field-hint">Dá para ditar: toque no microfone 🎤 do teclado.</span>
        </label>

        <label className="field">
          <span className="field-label">WhatsApp</span>
          <input
            className="input"
            type="tel"
            inputMode="tel"
            value={telefoneBonito(telefone)}
            onChange={(e) => setTelefone(digitosNacionais(e.target.value))}
            autoComplete="off"
            placeholder="(11) 98765-4321"
          />
          <span className="field-hint">
            {telefoneValido
              ? `Vai ficar guardado como +55 ${telefoneBonito(telefone)}`
              : 'Só os números, com DDD — o app coloca o +55 sozinho.'}
          </span>
        </label>

        <div className="field">
          <span className="field-label">De onde ela veio</span>
          <div className="choice-row" role="group" aria-label="De onde ela veio">
            {ORIGENS.map((o) => (
              <button
                key={o.valor}
                type="button"
                className="choice"
                data-selected={origem === o.valor}
                aria-pressed={origem === o.valor}
                onClick={() => setOrigem(o.valor)}
              >
                {o.rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Nota de dor que ela mandou</span>
          <EvaScale
            valor={naoFalou ? null : eva}
            aoEscolher={(v) => {
              setEva(v)
              setNaoFalou(false)
            }}
          />
          <button
            type="button"
            className="choice"
            data-selected={naoFalou}
            aria-pressed={naoFalou}
            onClick={() => {
              setNaoFalou(true)
              setEva(null)
            }}
          >
            Não falou a nota
          </button>
        </div>

        <div className="field">
          <span className="field-label">Qual é a queixa</span>
          <div className="choice-row" role="group" aria-label="Qual é a queixa">
            {CONDICOES.map((c) => (
              <button
                key={c}
                type="button"
                className="choice"
                data-selected={condicao === c}
                aria-pressed={condicao === c}
                onClick={() => setCondicao(c)}
              >
                {NOME_CONDICAO[c]}
              </button>
            ))}
          </div>
        </div>

        {erro && (
          <div className="card-flat" style={{ background: 'var(--sand)' }} role="status">
            {erro}
          </div>
        )}

        <div>
          <button type="submit" className="btn btn-primary btn-xl" disabled={faltando.length > 0 || salvando}>
            {salvando ? 'Guardando…' : 'Guardar e montar a resposta →'}
          </button>
          {faltando.length > 0 && (
            <p className="small muted" style={{ marginTop: 10, textAlign: 'center' }}>
              Para guardar, falta: {faltando.join(' · ')}
            </p>
          )}
        </div>
      </form>
    </div>
  )
}

// ---------- Tela final: a resposta pronta (script resposta_lead) ----------

function TelaResposta({ paciente, vagas }: { paciente: Paciente; vagas: Vaga[] | null }) {
  const navigate = useNavigate()

  const resumo = [
    paciente.eva_landing != null ? `dor ${paciente.eva_landing}/10` : 'não falou a nota',
    paciente.condicao ? NOME_CONDICAO[paciente.condicao] : null,
    paciente.origem === 'landing' ? 'veio de anúncio' : `veio de ${paciente.origem}`,
  ]
    .filter(Boolean)
    .join(' · ')

  const dados: DadosMensagem = {
    nome: paciente.nome,
    tratamento: paciente.tratamento,
    nota: paciente.eva_landing,
    vagas: vagas ?? [],
  }
  const semVagas = vagas != null && vagas.length === 0
  const corpo = semVagas ? tirarHorarios(montarMensagem('resposta_lead', dados)) : montarMensagem('resposta_lead', dados)

  return (
    <div className="stack-lg" style={{ maxWidth: 760, margin: '0 auto' }}>
      <header>
        <span className="pill pill-gold">Lead novo</span>
        <h1 style={{ marginTop: 10 }}>{paciente.nome}</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Guardado · {resumo}
        </p>
      </header>

      {vagas == null ? (
        <div className="card-flat">
          <p className="muted">Conferindo os próximos horários livres da agenda…</p>
        </div>
      ) : (
        <div className="stack-lg">
          {vagas.length > 0 ? (
            <div>
              <p className="eyebrow">As próximas vagas livres, já na mensagem</p>
              <div className="row" style={{ flexWrap: 'wrap', marginTop: 10 }}>
                {vagas.map((v) => (
                  <span key={String(v.inicio)} className="pill pill-jade" style={{ fontSize: 17 }}>
                    {dataHoraCurta(v.inicio)}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="card-flat" style={{ background: 'var(--sand)' }}>
              As vagas entram sozinhas na mensagem quando a agenda estiver configurada. Por enquanto, a
              mensagem vai sem os horários — dá para combinar direto na conversa.
            </div>
          )}

          <div className="card-flat" style={{ background: 'var(--jade-soft)', borderColor: 'var(--hairline)' }}>
            <p className="eyebrow" style={{ marginBottom: 10 }}>
              A resposta pronta
            </p>
            <p style={{ fontSize: 18, lineHeight: 1.65 }}>{corpo}</p>
          </div>

          <div className="stack">
            {semVagas ? (
              <BotaoEnviarSemHorarios paciente={paciente} corpo={corpo} />
            ) : (
              <BotaoWhatsApp
                pacienteId={paciente.id}
                telefone={paciente.telefone_wa}
                template="resposta_lead"
                dados={dados}
                rotulo="Responder no WhatsApp →"
                className="btn btn-whatsapp btn-xl"
              />
            )}
            <button type="button" className="btn btn-ghost btn-xl" onClick={() => navigate(`/paciente/${paciente.id}`)}>
              Ir para a ficha →
            </button>
            <p className="small muted" style={{ textAlign: 'center' }}>
              Responder em até meia hora faz toda a diferença para fechar.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Mesmo envio otimista do BotaoWhatsApp (grava e abre o wa.me + Desfazer 10s),
// mas com o corpo sem a frase dos horários — usado só quando a grade está vazia.
function BotaoEnviarSemHorarios({ paciente, corpo }: { paciente: Paciente; corpo: string }) {
  const [desfazerId, setDesfazerId] = useState<string | null>(null)
  const [segundos, setSegundos] = useState(10)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [])

  async function enviar() {
    const { data } = await supabase
      .from('mensagens_wa')
      .insert({ paciente_id: paciente.id, template: 'resposta_lead', corpo })
      .select('id')
      .single()

    window.open(linkWhatsApp(paciente.telefone_wa, corpo), '_blank', 'noopener')

    if (data?.id) {
      setDesfazerId(data.id)
      setSegundos(10)
      timer.current = setInterval(() => {
        setSegundos((s) => {
          if (s <= 1) {
            if (timer.current) clearInterval(timer.current)
            setDesfazerId(null)
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
  }

  async function desfazer() {
    if (timer.current) clearInterval(timer.current)
    if (desfazerId) await supabase.from('mensagens_wa').delete().eq('id', desfazerId)
    setDesfazerId(null)
  }

  return (
    <>
      <button type="button" className="btn btn-whatsapp btn-xl" onClick={() => void enviar()}>
        💬 Responder no WhatsApp →
      </button>
      {desfazerId && (
        <div className="toast" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span>Registrada como enviada</span>
          <button
            type="button"
            onClick={() => void desfazer()}
            style={{ color: 'var(--gold)', fontWeight: 700, textDecoration: 'underline' }}
          >
            Desfazer — não mandei ({segundos})
          </button>
        </div>
      )}
    </>
  )
}
