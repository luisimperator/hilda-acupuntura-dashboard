// Autosave da sessão: cada toque grava no banco na hora (spec §6.1).
// Se a internet cair, a gravação entra numa fila persistida em localStorage
// e é reenviada sozinha quando a conexão voltar. Sem modal, sem drama.

import { supabase } from './supabase'
import type { TablesUpdate } from './database.types'

type Pendencia = {
  sessaoId: string
  campos: TablesUpdate<'sessoes'>
  em: number
}

const CHAVE = 'hilda-autosave-fila'
let avisar: ((online: boolean, pendentes: number) => void) | null = null
let reenviando = false

function lerFila(): Pendencia[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? '[]') as Pendencia[]
  } catch {
    return []
  }
}

function gravarFila(fila: Pendencia[]) {
  localStorage.setItem(CHAVE, JSON.stringify(fila))
  avisar?.(navigator.onLine, fila.length)
}

/** Registra um callback para o banner "sem internet" da UI. */
export function aoMudarEstadoAutosave(cb: (online: boolean, pendentes: number) => void) {
  avisar = cb
  cb(navigator.onLine, lerFila().length)
}

/** Grava campos da sessão agora; se falhar, enfileira e tenta de novo sozinho. */
export async function salvarSessao(sessaoId: string, campos: TablesUpdate<'sessoes'>): Promise<void> {
  const { error } = await supabase.from('sessoes').update(campos).eq('id', sessaoId)
  if (error) {
    const fila = lerFila()
    fila.push({ sessaoId, campos, em: Date.now() })
    gravarFila(fila)
  } else {
    avisar?.(navigator.onLine, lerFila().length)
  }
}

export async function reenviarFila(): Promise<void> {
  if (reenviando) return
  reenviando = true
  try {
    let fila = lerFila()
    while (fila.length > 0) {
      const item = fila[0]
      const { error } = await supabase.from('sessoes').update(item.campos).eq('id', item.sessaoId)
      if (error) break
      fila = fila.slice(1)
      gravarFila(fila)
    }
  } finally {
    reenviando = false
  }
}

// Religa a fila quando a conexão volta e tenta a cada 15s enquanto houver pendência.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    avisar?.(true, lerFila().length)
    void reenviarFila()
  })
  window.addEventListener('offline', () => avisar?.(false, lerFila().length))
  setInterval(() => {
    if (navigator.onLine && lerFila().length > 0) void reenviarFila()
  }, 15000)
}
