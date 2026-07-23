import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { dataHora } from '../lib/datas'

type Conhecimento = {
  id: string
  categoria: string
  titulo: string
  conteudo: string
  ativo: boolean
  ordem: number
}

type Conversa = {
  id: string
  canal: string
  contato_nome: string | null
  contato_telefone: string | null
  encaminhada_para_humano: boolean
  motivo_encaminhamento: string | null
  ultima_mensagem_em: string
}

type Mensagem = { id: string; papel: string; conteudo: string; criada_em: string }

type Config = { nome: string; modelo: string; instrucoes: string; ativo: boolean }

const CATEGORIAS = [
  { valor: 'faq', rotulo: 'Pergunta frequente' },
  { valor: 'preco', rotulo: 'Preço' },
  { valor: 'endereco', rotulo: 'Endereço' },
  { valor: 'horario', rotulo: 'Horários' },
  { valor: 'tratamento', rotulo: 'Tratamentos' },
  { valor: 'regra', rotulo: 'Regra de conduta' },
  { valor: 'outro', rotulo: 'Outro' },
]

const MODELOS = [
  { valor: 'claude-opus-4-8', rotulo: 'Claude Opus 4.8 — mais inteligente (padrão)' },
  { valor: 'claude-sonnet-5', rotulo: 'Claude Sonnet 5 — equilíbrio' },
  { valor: 'claude-haiku-4-5', rotulo: 'Claude Haiku 4.5 — mais econômico' },
]

export default function Recepcionista() {
  const [aba, setAba] = useState<'testar' | 'conhecimento' | 'conversas' | 'ajustes'>('testar')

  return (
    <div className="stack-lg">
      <div>
        <p className="eyebrow">Recepcionista virtual</p>
        <h1 style={{ marginTop: 6 }}>Atendimento com IA</h1>
        <p className="muted" style={{ marginTop: 8, maxWidth: '60ch' }}>
          Ela responde como se fosse a recepção do consultório: acolhe, tira dúvidas e conduz para a
          Primeira Sessão. Aqui você treina, testa e acompanha as conversas.
        </p>
      </div>

      <div className="tabs" role="tablist">
        {(
          [
            ['testar', 'Testar conversa'],
            ['conhecimento', 'Conhecimento'],
            ['conversas', 'Conversas'],
            ['ajustes', 'Ajustes'],
          ] as const
        ).map(([chave, rotulo]) => (
          <button
            key={chave}
            role="tab"
            aria-selected={aba === chave}
            className={`tab${aba === chave ? ' active' : ''}`}
            onClick={() => setAba(chave)}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === 'testar' && <ChatTeste />}
      {aba === 'conhecimento' && <BaseConhecimento />}
      {aba === 'conversas' && <ListaConversas />}
      {aba === 'ajustes' && <Ajustes />}
    </div>
  )
}

/* ---------------- Chat de teste ---------------- */

function ChatTeste() {
  const [mensagens, setMensagens] = useState<{ papel: 'paciente' | 'ia'; conteudo: string }[]>([])
  const [texto, setTexto] = useState('')
  const [conversaId, setConversaId] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const fimRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const mensagem = texto.trim()
    if (!mensagem || enviando) return
    setTexto('')
    setErro('')
    setMensagens((m) => [...m, { papel: 'paciente', conteudo: mensagem }])
    setEnviando(true)
    const { data, error } = await supabase.functions.invoke('recepcionista', {
      body: { acao: 'chat', mensagem, conversa_id: conversaId },
    })
    setEnviando(false)
    if (error) {
      setErro('Não consegui falar com a recepcionista agora. Tente de novo em instantes.')
      return
    }
    if (data?.conversa_id) setConversaId(data.conversa_id)
    setMensagens((m) => [...m, { papel: 'ia', conteudo: data?.resposta ?? '…' }])
  }

  return (
    <div className="card stack">
      <div className="row-between">
        <p style={{ fontWeight: 600 }}>Converse como se você fosse uma paciente</p>
        {conversaId && (
          <button
            className="btn btn-ghost"
            onClick={() => {
              setConversaId(null)
              setMensagens([])
            }}
          >
            Recomeçar
          </button>
        )}
      </div>

      <div
        style={{
          minHeight: 260,
          maxHeight: 420,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '8px 2px',
        }}
      >
        {mensagens.length === 0 && (
          <p className="muted" style={{ margin: 'auto', textAlign: 'center' }}>
            Experimente: “Oi, vi o site de vocês. Minha lombar dói há meses, quanto custa o tratamento?”
          </p>
        )}
        {mensagens.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.papel === 'paciente' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              background: m.papel === 'paciente' ? 'var(--jade)' : 'var(--sand)',
              color: m.papel === 'paciente' ? 'var(--cream)' : 'var(--ink)',
              borderRadius: 16,
              padding: '10px 16px',
              whiteSpace: 'pre-wrap',
              fontSize: 17.5,
            }}
          >
            {m.conteudo}
          </div>
        ))}
        {enviando && <p className="muted small">digitando…</p>}
        <div ref={fimRef} />
      </div>

      {erro && <p style={{ color: 'var(--cinnabar)', fontWeight: 600 }}>{erro}</p>}

      <form onSubmit={enviar} className="row">
        <input
          className="input"
          style={{ flex: 1 }}
          placeholder="Escreva a mensagem da paciente…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={enviando || !texto.trim()}>
          Enviar
        </button>
      </form>
    </div>
  )
}

