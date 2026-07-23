// §3.2 R — E AÍ? O desfecho que alimenta o funil inteiro:
// FECHOU (ciclo + proposta + pagamento + 2 sessões marcadas antes de sair) ·
// VAI PENSAR (crédito 7 dias + retorno 48h com vaga se a dúvida é o decisor) ·
// NÃO SEGUIU (objeção registrada, sem juízo).

import { useEffect, useState } from 'react'
import { dinheiro, diaCurto, diaPorExtenso, horaCurta } from '../../../lib/datas'
import { proximasVagasLivres } from '../../../lib/sessaoService'
import { nomeCurto, NOME_PROGRAMA } from '../../../lib/tipos'
import type { Enums } from '../../../lib/database.types'
import { criarAgendamento, fecharPrograma, registrarProposta } from '../dadosSessao'
import type { CtxSessao } from '../tiposSessao'

type Forma = Enums<'pagamento_forma_t'>
type Fase = 'escolha' | 'fechou_pagamento' | 'fechou_agendar' | 'pensar' | 'nao' | 'pronto'

const FORMAS: { valor: Forma; rotulo: string }[] = [
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'cartao_credito', rotulo: 'Cartão de crédito' },
  { valor: 'cartao_debito', rotulo: 'Cartão de débito' },
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
]

const DUVIDAS: { valor: Enums<'objecao_t'>; rotulo: string }[] = [
  { valor: 'preco', rotulo: 'o preço' },
  { valor: 'tempo', rotulo: 'o tempo / agenda' },
  { valor: 'decisor', rotulo: 'quer conversar em casa' },
  { valor: 'vou_pensar', rotulo: 'só quer pensar' },
]

const OBJECOES: { valor: Enums<'objecao_t'>; rotulo: string }[] = [
  { valor: 'preco', rotulo: 'preço' },
  { valor: 'tempo', rotulo: 'tempo / agenda' },
  { valor: 'decisor', rotulo: 'decisor' },
  { valor: 'outra', rotulo: 'outra' },
]

