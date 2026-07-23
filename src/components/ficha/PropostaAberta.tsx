import { useState } from 'react'
import type { Config, Paciente, Proposta } from '../../lib/tipos'
import type { Enums } from '../../lib/database.types'
import { NOME_PROGRAMA } from '../../lib/tipos'
import { diaPorExtenso, dinheiro } from '../../lib/datas'
import { desistirPropostaPendente, fecharPropostaPendente } from '../../lib/fechamentoService'

const FORMAS: { valor: Enums<'pagamento_forma_t'>; rotulo: string }[] = [
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'cartao_credito', rotulo: 'Cartão de crédito' },
  { valor: 'cartao_debito', rotulo: 'Cartão de débito' },
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
]

const OBJECOES: { valor: Enums<'objecao_t'>; rotulo: string }[] = [
  { valor: 'preco', rotulo: 'Preço' },
  { valor: 'tempo', rotulo: 'Tempo' },
  { valor: 'decisor', rotulo: 'Família' },
  { valor: 'vou_pensar', rotulo: 'Só pensou melhor' },
  { valor: 'outra', rotulo: 'Outra' },
]

// A proposta que saiu "pensando": quando a paciente responde que sim,
// a Hilda registra aqui — o crédito vira programa (fechou_7_dias).
export default function PropostaAberta({
  proposta,
  paciente,
  config,
  aoMudar,
}: {
  proposta: Proposta
  paciente: Paciente
  config: Config | null
  aoMudar: () => void
}) {
  const [modo, setModo] = useState<'fechar' | 'desistir' | null>(null)
  const [forma, setForma] = useState<Enums<'pagamento_forma_t'>>('pix')
  const [parcelas, setParcelas] = useState(1)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const credito = config?.preco_primeira_centavos ?? 45000
  const restante = proposta.valor_centavos - credito

  async function confirmarFechamento() {
    setSalvando(true)
    setErro('')
    try {
      await fecharPropostaPendente({ proposta, paciente, config, forma, parcelas })
      aoMudar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu certo — tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarDesistencia(objecao: Enums<'objecao_t'>) {
    setSalvando(true)
    setErro('')
    try {
      await desistirPropostaPendente({ proposta, objecao })
      aoMudar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu certo — tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section className="card stack" style={{ borderColor: 'var(--gold)' }}>
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        <span className="pill pill-gold">Proposta em aberto</span>
        <span className="muted">
          {NOME_PROGRAMA[proposta.programa_oferecido]} · {dinheiro(proposta.valor_centavos)}
          {proposta.credito_expira &&
            ` · crédito de ${dinheiro(credito)} vale até ${diaPorExtenso(`${proposta.credito_expira.slice(0, 10)}T12:00:00`)}`}
        </span>
      </div>

      {modo === null && (
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={() => setModo('fechar')}>
            Ela fechou! 🎉
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setModo('desistir')}>
            não seguiu…
          </button>
        </div>
      )}

      {modo === 'fechar' && (
        <div className="stack">
          <p style={{ fontWeight: 600 }}>
            Como ela pagou os {dinheiro(restante)}? ({dinheiro(proposta.valor_centavos)} −{' '}
            {dinheiro(credito)} do crédito)
          </p>
          <div className="choice-row">
            {FORMAS.map((f) => (
              <button
                key={f.valor}
                type="button"
                className="choice"
                data-selected={forma === f.valor}
                onClick={() => setForma(f.valor)}
              >
                {f.rotulo}
              </button>
            ))}
          </div>
          {forma === 'cartao_credito' && (
            <div className="choice-row">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="choice"
                  data-selected={parcelas === n}
                  onClick={() => setParcelas(n)}
                >
                  {n === 1 ? 'À vista' : `${n}x de ${dinheiro(Math.round(restante / n))}`}
                </button>
              ))}
            </div>
          )}
          <div className="row">
            <button type="button" className="btn btn-primary" disabled={salvando} onClick={() => void confirmarFechamento()}>
              {salvando ? 'Registrando…' : 'Confirmar o programa'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setModo(null)}>
              Voltar
            </button>
          </div>
        </div>
      )}

      {modo === 'desistir' && (
        <div className="stack">
          <p style={{ fontWeight: 600 }}>O que pesou para ela?</p>
          <div className="choice-row">
            {OBJECOES.map((o) => (
              <button
                key={o.valor}
                type="button"
                className="choice"
                disabled={salvando}
                onClick={() => void confirmarDesistencia(o.valor)}
              >
                {o.rotulo}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setModo(null)} style={{ alignSelf: 'flex-start' }}>
            Voltar
          </button>
        </div>
      )}

      {erro && <p style={{ color: 'var(--cinnabar)', fontWeight: 600 }}>{erro}</p>}
    </section>
  )
}
