export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          atualizado_em: string
          ciclo_id: string | null
          criado_em: string
          duracao_min: number
          id: string
          inicio: string
          observacao: string | null
          paciente_id: string
          remarcado_de: string | null
          status: Database["public"]["Enums"]["agendamento_status_t"]
          tipo: Database["public"]["Enums"]["agendamento_tipo_t"]
        }
        Insert: {
          atualizado_em?: string
          ciclo_id?: string | null
          criado_em?: string
          duracao_min?: number
          id?: string
          inicio: string
          observacao?: string | null
          paciente_id: string
          remarcado_de?: string | null
          status?: Database["public"]["Enums"]["agendamento_status_t"]
          tipo?: Database["public"]["Enums"]["agendamento_tipo_t"]
        }
        Update: {
          atualizado_em?: string
          ciclo_id?: string | null
          criado_em?: string
          duracao_min?: number
          id?: string
          inicio?: string
          observacao?: string | null
          paciente_id?: string
          remarcado_de?: string | null
          status?: Database["public"]["Enums"]["agendamento_status_t"]
          tipo?: Database["public"]["Enums"]["agendamento_tipo_t"]
        }
        Relationships: []
      }
      app_usuarios_permitidos: {
        Row: {
          criado_em: string
          email: string
          nome: string
          papel: string
        }
        Insert: {
          criado_em?: string
          email: string
          nome: string
          papel?: string
        }
        Update: {
          criado_em?: string
          email?: string
          nome?: string
          papel?: string
        }
        Relationships: []
      }
      avaliacoes: {
        Row: {
          ciclo_id: string | null
          criado_em: string
          criterio_atingido: boolean | null
          eva: number
          eva_base: number | null
          freq_dor_semana: number | null
          id: string
          impede_frases: Json
          mapa_zonas: string[]
          paciente_id: string
          proxima_fase: Database["public"]["Enums"]["proxima_fase_t"] | null
          queda_pct: number | null
          queda_pontos: number | null
          relatorio_impresso_em: string | null
          sessao_id: string
          tipo: Database["public"]["Enums"]["avaliacao_tipo_t"]
        }
        Insert: {
          ciclo_id?: string | null
          criado_em?: string
          eva: number
          eva_base?: number | null
          freq_dor_semana?: number | null
          id?: string
          impede_frases?: Json
          mapa_zonas?: string[]
          paciente_id: string
          proxima_fase?: Database["public"]["Enums"]["proxima_fase_t"] | null
          relatorio_impresso_em?: string | null
          sessao_id: string
          tipo: Database["public"]["Enums"]["avaliacao_tipo_t"]
        }
        Update: {
          ciclo_id?: string | null
          criado_em?: string
          eva?: number
          eva_base?: number | null
          freq_dor_semana?: number | null
          id?: string
          impede_frases?: Json
          mapa_zonas?: string[]
          paciente_id?: string
          proxima_fase?: Database["public"]["Enums"]["proxima_fase_t"] | null
          relatorio_impresso_em?: string | null
          sessao_id?: string
          tipo?: Database["public"]["Enums"]["avaliacao_tipo_t"]
        }
        Relationships: []
      }
      ciclos: {
        Row: {
          atualizado_em: string
          concluido_em: string | null
          condicao: Database["public"]["Enums"]["condicao_t"]
          credito_centavos: number
          criado_em: string
          fechado_em: string
          id: string
          iniciado_em: string | null
          paciente_id: string
          parcelas: number
          preco_centavos: number
          programa: Database["public"]["Enums"]["programa_t"]
          proxima_fase: Database["public"]["Enums"]["proxima_fase_t"] | null
          sessoes_total: number
          status: Database["public"]["Enums"]["ciclo_status_t"]
        }
        Insert: {
          atualizado_em?: string
          concluido_em?: string | null
          condicao: Database["public"]["Enums"]["condicao_t"]
          credito_centavos?: number
          criado_em?: string
          fechado_em?: string
          id?: string
          iniciado_em?: string | null
          paciente_id: string
          parcelas?: number
          preco_centavos: number
          programa: Database["public"]["Enums"]["programa_t"]
          proxima_fase?: Database["public"]["Enums"]["proxima_fase_t"] | null
          sessoes_total: number
          status?: Database["public"]["Enums"]["ciclo_status_t"]
        }
        Update: {
          atualizado_em?: string
          concluido_em?: string | null
          condicao?: Database["public"]["Enums"]["condicao_t"]
          credito_centavos?: number
          criado_em?: string
          fechado_em?: string
          id?: string
          iniciado_em?: string | null
          paciente_id?: string
          parcelas?: number
          preco_centavos?: number
          programa?: Database["public"]["Enums"]["programa_t"]
          proxima_fase?: Database["public"]["Enums"]["proxima_fase_t"] | null
          sessoes_total?: number
          status?: Database["public"]["Enums"]["ciclo_status_t"]
        }
        Relationships: []
      }
      config: {
        Row: {
          atualizado_em: string
          capacidade_semana: number
          duracao_ciclo_min: number
          duracao_primeira_min: number
          endereco: string
          grade: Json
          id: boolean
          preco_alivio_centavos: number
          preco_avulsa_centavos: number
          preco_continuidade_centavos: number
          preco_primeira_centavos: number
          preco_reset_centavos: number
        }
        Insert: {
          atualizado_em?: string
          capacidade_semana?: number
          duracao_ciclo_min?: number
          duracao_primeira_min?: number
          endereco?: string
          grade?: Json
          id?: boolean
          preco_alivio_centavos?: number
          preco_avulsa_centavos?: number
          preco_continuidade_centavos?: number
          preco_primeira_centavos?: number
          preco_reset_centavos?: number
        }
        Update: {
          atualizado_em?: string
          capacidade_semana?: number
          duracao_ciclo_min?: number
          duracao_primeira_min?: number
          endereco?: string
          grade?: Json
          id?: boolean
          preco_alivio_centavos?: number
          preco_avulsa_centavos?: number
          preco_continuidade_centavos?: number
          preco_primeira_centavos?: number
          preco_reset_centavos?: number
        }
        Relationships: []
      }
      ia_config: {
        Row: {
          ativo: boolean
          atualizado_em: string
          id: boolean
          instrucoes: string
          modelo: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          id?: boolean
          instrucoes?: string
          modelo?: string
          nome?: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          id?: boolean
          instrucoes?: string
          modelo?: string
          nome?: string
        }
        Relationships: []
      }
      ia_conhecimento: {
        Row: {
          ativo: boolean
          atualizado_em: string
          categoria: string
          conteudo: string
          criado_em: string
          id: string
          ordem: number
          titulo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          categoria?: string
          conteudo: string
          criado_em?: string
          id?: string
          ordem?: number
          titulo: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          categoria?: string
          conteudo?: string
          criado_em?: string
          id?: string
          ordem?: number
          titulo?: string
        }
        Relationships: []
      }
      ia_conversas: {
        Row: {
          canal: string
          contato_externo_id: string | null
          contato_nome: string | null
          contato_telefone: string | null
          encaminhada_para_humano: boolean
          id: string
          iniciada_em: string
          motivo_encaminhamento: string | null
          ultima_mensagem_em: string
        }
        Insert: {
          canal?: string
          contato_externo_id?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          encaminhada_para_humano?: boolean
          id?: string
          iniciada_em?: string
          motivo_encaminhamento?: string | null
          ultima_mensagem_em?: string
        }
        Update: {
          canal?: string
          contato_externo_id?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          encaminhada_para_humano?: boolean
          id?: string
          iniciada_em?: string
          motivo_encaminhamento?: string | null
          ultima_mensagem_em?: string
        }
        Relationships: []
      }
      ia_mensagens: {
        Row: {
          conteudo: string
          conversa_id: string
          criada_em: string
          id: string
          papel: string
        }
        Insert: {
          conteudo: string
          conversa_id: string
          criada_em?: string
          id?: string
          papel: string
        }
        Update: {
          conteudo?: string
          conversa_id?: string
          criada_em?: string
          id?: string
          papel?: string
        }
        Relationships: []
      }
      mensagens_wa: {
        Row: {
          agendamento_id: string | null
          ciclo_id: string | null
          corpo: string
          enviada_em: string
          id: string
          paciente_id: string
          proposta_id: string | null
          sessao_id: string | null
          template: Database["public"]["Enums"]["wa_template_t"]
        }
        Insert: {
          agendamento_id?: string | null
          ciclo_id?: string | null
          corpo: string
          enviada_em?: string
          id?: string
          paciente_id: string
          proposta_id?: string | null
          sessao_id?: string | null
          template: Database["public"]["Enums"]["wa_template_t"]
        }
        Update: {
          agendamento_id?: string | null
          ciclo_id?: string | null
          corpo?: string
          enviada_em?: string
          id?: string
          paciente_id?: string
          proposta_id?: string | null
          sessao_id?: string | null
          template?: Database["public"]["Enums"]["wa_template_t"]
        }
        Relationships: []
      }
      pacientes: {
        Row: {
          anticoagulante: boolean
          atualizado_em: string
          condicao: Database["public"]["Enums"]["condicao_t"] | null
          criado_em: string
          decisor: Database["public"]["Enums"]["decisor_t"]
          diabetes_neuropatia: boolean
          eva_landing: number | null
          gestante: boolean
          id: string
          marcapasso: boolean
          medo_agulha: boolean
          nascimento: string | null
          nome: string
          objetivo_frase: string | null
          observacoes: string | null
          origem: string
          status: Database["public"]["Enums"]["paciente_status_t"]
          telefone_wa: string | null
          tratamento: string | null
        }
        Insert: {
          anticoagulante?: boolean
          atualizado_em?: string
          condicao?: Database["public"]["Enums"]["condicao_t"] | null
          criado_em?: string
          decisor?: Database["public"]["Enums"]["decisor_t"]
          diabetes_neuropatia?: boolean
          eva_landing?: number | null
          gestante?: boolean
          id?: string
          marcapasso?: boolean
          medo_agulha?: boolean
          nascimento?: string | null
          nome: string
          objetivo_frase?: string | null
          observacoes?: string | null
          origem?: string
          status?: Database["public"]["Enums"]["paciente_status_t"]
          telefone_wa?: string | null
          tratamento?: string | null
        }
        Update: {
          anticoagulante?: boolean
          atualizado_em?: string
          condicao?: Database["public"]["Enums"]["condicao_t"] | null
          criado_em?: string
          decisor?: Database["public"]["Enums"]["decisor_t"]
          diabetes_neuropatia?: boolean
          eva_landing?: number | null
          gestante?: boolean
          id?: string
          marcapasso?: boolean
          medo_agulha?: boolean
          nascimento?: string | null
          nome?: string
          objetivo_frase?: string | null
          observacoes?: string | null
          origem?: string
          status?: Database["public"]["Enums"]["paciente_status_t"]
          telefone_wa?: string | null
          tratamento?: string | null
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          ciclo_id: string | null
          criado_em: string
          descricao: string | null
          forma: Database["public"]["Enums"]["pagamento_forma_t"]
          id: string
          paciente_id: string
          pago_em: string
          parcelas: number
          valor_centavos: number
        }
        Insert: {
          ciclo_id?: string | null
          criado_em?: string
          descricao?: string | null
          forma: Database["public"]["Enums"]["pagamento_forma_t"]
          id?: string
          paciente_id: string
          pago_em?: string
          parcelas?: number
          valor_centavos: number
        }
        Update: {
          ciclo_id?: string | null
          criado_em?: string
          descricao?: string | null
          forma?: Database["public"]["Enums"]["pagamento_forma_t"]
          id?: string
          paciente_id?: string
          pago_em?: string
          parcelas?: number
          valor_centavos?: number
        }
        Relationships: []
      }
      propostas: {
        Row: {
          atualizado_em: string
          ciclo_id: string | null
          credito_expira: string | null
          criado_em: string
          data: string
          decidido_em: string | null
          id: string
          objecao: Database["public"]["Enums"]["objecao_t"]
          paciente_id: string
          programa_oferecido: Database["public"]["Enums"]["programa_t"]
          resultado: Database["public"]["Enums"]["proposta_resultado_t"]
          sessao_id: string | null
          valor_centavos: number
        }
        Insert: {
          atualizado_em?: string
          ciclo_id?: string | null
          credito_expira?: string | null
          criado_em?: string
          data?: string
          decidido_em?: string | null
          id?: string
          objecao?: Database["public"]["Enums"]["objecao_t"]
          paciente_id: string
          programa_oferecido: Database["public"]["Enums"]["programa_t"]
          resultado?: Database["public"]["Enums"]["proposta_resultado_t"]
          sessao_id?: string | null
          valor_centavos: number
        }
        Update: {
          atualizado_em?: string
          ciclo_id?: string | null
          credito_expira?: string | null
          criado_em?: string
          data?: string
          decidido_em?: string | null
          id?: string
          objecao?: Database["public"]["Enums"]["objecao_t"]
          paciente_id?: string
          programa_oferecido?: Database["public"]["Enums"]["programa_t"]
          resultado?: Database["public"]["Enums"]["proposta_resultado_t"]
          sessao_id?: string | null
          valor_centavos?: number
        }
        Relationships: []
      }
      red_flags: {
        Row: {
          alguma_positiva: boolean
          criado_em: string
          encaminhada: boolean
          id: string
          obs: string | null
          paciente_id: string
          respostas: Json
          sessao_id: string
        }
        Insert: {
          alguma_positiva: boolean
          criado_em?: string
          encaminhada?: boolean
          id?: string
          obs?: string | null
          paciente_id: string
          respostas: Json
          sessao_id: string
        }
        Update: {
          alguma_positiva?: boolean
          criado_em?: string
          encaminhada?: boolean
          id?: string
          obs?: string | null
          paciente_id?: string
          respostas?: Json
          sessao_id?: string
        }
        Relationships: []
      }
      sessoes: {
        Row: {
          agendamento_id: string | null
          agulhas_colocadas: number | null
          agulhas_conferidas: boolean
          agulhas_retiradas: number | null
          atualizado_em: string
          auriculo: boolean
          auriculo_pontos: string[]
          ciclo_id: string | null
          concluida_em: string | null
          destrav_regioes: string[]
          destravamento: boolean | null
          eletro: boolean
          eva_pos: number | null
          eva_pre: number | null
          historia: string | null
          id: string
          iniciada_em: string
          intercorrencia_obs: string | null
          intercorrencias: string[]
          medicacoes: string | null
          moxa: boolean
          numero_no_ciclo: number | null
          orientacao_livre: string | null
          orientacoes: string[]
          paciente_id: string
          passo_atual: string
          pontos: string[]
          respiracao_guiada: boolean
          status: Database["public"]["Enums"]["sessao_status_t"]
          termo_assinado: boolean
          tipo: Database["public"]["Enums"]["sessao_tipo_t"]
          ventosa: boolean
        }
        Insert: {
          agendamento_id?: string | null
          agulhas_colocadas?: number | null
          agulhas_conferidas?: boolean
          agulhas_retiradas?: number | null
          atualizado_em?: string
          auriculo?: boolean
          auriculo_pontos?: string[]
          ciclo_id?: string | null
          concluida_em?: string | null
          destrav_regioes?: string[]
          destravamento?: boolean | null
          eletro?: boolean
          eva_pos?: number | null
          eva_pre?: number | null
          historia?: string | null
          id?: string
          iniciada_em?: string
          intercorrencia_obs?: string | null
          intercorrencias?: string[]
          medicacoes?: string | null
          moxa?: boolean
          numero_no_ciclo?: number | null
          orientacao_livre?: string | null
          orientacoes?: string[]
          paciente_id: string
          passo_atual?: string
          pontos?: string[]
          respiracao_guiada?: boolean
          status?: Database["public"]["Enums"]["sessao_status_t"]
          termo_assinado?: boolean
          tipo?: Database["public"]["Enums"]["sessao_tipo_t"]
          ventosa?: boolean
        }
        Update: {
          agendamento_id?: string | null
          agulhas_colocadas?: number | null
          agulhas_conferidas?: boolean
          agulhas_retiradas?: number | null
          atualizado_em?: string
          auriculo?: boolean
          auriculo_pontos?: string[]
          ciclo_id?: string | null
          concluida_em?: string | null
          destrav_regioes?: string[]
          destravamento?: boolean | null
          eletro?: boolean
          eva_pos?: number | null
          eva_pre?: number | null
          historia?: string | null
          id?: string
          iniciada_em?: string
          intercorrencia_obs?: string | null
          intercorrencias?: string[]
          medicacoes?: string | null
          moxa?: boolean
          numero_no_ciclo?: number | null
          orientacao_livre?: string | null
          orientacoes?: string[]
          paciente_id?: string
          passo_atual?: string
          pontos?: string[]
          respiracao_guiada?: boolean
          status?: Database["public"]["Enums"]["sessao_status_t"]
          termo_assinado?: boolean
          tipo?: Database["public"]["Enums"]["sessao_tipo_t"]
          ventosa?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      v_efeito_destravamento: {
        Row: {
          destravamento: boolean | null
          queda_media_na_sessao: number | null
          sessoes: number | null
        }
        Relationships: []
      }
      v_eva_marketing: {
        Row: {
          criterio_atingido: number | null
          criterio_nao_atingido: number | null
          queda_media_pct: number | null
          queda_media_pontos: number | null
          reavaliacoes: number | null
        }
        Relationships: []
      }
      v_evolucao_eva: {
        Row: {
          ciclo_id: string | null
          data: string | null
          destravamento: boolean | null
          eva_pos: number | null
          eva_pre: number | null
          nome: string | null
          numero_no_ciclo: number | null
          paciente_id: string | null
          queda_imediata: number | null
        }
        Relationships: []
      }
      v_funil_mensal: {
        Row: {
          fechou_na_sala: number | null
          fechou_total: number | null
          leads: number | null
          mes: string | null
          primeiras_sessoes: number | null
          propostas: number | null
          taxa_sala_pct: number | null
          taxa_total_pct: number | null
        }
        Relationships: []
      }
      v_mensagens_hoje: {
        Row: {
          agendamento_id: string | null
          ciclo_id: string | null
          paciente_id: string | null
          proposta_id: string | null
          referencia: string | null
          sessao_id: string | null
          template: Database["public"]["Enums"]["wa_template_t"] | null
        }
        Relationships: []
      }
      v_objecoes_mensal: {
        Row: {
          mes: string | null
          objecao: Database["public"]["Enums"]["objecao_t"] | null
          vezes: number | null
        }
        Relationships: []
      }
      v_ocupacao_semanal: {
        Row: {
          agendadas: number | null
          faltas: number | null
          realizadas: number | null
          semana: string | null
        }
        Relationships: []
      }
      v_receita_mensal: {
        Row: {
          lancamentos: number | null
          mes: string | null
          programas_fechados: number | null
          receita_reais: number | null
          ticket_medio_programa: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_app_user: { Args: never; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      agendamento_status_t: "agendada" | "realizada" | "faltou" | "cancelada"
      agendamento_tipo_t:
        | "primeira"
        | "ciclo"
        | "manutencao"
        | "avulsa"
        | "retorno_proposta"
      avaliacao_tipo_t: "inicial" | "checkpoint"
      ciclo_status_t: "ativo" | "concluido" | "garantia_acionada" | "cancelado"
      condicao_t:
        | "lombalgia"
        | "cervical_ombros"
        | "enxaqueca"
        | "joelho"
        | "estresse_sono"
        | "outra"
      decisor_t: "nao_perguntado" | "sozinha" | "conjuge" | "filho_a" | "outro"
      objecao_t:
        | "nenhuma"
        | "preco"
        | "tempo"
        | "decisor"
        | "vou_pensar"
        | "outra"
      paciente_status_t:
        | "lead"
        | "primeira_agendada"
        | "proposta_pendente"
        | "em_programa"
        | "manutencao"
        | "alta"
        | "inativa"
      pagamento_forma_t:
        | "pix"
        | "cartao_credito"
        | "cartao_debito"
        | "dinheiro"
        | "outro"
      programa_t: "reset_10" | "alivio_5" | "continuidade" | "avulsa"
      proposta_resultado_t:
        | "pendente"
        | "fechou_na_sala"
        | "fechou_7_dias"
        | "nao_fechou"
        | "expirada"
      proxima_fase_t:
        | "concluir_ciclo"
        | "ajustar_protocolo"
        | "manutencao"
        | "alta"
      sessao_status_t: "em_andamento" | "concluida" | "abortada"
      sessao_tipo_t: "primeira" | "ciclo" | "manutencao" | "avulsa"
      wa_template_t:
        | "resposta_lead"
        | "lembrete_vespera"
        | "checkin_2a"
        | "pos_primeira_24h"
        | "boa_noite_fechamento"
        | "retorno_48h"
        | "credito_expira"
        | "followup_30d"
        | "falta_reagendar"
        | "remarcacao"
        | "livre"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])> =
  (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never

export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]
