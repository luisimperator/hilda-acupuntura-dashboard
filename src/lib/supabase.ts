import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// A chave publicável é pública por definição (vai para o navegador);
// a proteção dos dados é o RLS + allowlist de usuários no banco.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'https://uwbofeleagsdtdsnrdhj.supabase.co'
const key =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  'sb_publishable_fJr0d-TYW5MCtMmgAw24mw_PcQlWYhP'

export const supabase = createClient<Database>(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