export default function PassoDesfecho({ ctx }: { ctx: CtxSessao }) {
  const { paciente, sessao, config, rascunho, propostaDaSessao } = ctx
  const nome = nomeCurto(paciente)
  const valorPrograma =
    rascunho.programa === 'reset_10'
      ? (config?.preco_reset_centavos ?? 340000)
      : (config?.preco_alivio_centavos ?? 190000)

  const jaFechou = sessao.ciclo_id != null
  const [fase, setFase] = useState<Fase>(propostaDaSessao || jaFechou ? 'pronto' : 'escolha')
  const [forma, setForma] = useState<Forma | null>(null)
  const [parcelas, setParcelas] = useState<1 | 3>(1)
  const [duvida, setDuvida] = useState<Enums<'objecao_t'> | null>(null)
  const [objecao, setObjecao] = useState<Enums<'objecao_t'> | null>(null)
  const [gravando, setGravando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // pares de vagas prontos para as 2 primeiras sessões (2×/semana)
  const [par, setPar] = useState<Date[] | null>(null)
  const [vagasProntas, setVagasProntas] = useState<Date[]>([])
  const [marcadas, setMarcadas] = useState<Date[]>([])
  const [vagaRetorno, setVagaRetorno] = useState<Date | null>(null)
  const [retornoMarcado, setRetornoMarcado] = useState(false)

  useEffect(() => {
    void proximasVagasLivres(10).then((vs) => setVagasProntas(vs.map((v) => new Date(v.inicio))))
  }, [])

  useEffect(() => {
    if (vagasProntas.length === 0) return
    const primeira = vagasProntas[0]
    const segunda = vagasProntas.find(
      (v) => v.getTime() - primeira.getTime() >= 2 * 24 * 3600 * 1000,
    )
    setPar(segunda ? [primeira, segunda] : [primeira])
    const daqui2dias = vagasProntas.find((v) => v.getTime() > Date.now() + 36 * 3600 * 1000)
    setVagaRetorno(daqui2dias ?? null)
  }, [vagasProntas])

  async function confirmarFechamento() {
    if (!forma) return
    setGravando(true)
    setErro(null)
    try {
      const { ciclo, proposta } = await fecharPrograma({
        sessao,
        paciente,
        config,
        programa: rascunho.programa,
        forma,
        parcelas,
      })
      ctx.definirCiclo(ciclo)
      ctx.definirProposta(proposta)
      ctx.atualizarSessao({ ciclo_id: ciclo.id, numero_no_ciclo: 1 })
      ctx.atualizarPaciente({ status: 'em_programa' })
      setFase('fechou_agendar')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui registrar — tente de novo.')
    } finally {
      setGravando(false)
    }
  }

  async function marcarPar() {
    if (!par || par.length === 0) return
    setGravando(true)
    setErro(null)
    try {
      const novas: Date[] = []
      for (const inicio of par) {
        await criarAgendamento({
          paciente_id: paciente.id,
          ciclo_id: ctx.ciclo?.id ?? sessao.ciclo_id,
          tipo: 'ciclo',
          inicio,
          duracao_min: config?.duracao_ciclo_min ?? 50,
        })
        novas.push(inicio)
      }
      setMarcadas(novas)
      setFase('pronto')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui marcar as duas — dá para marcar na agenda depois.')
    } finally {
      setGravando(false)
    }
  }

  async function registrar(resultado: 'pendente' | 'nao_fechou', obj: Enums<'objecao_t'>) {
    setGravando(true)
    setErro(null)
    try {
      const p = await registrarProposta({
        sessao,
        programa: rascunho.programa,
        valorCentavos: valorPrograma,
        resultado,
        objecao: obj,
      })
      ctx.definirProposta(p)
      ctx.atualizarPaciente({ status: resultado === 'pendente' ? 'proposta_pendente' : 'inativa' })
      if (resultado === 'pendente' && obj === 'decisor' && vagaRetorno) {
        // continua na fase para oferecer o retorno de 48h com vaga
      } else {
        setFase('pronto')
      }
      return true
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui registrar — tente de novo.')
      return false
    } finally {
      setGravando(false)
    }
  }

  async function reservarRetorno() {
    if (!vagaRetorno) return
    setGravando(true)
    try {
      await criarAgendamento({
        paciente_id: paciente.id,
        tipo: 'retorno_proposta',
        inicio: vagaRetorno,
        duracao_min: 30,
      })
      setRetornoMarcado(true)
      setFase('pronto')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'A vaga foi ocupada — a fila de mensagens cuida do retorno.')
    } finally {
      setGravando(false)
    }
  }

  // ---------- já registrado ----------
  if (fase === 'pronto') {
    const resultado = ctx.propostaDaSessao?.resultado
    return (
      <section className="stack-lg" style={{ textAlign: 'center' }}>
        <h2>Combinado registrado ✓</h2>
        {(jaFechou || resultado === 'fechou_na_sala') && (
          <div className="card-flat stack">
            <p style={{ fontSize: 21, fontWeight: 600 }}>
              {nome} fechou o {NOME_PROGRAMA[rascunho.programa]} 🎉
            </p>
            {marcadas.length > 0 && (
              <p>
                Próximas sessões: {marcadas.map((m) => `${diaCurto(m)} às ${horaCurta(m)}`).join(' e ')} ✓
              </p>
            )}
            <p className="muted small">
              A mensagem de boa-noite entra sozinha nas MENSAGENS DE HOJE — nada para lembrar.
            </p>
          </div>
        )}
        {resultado === 'pendente' && (
          <div className="card-flat stack">
            <p style={{ fontSize: 20 }}>
              Vai pensar — o crédito de {dinheiro(config?.preco_primeira_centavos ?? 45000)} vale até{' '}
              {ctx.propostaDaSessao?.credito_expira
                ? diaPorExtenso(ctx.propostaDaSessao.credito_expira)
                : 'daqui a 7 dias'}
              .
            </p>
            {retornoMarcado && vagaRetorno && (
              <p>Retorno reservado: {diaCurto(vagaRetorno)} às {horaCurta(vagaRetorno)} ✓</p>
            )}
            <p className="muted small">O retorno de 48h e o aviso do dia 5 entram sozinhos na fila de mensagens.</p>
          </div>
        )}
        {resultado === 'nao_fechou' && (
          <p className="muted">Registrado, sem juízo. A ficha fica guardada com carinho.</p>
        )}
        <button type="button" className="btn btn-primary btn-xl" onClick={ctx.avancar}>
          Continuar →
        </button>
      </section>
    )
  }

  // ---------- FECHOU: forma de pagamento ----------
  if (fase === 'fechou_pagamento') {
    const aPagar = valorPrograma - (config?.preco_primeira_centavos ?? 45000)
    return (
      <section className="stack-lg">
        <h2>Como ela vai pagar o programa?</h2>
        <p style={{ fontSize: 20 }}>
          {NOME_PROGRAMA[rascunho.programa]}: {dinheiro(aPagar)} (crédito de hoje já abatido) — na sala, nunca depois.
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
        <div className="choice-row">
          <button type="button" className="choice" data-selected={parcelas === 1} onClick={() => setParcelas(1)}>
            à vista
          </button>
          <button type="button" className="choice" data-selected={parcelas === 3} onClick={() => setParcelas(3)}>
            3× de {dinheiro(Math.ceil(aPagar / 3 / 100) * 100)}
          </button>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-xl"
          disabled={!forma || gravando}
          onClick={() => void confirmarFechamento()}
        >
          {gravando ? 'Registrando…' : `Confirmar — fechou o ${NOME_PROGRAMA[rascunho.programa]} 🎉`}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setFase('escolha')}>
          voltar
        </button>
        {erro && <p className="small" style={{ fontWeight: 600, color: 'var(--ink-60)' }}>{erro}</p>}
      </section>
    )
  }

  // ---------- FECHOU: agendar as 2 primeiras antes de ela sair ----------
  if (fase === 'fechou_agendar') {
    return (
      <section className="stack-lg">
        <h2>Antes de ela sair: as 2 próximas sessões</h2>
        <p className="muted">A de hoje já é a sessão 1 do ciclo. Fase de 2× por semana.</p>
        {par && par.length > 0 ? (
          <button type="button" className="btn btn-primary btn-xl" disabled={gravando} onClick={() => void marcarPar()}>
            {gravando
              ? 'Marcando…'
              : par.map((p) => `${diaCurto(p)} · ${horaCurta(p)}`).join('  +  ')}
          </button>
        ) : (
          <p className="muted">Procurando vagas livres…</p>
        )}
        <button type="button" className="btn btn-ghost btn-block" onClick={() => setFase('pronto')}>
          marcar pela agenda depois
        </button>
        {erro && <p className="small" style={{ fontWeight: 600, color: 'var(--ink-60)' }}>{erro}</p>}
      </section>
    )
  }

  // ---------- VAI PENSAR ----------
  if (fase === 'pensar') {
    const registrada = ctx.propostaDaSessao?.resultado === 'pendente'
    return (
      <section className="stack-lg">
        <h2>Qual foi a dúvida?</h2>
        <div className="choice-row">
          {DUVIDAS.map((d) => (
            <button
              key={d.valor}
              type="button"
              className="choice"
              data-selected={duvida === d.valor}
              onClick={() => setDuvida(d.valor)}
            >
              {d.rotulo}
            </button>
          ))}
        </div>
        {!registrada ? (
          <button
            type="button"
            className="btn btn-primary btn-xl"
            disabled={!duvida || gravando}
            onClick={() => {
              if (duvida) void registrar('pendente', duvida)
            }}
          >
            {gravando ? 'Registrando…' : 'Registrar — crédito vale 7 dias'}
          </button>
        ) : (
          <div className="stack">
            <p style={{ fontWeight: 600, color: 'var(--jade)' }}>Registrado ✓</p>
            {duvida === 'decisor' && vagaRetorno && (
              <button type="button" className="btn btn-primary btn-xl" disabled={gravando} onClick={() => void reservarRetorno()}>
                Reservar retorno de 48h: {diaCurto(vagaRetorno)} às {horaCurta(vagaRetorno)}
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setFase('pronto')}>
              seguir sem reservar
            </button>
          </div>
        )}
        <button type="button" className="btn btn-ghost" onClick={() => setFase('escolha')}>
          voltar
        </button>
        {erro && <p className="small" style={{ fontWeight: 600, color: 'var(--ink-60)' }}>{erro}</p>}
      </section>
    )
  }

  // ---------- NÃO SEGUIU ----------
  if (fase === 'nao') {
    return (
      <section className="stack-lg">
        <h2>O que pesou para ela?</h2>
        <div className="choice-row">
          {OBJECOES.map((o) => (
            <button
              key={o.valor}
              type="button"
              className="choice"
              data-selected={objecao === o.valor}
              onClick={() => setObjecao(o.valor)}
            >
              {o.rotulo}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-xl"
          disabled={!objecao || gravando}
          onClick={() => {
            if (objecao) void registrar('nao_fechou', objecao)
          }}
        >
          {gravando ? 'Registrando…' : 'Registrar, sem juízo'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setFase('escolha')}>
          voltar
        </button>
        {erro && <p className="small" style={{ fontWeight: 600, color: 'var(--ink-60)' }}>{erro}</p>}
      </section>
    )
  }

  // ---------- a escolha ----------
  return (
    <section className="stack-lg">
      <h2>E aí — o que a {nome} decidiu?</h2>
      <button type="button" className="btn btn-primary btn-xl" onClick={() => setFase('fechou_pagamento')}>
        Fechou o programa 🎉
      </button>
      <button type="button" className="btn btn-ghost btn-xl" onClick={() => setFase('pensar')}>
        Vai pensar — crédito vale 7 dias
      </button>
      <button type="button" className="btn btn-ghost btn-xl" onClick={() => setFase('nao')}>
        Não seguiu
      </button>
    </section>
  )
}