/* ---------------- Base de conhecimento ---------------- */

function BaseConhecimento() {
  const [itens, setItens] = useState<Conhecimento[]>([])
  const [editando, setEditando] = useState<Conhecimento | null>(null)
  const [criando, setCriando] = useState(false)
  const [carregando, setCarregando] = useState(true)

  async function carregar() {
    const { data } = await supabase.from('ia_conhecimento').select('*').order('ordem')
    setItens((data as Conhecimento[]) ?? [])
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  async function alternarAtivo(item: Conhecimento) {
    await supabase.from('ia_conhecimento').update({ ativo: !item.ativo }).eq('id', item.id)
    carregar()
  }

  async function excluir(item: Conhecimento) {
    if (!confirm(`Apagar “${item.titulo}”? Essa ação não tem volta.`)) return
    await supabase.from('ia_conhecimento').delete().eq('id', item.id)
    carregar()
  }

  if (carregando) return <p className="muted">Carregando…</p>

  const form = (item: Partial<Conhecimento> | null, aoFechar: () => void) => (
    <FormConhecimento
      item={item}
      aoSalvar={async (valores) => {
        if (item && 'id' in item && item.id) {
          await supabase
            .from('ia_conhecimento')
            .update({ ...valores, atualizado_em: new Date().toISOString() })
            .eq('id', item.id)
        } else {
          await supabase.from('ia_conhecimento').insert(valores)
        }
        aoFechar()
        carregar()
      }}
      aoCancelar={aoFechar}
    />
  )

  return (
    <div className="stack">
      <div className="row-between">
        <p className="muted" style={{ maxWidth: '52ch' }}>
          Tudo que estiver ativo aqui a recepcionista sabe e usa nas respostas. Para “treinar”, é só
          escrever como você explicaria para uma recepcionista nova.
        </p>
        <button className="btn btn-primary" onClick={() => setCriando(true)}>
          + Ensinar algo novo
        </button>
      </div>

      {criando && form(null, () => setCriando(false))}

      <div className="touch-list">
        {itens.map((item) =>
          editando?.id === item.id ? (
            <div key={item.id}>{form(item, () => setEditando(null))}</div>
          ) : (
            <div key={item.id} className="card-flat row-between" style={{ opacity: item.ativo ? 1 : 0.55 }}>
              <div style={{ minWidth: 0 }}>
                <div className="row" style={{ gap: 10 }}>
                  <span className="pill pill-sand">{CATEGORIAS.find((c) => c.valor === item.categoria)?.rotulo ?? item.categoria}</span>
                  {!item.ativo && <span className="pill pill-red">pausado</span>}
                </div>
                <p style={{ fontWeight: 600, marginTop: 8 }}>{item.titulo}</p>
                <p className="muted small" style={{ marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {item.conteudo}
                </p>
              </div>
              <div className="row" style={{ flexShrink: 0 }}>
                <button className="btn btn-ghost" onClick={() => setEditando(item)}>Editar</button>
                <button className="btn btn-ghost" onClick={() => alternarAtivo(item)}>
                  {item.ativo ? 'Pausar' : 'Reativar'}
                </button>
                <button className="btn btn-danger-ghost" onClick={() => excluir(item)}>Apagar</button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}

function FormConhecimento({
  item,
  aoSalvar,
  aoCancelar,
}: {
  item: Partial<Conhecimento> | null
  aoSalvar: (v: Pick<Conhecimento, 'categoria' | 'titulo' | 'conteudo'>) => Promise<void>
  aoCancelar: () => void
}) {
  const [categoria, setCategoria] = useState(item?.categoria ?? 'faq')
  const [titulo, setTitulo] = useState(item?.titulo ?? '')
  const [conteudo, setConteudo] = useState(item?.conteudo ?? '')
  const [salvando, setSalvando] = useState(false)

  return (
    <form
      className="card stack"
      onSubmit={async (e) => {
        e.preventDefault()
        setSalvando(true)
        await aoSalvar({ categoria, titulo: titulo.trim(), conteudo: conteudo.trim() })
        setSalvando(false)
      }}
    >
      <label className="field">
        <span className="field-label">Sobre o que é?</span>
        <select className="select" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {CATEGORIAS.map((c) => (
            <option key={c.valor} value={c.valor}>{c.rotulo}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">Título curto</span>
        <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={120} placeholder="Ex.: Estacionamento perto do consultório" />
      </label>
      <label className="field">
        <span className="field-label">O que a recepcionista deve saber ou responder</span>
        <textarea className="textarea" rows={4} value={conteudo} onChange={(e) => setConteudo(e.target.value)} required placeholder="Escreva como se estivesse explicando para uma recepcionista nova." />
      </label>
      <div className="row">
        <button className="btn btn-primary" type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        <button className="btn btn-ghost" type="button" onClick={aoCancelar}>Cancelar</button>
      </div>
    </form>
  )
}

/* ---------------- Conversas ---------------- */

function ListaConversas() {
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [aberta, setAberta] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase
      .from('ia_conversas')
      .select('*')
      .order('ultima_mensagem_em', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setConversas((data as Conversa[]) ?? [])
        setCarregando(false)
      })
  }, [])

  useEffect(() => {
    if (!aberta) return
    supabase
      .from('ia_mensagens')
      .select('*')
      .eq('conversa_id', aberta.id)
      .order('criada_em')
      .then(({ data }) => setMensagens((data as Mensagem[]) ?? []))
  }, [aberta])

  if (carregando) return <p className="muted">Carregando…</p>
  if (conversas.length === 0)
    return (
      <div className="empty-state">
        <div className="big">💬</div>
        <p>Nenhuma conversa ainda. Teste na aba “Testar conversa”.</p>
      </div>
    )

  if (aberta) {
    return (
      <div className="stack">
        <button className="btn btn-ghost" onClick={() => setAberta(null)}>← Voltar para a lista</button>
        <div className="card stack">
          <div className="row" style={{ gap: 10 }}>
            <span className="pill pill-jade">{aberta.canal === 'whatsapp' ? 'WhatsApp' : 'Teste'}</span>
            {aberta.encaminhada_para_humano && (
              <span className="pill pill-red">Encaminhada para humano{aberta.motivo_encaminhamento ? ` — ${aberta.motivo_encaminhamento}` : ''}</span>
            )}
          </div>
          <p style={{ fontWeight: 600 }}>
            {aberta.contato_nome ?? aberta.contato_telefone ?? 'Conversa de teste'} · {dataHora(aberta.ultima_mensagem_em)}
          </p>
          <hr className="divider" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mensagens.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.papel === 'paciente' ? 'flex-start' : 'flex-end',
                  maxWidth: '80%',
                  background: m.papel === 'paciente' ? 'var(--sand)' : 'var(--jade-soft)',
                  borderRadius: 16,
                  padding: '10px 16px',
                  whiteSpace: 'pre-wrap',
                  fontSize: 16.5,
                }}
              >
                <span className="mono" style={{ fontSize: 11, color: 'var(--stone)', display: 'block', marginBottom: 4 }}>
                  {m.papel === 'paciente' ? 'Paciente' : 'Recepcionista'} · {dataHora(m.criada_em)}
                </span>
                {m.conteudo}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="touch-list">
      {conversas.map((c) => (
        <button key={c.id} className="touch-item" onClick={() => setAberta(c)}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600 }}>
              {c.contato_nome ?? c.contato_telefone ?? 'Conversa de teste'}
            </p>
            <p className="muted small">{dataHora(c.ultima_mensagem_em)}</p>
          </div>
          <span className="pill pill-sand">{c.canal === 'whatsapp' ? 'WhatsApp' : 'Teste'}</span>
          {c.encaminhada_para_humano && <span className="pill pill-red">precisa de você</span>}
        </button>
      ))}
    </div>
  )
}

/* ---------------- Ajustes ---------------- */

function Ajustes() {
  const [config, setConfig] = useState<Config | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    supabase
      .from('ia_config')
      .select('nome, modelo, instrucoes, ativo')
      .eq('id', true)
      .maybeSingle()
      .then(({ data }) => setConfig(data as Config))
  }, [])

  if (!config) return <p className="muted">Carregando…</p>

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!config) return
    setSalvando(true)
    await supabase
      .from('ia_config')
      .update({ ...config, atualizado_em: new Date().toISOString() })
      .eq('id', true)
    setSalvando(false)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2500)
  }

  return (
    <form className="card stack" onSubmit={salvar}>
      <label className="field">
        <span className="field-label">Recepcionista ligada?</span>
        <div className="choice-row">
          <button type="button" className="choice" data-selected={config.ativo} onClick={() => setConfig({ ...config, ativo: true })}>
            Ligada
          </button>
          <button type="button" className="choice" data-selected={!config.ativo} onClick={() => setConfig({ ...config, ativo: false })}>
            Desligada
          </button>
        </div>
      </label>

      <label className="field">
        <span className="field-label">Personalidade e instruções</span>
        <textarea
          className="textarea"
          rows={6}
          value={config.instrucoes}
          onChange={(e) => setConfig({ ...config, instrucoes: e.target.value })}
        />
        <span className="field-hint">
          As regras de segurança (não passar preço de programa, encaminhar sinais de alerta) são fixas
          e não podem ser desligadas por aqui.
        </span>
      </label>

      <label className="field">
        <span className="field-label">Inteligência</span>
        <select className="select" value={config.modelo} onChange={(e) => setConfig({ ...config, modelo: e.target.value })}>
          {MODELOS.map((m) => (
            <option key={m.valor} value={m.valor}>{m.rotulo}</option>
          ))}
        </select>
      </label>

      <div className="row">
        <button className="btn btn-primary" type="submit" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar ajustes'}
        </button>
        {salvo && <span className="pill pill-jade">Salvo!</span>}
      </div>
    </form>
  )
}
