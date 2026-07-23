import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    setEnviando(false)
    if (error) {
      setErro('Não deu certo. Confira o e-mail e a senha e tente de novo.')
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div className="card" style={{ width: '100%', maxWidth: 460 }}>
        <div className="stack-lg">
          <div>
            <p className="eyebrow">Consultório · Moema</p>
            <h1 style={{ marginTop: 8 }}>Hilda de Oliveira</h1>
            <p className="muted" style={{ marginTop: 8 }}>
              Painel de atendimento. Entre com seu e-mail e senha.
            </p>
          </div>
          <form onSubmit={entrar} className="stack">
            <label className="field">
              <span className="field-label">E-mail</span>
              <input
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Senha</span>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </label>
            {erro && (
              <p style={{ color: 'var(--cinnabar)', fontWeight: 600 }}>{erro}</p>
            )}
            <button className="btn btn-primary btn-xl" type="submit" disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
