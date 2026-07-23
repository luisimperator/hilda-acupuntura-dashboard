// /sessao/:sessaoId — MODO SESSÃO (spec §3). Sem AppShell: durante o
// atendimento não existe navegação, existe o atendimento. Esta página só
// carrega o pacote da sessão e entrega ao TrilhoSessao.

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { carregarPacote, type PacoteSessao } from '../components/sessao/dadosSessao'
import TrilhoSessao from '../components/sessao/TrilhoSessao'

export default function Sessao() {
  const { sessaoId } = useParams<{ sessaoId: string }>()
  const navegar = useNavigate()

  const [pacote, setPacote] = useState<PacoteSessao | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(() => {
    if (!sessaoId) {
      setErro('Não encontrei esta sessão.')
      return
    }
    setErro(null)
    setPacote(null)
    carregarPacote(sessaoId)
      .then(setPacote)
      .catch((e: unknown) => {
        setErro(e instanceof Error ? e.message : 'Não consegui abrir a sessão — tente de novo.')
      })
  }, [sessaoId])

  useEffect(() => {
    carregar()
  }, [carregar])

  if (erro) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: 'var(--sand)',
          display: 'grid',
          placeItems: 'center',
          padding: 20,
        }}
      >
        <div className="card stack" style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
          <h2>Um instante.</h2>
          <p className="muted">{erro}</p>
          <button type="button" className="btn btn-primary btn-xl" onClick={carregar}>
            Tentar de novo
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => navegar('/inicio')}>
            Voltar para o início
          </button>
        </div>
      </div>
    )
  }

  if (!pacote) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--sand)', display: 'grid', placeItems: 'center' }}>
        <p className="muted" style={{ fontSize: 22 }}>
          Abrindo a sessão…
        </p>
      </div>
    )
  }

  return <TrilhoSessao key={pacote.sessao.id} pacote={pacote} />
}
