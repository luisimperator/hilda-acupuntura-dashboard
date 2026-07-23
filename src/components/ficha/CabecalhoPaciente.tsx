import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { NOME_CONDICAO, selosCautela, type Paciente } from '../../lib/tipos'

function idadeDe(nascimento: string | null): number | null {
  if (!nascimento) return null
  const n = new Date(`${nascimento.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(n.getTime())) return null
  const hoje = new Date()
  let anos = hoje.getFullYear() - n.getFullYear()
  const m = hoje.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < n.getDate())) anos -= 1
  return anos >= 0 && anos < 130 ? anos : null
}

type Props = {
  paciente: Paciente
  /** Modo Sessão: cabeçalho menor, frase-objetivo sem edição */
  compacto?: boolean
  aoAtualizarObjetivo?: (frase: string) => void
}

// Cabeçalho da ficha (spec §1.2): nome grande, frase-objetivo em itálico
// editável em um toque, condição e selos permanentes de cautela.
// Compartilhado com o Modo Sessão via a prop `compacto`.
export default function CabecalhoPaciente({ paciente, compacto = false, aoAtualizarObjetivo }: Props) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState('')
  const [guardado, setGuardado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const anos = idadeDe(paciente.nascimento)
  const selos = selosCautela(paciente)
  const objetivo = paciente.objetivo_frase?.trim() || null

  function comecarEdicao() {
    setTexto(paciente.objetivo_frase ?? '')
    setErro(null)
    setEditando(true)
  }

  async function guardar() {
    const frase = texto.trim()
    setEditando(false)
    if (frase === (paciente.objetivo_frase ?? '').trim()) return
    const { error } = await supabase
      .from('pacientes')
      .update({ objetivo_frase: frase || null })
      .eq('id', paciente.id)
    if (error) {
      setErro('Não consegui guardar a frase agora — tente mais uma vez.')
      return
    }
    aoAtualizarObjetivo?.(frase)
    setGuardado(true)
    window.setTimeout(() => setGuardado(false), 2500)
  }

  return (
    <header className="stack">
      <div>
        <h1 style={compacto ? { fontSize: 26 } : undefined}>
          {paciente.nome}
          {anos != null && <span style={{ color: 'var(--ink-60)' }}>, {anos}</span>}
        </h1>
        {paciente.tratamento && (
          <p className="muted" style={{ fontSize: compacto ? 16 : 18 }}>(“{paciente.tratamento}”)</p>
        )}
      </div>

      {compacto ? (
        objetivo && <p style={{ fontStyle: 'italic', fontSize: 18 }}>“{objetivo}”</p>
      ) : editando ? (
        <div className="stack" style={{ maxWidth: 560 }}>
          <label className="field">
            <span className="field-label">O objetivo dela, nas palavras dela</span>
            <input
              className="input"
              autoFocus
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void guardar()
              }}
              placeholder="ex.: voltar a pegar minha neta no colo"
            />
            <span className="field-hint">dica: dá para ditar pelo microfone do teclado</span>
          </label>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={() => void guardar()}>
              Guardar a frase
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditando(false)}>
              Deixar como estava
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={comecarEdicao}
          aria-label={objetivo ? 'Mudar a frase-objetivo' : 'Anotar a frase-objetivo'}
          style={{
            display: 'block',
            textAlign: 'left',
            minHeight: 56,
            padding: '8px 0',
            fontStyle: 'italic',
            fontSize: 21,
            lineHeight: 1.4,
            maxWidth: 680,
            color: objetivo ? 'var(--ink)' : 'var(--ink-60)',
          }}
        >
          {objetivo ? `“${objetivo}”` : 'toque para anotar o objetivo dela, nas palavras dela'}
        </button>
      )}

      {guardado && (
        <p className="small" style={{ color: 'var(--jade)' }}>
          ✓ guardado
        </p>
      )}
      {erro && (
        <p className="small" style={{ color: 'var(--ink-60)', fontWeight: 600 }}>
          {erro}
        </p>
      )}

      {(paciente.condicao || selos.length > 0) && (
        <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
          {paciente.condicao && <span className="pill pill-sand">{NOME_CONDICAO[paciente.condicao]}</span>}
          {selos.map((s) => (
            <span key={s.chave} className="pill pill-red" style={{ whiteSpace: 'normal' }}>
              ⚠ {s.rotulo}
            </span>
          ))}
        </div>
      )}
    </header>
  )
}
