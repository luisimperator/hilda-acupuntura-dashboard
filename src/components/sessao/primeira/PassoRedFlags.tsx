// §3.2 E — RED FLAGS: a tela mais séria do app. SEM defaults; seguir exige
// N/S item a item OU o toque consciente em "NÃO HÁ NENHUM DESSES". Qualquer
// SIM → tela cinnabar com encaminhamento. Tudo persiste em `red_flags`.

import { useState } from 'react'
import { RED_FLAGS_ITENS } from '../../../lib/protocolos'
import { gravarRedFlags } from '../dadosSessao'
import type { CtxSessao } from '../tiposSessao'

type Resposta = 'sim' | 'nao' | null

export default function PassoRedFlags({ ctx }: { ctx: CtxSessao }) {
  const { sessao, redFlagDaSessao } = ctx

  const [respostas, setRespostas] = useState<Record<string, Resposta>>(() => {
    const inicial: Record<string, Resposta> = {}
    const gravadas = (redFlagDaSessao?.respostas ?? null) as Record<string, boolean> | null
    for (const item of RED_FLAGS_ITENS) {
      inicial[item.chave] = gravadas && item.chave in gravadas ? (gravadas[item.chave] ? 'sim' : 'nao') : null
    }
    return inicial
  })
  const [gravando, setGravando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [encaminhamentoOk, setEncaminhamentoOk] = useState(redFlagDaSessao?.encaminhada ?? false)
  const [mostrandoAlerta, setMostrandoAlerta] = useState(false)

  const positivas = RED_FLAGS_ITENS.filter((i) => respostas[i.chave] === 'sim')
  const todasRespondidas = RED_FLAGS_ITENS.every((i) => respostas[i.chave] != null)

  function responder(chave: string, valor: Resposta) {
    setRespostas((r) => ({ ...r, [chave]: valor }))
    if (valor === 'sim') setMostrandoAlerta(true)
  }

  async function gravar(comRespostas: Record<string, Resposta>, encaminhada: boolean): Promise<boolean> {
    setGravando(true)
    setErro(null)
    try {
      const brutas: Record<string, boolean> = {}
      for (const item of RED_FLAGS_ITENS) brutas[item.chave] = comRespostas[item.chave] === 'sim'
      const linha = await gravarRedFlags({ sessao, respostas: brutas, encaminhada })
      ctx.definirRedFlag(linha)
      return true
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui guardar o checklist — tente de novo.')
      return false
    } finally {
      setGravando(false)
    }
  }

  async function nenhumDesses() {
    const todasNao: Record<string, Resposta> = {}
    for (const item of RED_FLAGS_ITENS) todasNao[item.chave] = 'nao'
    setRespostas(todasNao)
    if (await gravar(todasNao, false)) ctx.avancar()
  }

  // ---------- tela cinnabar: alguma resposta SIM ----------
  if (positivas.length > 0 && mostrandoAlerta) {
    return (
      <section className="stack-lg card" style={{ background: 'var(--cinnabar)', color: '#fff' }}>
        <h2 style={{ color: '#fff' }}>NÃO AGULHAR ESTA REGIÃO.</h2>
        <p style={{ fontSize: 21, fontWeight: 600 }}>Encaminhar para avaliação médica.</p>
        <div className="card stack" style={{ background: '#fffdf9', color: 'var(--ink)' }}>
          {positivas.map((p) => (
            <p key={p.chave} style={{ fontWeight: 600 }}>
              ⚠ {p.pergunta} — SIM
            </p>
          ))}
        </div>

        {encaminhamentoOk ? (
          <p style={{ fontWeight: 700 }}>Encaminhamento registrado ✓</p>
        ) : (
          <button
            type="button"
            className="btn btn-block"
            style={{ background: '#fffdf9', color: 'var(--cinnabar)', minHeight: 64, fontWeight: 700 }}
            disabled={gravando}
            onClick={() => {
              void gravar(respostas, true).then((ok) => {
                if (ok) setEncaminhamentoOk(true)
              })
            }}
          >
            Registrar encaminhamento
          </button>
        )}

        <button
          type="button"
          className="btn btn-block"
          style={{ border: '2px solid #fffdf9', color: '#fff', minHeight: 64, fontWeight: 700 }}
          disabled={gravando}
          onClick={() => {
            void gravar(respostas, encaminhamentoOk).then((ok) => {
              if (ok) ctx.avancar()
            })
          }}
        >
          Tratar outra região liberada →
        </button>

        <button
          type="button"
          className="btn"
          style={{ color: '#fffdf9', textDecoration: 'underline' }}
          onClick={() => setMostrandoAlerta(false)}
        >
          voltar às perguntas
        </button>

        {erro && <p style={{ fontWeight: 700 }}>{erro}</p>}
      </section>
    )
  }

  // ---------- o checklist ----------
  return (
    <section className="stack-lg">
      <h2>Antes da primeira agulha</h2>
      <p className="muted">Cada item pede um toque — segurança não tem default.</p>

      <div className="stack">
        {RED_FLAGS_ITENS.map((item) => (
          <div key={item.chave} className="card-flat row-between" style={{ flexWrap: 'wrap', gap: 12 }}>
            <p style={{ flex: 1, minWidth: 220, fontSize: 19 }}>{item.pergunta}</p>
            <div className="row" style={{ gap: 8 }}>
              <button
                type="button"
                className="choice"
                data-selected={respostas[item.chave] === 'nao'}
                onClick={() => responder(item.chave, 'nao')}
              >
                NÃO
              </button>
              <button
                type="button"
                className="choice"
                style={
                  respostas[item.chave] === 'sim'
                    ? { background: 'var(--cinnabar)', borderColor: 'var(--cinnabar)', color: '#fff' }
                    : { borderColor: 'rgba(190,58,37,0.5)', color: 'var(--cinnabar)' }
                }
                onClick={() => responder(item.chave, 'sim')}
              >
                SIM
              </button>
            </div>
          </div>
        ))}
      </div>

      {positivas.length > 0 ? (
        <button
          type="button"
          className="btn btn-danger-ghost btn-xl"
          onClick={() => setMostrandoAlerta(true)}
        >
          ⚠ Há {positivas.length} resposta{positivas.length > 1 ? 's' : ''} SIM — ver o que fazer
        </button>
      ) : todasRespondidas ? (
        <button
          type="button"
          className="btn btn-primary btn-xl"
          disabled={gravando}
          onClick={() => {
            void gravar(respostas, false).then((ok) => {
              if (ok) ctx.avancar()
            })
          }}
        >
          Nenhum sinal de alerta — seguir →
        </button>
      ) : (
        <button type="button" className="btn btn-primary btn-xl" disabled={gravando} onClick={() => void nenhumDesses()}>
          Não há nenhum desses — seguir →
        </button>
      )}

      {erro && (
        <p className="small" style={{ fontWeight: 600, color: 'var(--ink-60)' }}>
          {erro}
        </p>
      )}
    </section>
  )
}
