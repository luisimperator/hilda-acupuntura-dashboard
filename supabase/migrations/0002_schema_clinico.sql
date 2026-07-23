-- =====================================================================
-- CONSULTORIO HILDA · DASHBOARD DE ATENDIMENTO — SCHEMA FINAL V1
-- Postgres 15+ / Supabase · migration unica
-- =====================================================================

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type paciente_status_t   as enum ('lead','primeira_agendada','proposta_pendente','em_programa','manutencao','alta','inativa');
create type condicao_t          as enum ('lombalgia','cervical_ombros','enxaqueca','joelho','estresse_sono','outra');
create type decisor_t           as enum ('nao_perguntado','sozinha','conjuge','filho_a','outro');
create type programa_t          as enum ('reset_10','alivio_5','continuidade','avulsa');
create type ciclo_status_t      as enum ('ativo','concluido','garantia_acionada','cancelado');
create type proxima_fase_t      as enum ('concluir_ciclo','ajustar_protocolo','manutencao','alta');
create type sessao_tipo_t       as enum ('primeira','ciclo','manutencao','avulsa');
create type sessao_status_t     as enum ('em_andamento','concluida','abortada');
create type agendamento_tipo_t  as enum ('primeira','ciclo','manutencao','avulsa','retorno_proposta');
create type agendamento_status_t as enum ('agendada','realizada','faltou','cancelada');
create type avaliacao_tipo_t    as enum ('inicial','checkpoint');
create type proposta_resultado_t as enum ('pendente','fechou_na_sala','fechou_7_dias','nao_fechou','expirada');
create type objecao_t           as enum ('nenhuma','preco','tempo','decisor','vou_pensar','outra');
create type pagamento_forma_t   as enum ('pix','cartao_credito','cartao_debito','dinheiro','outro');
create type wa_template_t       as enum ('resposta_lead','lembrete_vespera','checkin_2a','pos_primeira_24h',
                                         'boa_noite_fechamento','retorno_48h','credito_expira','followup_30d',
                                         'falta_reagendar','remarcacao','livre');

-- ---------------------------------------------------------------------
create or replace function public.tg_set_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- CONFIG — linha unica da casa
-- ---------------------------------------------------------------------
create table public.config (
  id                       boolean primary key default true check (id),
  endereco                 text not null default '',
  -- grade: [{"dia":2,"turnos":[["09:00","12:00"],["14:00","18:00"]]}]  dia: 0=dom..6=sab
  grade                    jsonb not null default '[]'::jsonb,
  capacidade_semana        smallint not null default 26,
  duracao_ciclo_min        smallint not null default 50,
  duracao_primeira_min     smallint not null default 90,
  preco_primeira_centavos  integer not null default 45000,
  preco_reset_centavos     integer not null default 340000,
  preco_alivio_centavos    integer not null default 180000,
  preco_continuidade_centavos integer not null default 128000,
  preco_avulsa_centavos    integer not null default 38000,
  atualizado_em            timestamptz not null default now()
);
insert into public.config (id) values (true);
create trigger trg_config_upd before update on public.config
  for each row execute function public.tg_set_atualizado_em();

-- ---------------------------------------------------------------------
-- PACIENTES (lead = paciente com status 'lead')
-- ---------------------------------------------------------------------
create table public.pacientes (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null,
  tratamento          text,
  telefone_wa         text,
  nascimento          date,
  status              paciente_status_t not null default 'lead',
  condicao            condicao_t,
  origem              text not null default 'landing',
  eva_landing         smallint check (eva_landing between 0 and 10),
  objetivo_frase      text,
  decisor             decisor_t not null default 'nao_perguntado',
  anticoagulante      boolean not null default false,
  gestante            boolean not null default false,
  marcapasso          boolean not null default false,
  diabetes_neuropatia boolean not null default false,
  medo_agulha         boolean not null default false,
  observacoes         text,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);
create index idx_pacientes_status    on public.pacientes (status);
create index idx_pacientes_nome_trgm on public.pacientes using gin (nome gin_trgm_ops);
create trigger trg_pacientes_upd before update on public.pacientes
  for each row execute function public.tg_set_atualizado_em();

-- ---------------------------------------------------------------------
-- CICLOS — o programa comprado (so nasce quando fecha)
-- ---------------------------------------------------------------------
create table public.ciclos (
  id                uuid primary key default gen_random_uuid(),
  paciente_id       uuid not null references public.pacientes(id),
  programa          programa_t not null,
  condicao          condicao_t not null,
  status            ciclo_status_t not null default 'ativo',
  sessoes_total     smallint not null check (sessoes_total > 0),
  preco_centavos    integer not null check (preco_centavos >= 0),
  credito_centavos  integer not null default 0,
  parcelas          smallint not null default 1,
  fechado_em        timestamptz not null default now(),
  iniciado_em       date,
  concluido_em      date,
  proxima_fase      proxima_fase_t,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);
create index idx_ciclos_paciente on public.ciclos (paciente_id);
create index idx_ciclos_status   on public.ciclos (status);
create trigger trg_ciclos_upd before update on public.ciclos
  for each row execute function public.tg_set_atualizado_em();

-- ---------------------------------------------------------------------
-- AGENDAMENTOS
-- ---------------------------------------------------------------------
create table public.agendamentos (
  id            uuid primary key default gen_random_uuid(),
  paciente_id   uuid not null references public.pacientes(id),
  ciclo_id      uuid references public.ciclos(id),
  tipo          agendamento_tipo_t not null default 'ciclo',
  status        agendamento_status_t not null default 'agendada',
  inicio        timestamptz not null,
  duracao_min   smallint not null default 50,
  remarcado_de  uuid references public.agendamentos(id),
  observacao    text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index idx_ag_inicio   on public.agendamentos (inicio);
create index idx_ag_paciente on public.agendamentos (paciente_id, inicio desc);
create index idx_ag_status   on public.agendamentos (status, inicio);
-- slot ocupado nao existe duas vezes:
create unique index uq_agenda_slot on public.agendamentos (inicio) where status = 'agendada';
create trigger trg_ag_upd before update on public.agendamentos
  for each row execute function public.tg_set_atualizado_em();

-- ---------------------------------------------------------------------
-- SESSOES — o prontuario (protocolo §9) + autosave
-- ---------------------------------------------------------------------
create table public.sessoes (
  id                 uuid primary key default gen_random_uuid(),
  agendamento_id     uuid unique references public.agendamentos(id),
  paciente_id        uuid not null references public.pacientes(id),
  ciclo_id           uuid references public.ciclos(id),
  numero_no_ciclo    smallint check (numero_no_ciclo >= 1),
  tipo               sessao_tipo_t not null default 'ciclo',
  status             sessao_status_t not null default 'em_andamento',
  passo_atual        text not null default 'capa',
  eva_pre            smallint check (eva_pre between 0 and 10),
  eva_pos            smallint check (eva_pos between 0 and 10),
  destravamento      boolean,
  destrav_regioes    text[] not null default '{}',
  pontos             text[] not null default '{}',
  eletro             boolean not null default false,
  moxa               boolean not null default false,
  ventosa            boolean not null default false,
  auriculo           boolean not null default false,
  auriculo_pontos    text[] not null default '{}',
  respiracao_guiada  boolean not null default false,
  agulhas_colocadas  smallint check (agulhas_colocadas >= 0),
  agulhas_retiradas  smallint check (agulhas_retiradas >= 0),
  agulhas_conferidas boolean not null default false,
  intercorrencias    text[] not null default '{}',
  intercorrencia_obs text,
  orientacoes        text[] not null default '{}',
  orientacao_livre   text,
  termo_assinado     boolean not null default false,
  historia           text,
  medicacoes         text,
  iniciada_em        timestamptz not null default now(),
  concluida_em       timestamptz,
  atualizado_em      timestamptz not null default now(),
  -- inegociavel nº 1 no banco, nao so no wizard:
  constraint ck_sessao_concluida check (
    status <> 'concluida'
    or (eva_pre is not null and eva_pos is not null and agulhas_conferidas)
  )
);
-- no maximo UMA sessao aberta por paciente (retomada inequivoca):
create unique index uq_sessao_aberta on public.sessoes (paciente_id) where status = 'em_andamento';
-- nunca duas "sessao 4" no mesmo ciclo:
create unique index uq_sessao_ciclo_num on public.sessoes (ciclo_id, numero_no_ciclo) where ciclo_id is not null;
create index idx_sessoes_paciente on public.sessoes (paciente_id, iniciada_em desc);
create index idx_sessoes_ciclo    on public.sessoes (ciclo_id, numero_no_ciclo);
create trigger trg_sessoes_upd before update on public.sessoes
  for each row execute function public.tg_set_atualizado_em();

-- ---------------------------------------------------------------------
-- AVALIACOES — base (1ª) e checkpoint (5ª); a garantia mora aqui
-- ---------------------------------------------------------------------
create table public.avaliacoes (
  id                    uuid primary key default gen_random_uuid(),
  paciente_id           uuid not null references public.pacientes(id),
  sessao_id             uuid not null unique references public.sessoes(id),
  ciclo_id              uuid references public.ciclos(id),
  tipo                  avaliacao_tipo_t not null,
  eva                   smallint not null check (eva between 0 and 10),
  -- checkpoint: snapshot da base (copiado da avaliacao inicial no insert)
  eva_base              smallint check (eva_base between 1 and 10),
  queda_pontos          smallint generated always as (eva_base - eva) stored,
  queda_pct             numeric(5,1) generated always as
                        (round((eva_base - eva)::numeric * 100 / eva_base, 1)) stored,
  -- criterio literal do protocolo §8: queda >= 2 pontos OU >= 30% da base
  criterio_atingido     boolean generated always as
                        (((eva_base - eva) >= 2)
                         or ((eva_base - eva)::numeric / eva_base >= 0.30)) stored,
  mapa_zonas            text[] not null default '{}',
  freq_dor_semana       smallint check (freq_dor_semana between 0 and 7),
  -- "o que a dor te impede de fazer?" — as frases dela: ["...","..."]
  impede_frases         jsonb not null default '[]'::jsonb,
  proxima_fase          proxima_fase_t,
  relatorio_impresso_em timestamptz,
  criado_em             timestamptz not null default now(),
  constraint ck_checkpoint_tem_base check (tipo <> 'checkpoint' or eva_base is not null)
);
-- 1 inicial e 1 checkpoint por ciclo (reimpressao nunca duplica medicao):
create unique index uq_avaliacao_ciclo_tipo on public.avaliacoes (ciclo_id, tipo) where ciclo_id is not null;
create index idx_avaliacoes_paciente on public.avaliacoes (paciente_id, criado_em desc);

-- ---------------------------------------------------------------------
-- RED FLAGS — checklist da 1ª sessao (protocolo §4), auditavel por sessao
-- ---------------------------------------------------------------------
create table public.red_flags (
  id              uuid primary key default gen_random_uuid(),
  sessao_id       uuid not null unique references public.sessoes(id),
  paciente_id     uuid not null references public.pacientes(id),
  -- {"trauma_recente":false,"deficit_neuro":false,"cauda_equina":false,
  --  "febre_coluna":false,"perda_peso":false,"dor_noturna":false,
  --  "historico_onco":false,"fratura_infeccao":false}
  respostas       jsonb not null,
  alguma_positiva boolean not null,
  encaminhada     boolean not null default false,
  obs             text,
  criado_em       timestamptz not null default now()
);
create index idx_redflags_paciente on public.red_flags (paciente_id);

-- ---------------------------------------------------------------------
-- PROPOSTAS — o funil do playbook (§6) em colunas literais
-- ---------------------------------------------------------------------
create table public.propostas (
  id                 uuid primary key default gen_random_uuid(),
  paciente_id        uuid not null references public.pacientes(id),
  sessao_id          uuid references public.sessoes(id),
  ciclo_id           uuid references public.ciclos(id),
  data               date not null default current_date,
  programa_oferecido programa_t not null,
  valor_centavos     integer not null,
  resultado          proposta_resultado_t not null default 'pendente',
  objecao            objecao_t not null default 'nenhuma',
  credito_expira     date,
  decidido_em        date,
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);
create index idx_propostas_resultado on public.propostas (resultado, data);
create index idx_propostas_paciente  on public.propostas (paciente_id);
create trigger trg_propostas_upd before update on public.propostas
  for each row execute function public.tg_set_atualizado_em();

-- ---------------------------------------------------------------------
-- PAGAMENTOS — caixa (devolucao de garantia = valor negativo)
-- ---------------------------------------------------------------------
create table public.pagamentos (
  id             uuid primary key default gen_random_uuid(),
  paciente_id    uuid not null references public.pacientes(id),
  ciclo_id       uuid references public.ciclos(id),
  valor_centavos integer not null,
  forma          pagamento_forma_t not null,
  parcelas       smallint not null default 1,
  pago_em        date not null default current_date,
  descricao      text,
  criado_em      timestamptz not null default now()
);
create index idx_pag_data  on public.pagamentos (pago_em);
create index idx_pag_ciclo on public.pagamentos (ciclo_id);

-- ---------------------------------------------------------------------
-- MENSAGENS WHATSAPP — log de cada botao tocado (envio otimista)
-- ---------------------------------------------------------------------
create table public.mensagens_wa (
  id             uuid primary key default gen_random_uuid(),
  paciente_id    uuid not null references public.pacientes(id),
  agendamento_id uuid references public.agendamentos(id),
  sessao_id      uuid references public.sessoes(id),
  ciclo_id       uuid references public.ciclos(id),
  proposta_id    uuid references public.propostas(id),
  template       wa_template_t not null,
  corpo          text not null,
  enviada_em     timestamptz not null default now()
);
create index idx_wa_paciente    on public.mensagens_wa (paciente_id, template, enviada_em desc);
create index idx_wa_agendamento on public.mensagens_wa (agendamento_id, template);
create index idx_wa_ciclo       on public.mensagens_wa (ciclo_id, template);
create index idx_wa_proposta    on public.mensagens_wa (proposta_id, template);
create index idx_wa_sessao      on public.mensagens_wa (sessao_id, template);

-- =====================================================================
-- RLS — tudo trancado; apenas authenticated (Hilda e Fernando)
-- =====================================================================
alter table public.config       enable row level security;
alter table public.pacientes    enable row level security;
alter table public.ciclos       enable row level security;
alter table public.agendamentos enable row level security;
alter table public.sessoes      enable row level security;
alter table public.avaliacoes   enable row level security;
alter table public.red_flags    enable row level security;
alter table public.propostas    enable row level security;
alter table public.pagamentos   enable row level security;
alter table public.mensagens_wa enable row level security;

create policy pol_config       on public.config       for all to authenticated using (public.is_app_user()) with check (public.is_app_user());
create policy pol_pacientes    on public.pacientes    for all to authenticated using (public.is_app_user()) with check (public.is_app_user());
create policy pol_ciclos       on public.ciclos       for all to authenticated using (public.is_app_user()) with check (public.is_app_user());
create policy pol_agendamentos on public.agendamentos for all to authenticated using (public.is_app_user()) with check (public.is_app_user());
create policy pol_sessoes      on public.sessoes      for all to authenticated using (public.is_app_user()) with check (public.is_app_user());
create policy pol_avaliacoes   on public.avaliacoes   for all to authenticated using (public.is_app_user()) with check (public.is_app_user());
create policy pol_red_flags    on public.red_flags    for all to authenticated using (public.is_app_user()) with check (public.is_app_user());
create policy pol_propostas    on public.propostas    for all to authenticated using (public.is_app_user()) with check (public.is_app_user());
create policy pol_pagamentos   on public.pagamentos   for all to authenticated using (public.is_app_user()) with check (public.is_app_user());
create policy pol_mensagens_wa on public.mensagens_wa for all to authenticated using (public.is_app_user()) with check (public.is_app_user());

revoke all on all tables in schema public from anon;

-- =====================================================================
-- VIEW: MENSAGENS DE HOJE — derivada dos dados, nunca cadastrada
-- =====================================================================
create view public.v_mensagens_hoje with (security_invoker = on) as
with hoje as (
  select (now() at time zone 'America/Sao_Paulo')::date as d
)
-- 1. lembrete de vespera (vira check-in quando amanha e a 2ª sessao do ciclo)
select
  (case when a.ciclo_id is not null
         and (select count(*) from public.sessoes s
              where s.ciclo_id = a.ciclo_id and s.status = 'concluida') = 1
        then 'checkin_2a' else 'lembrete_vespera' end)::wa_template_t as template,
  a.paciente_id,
  a.id      as agendamento_id,
  null::uuid as sessao_id,
  a.ciclo_id,
  null::uuid as proposta_id,
  a.inicio  as referencia
from public.agendamentos a, hoje h
where a.status = 'agendada'
  and (a.inicio at time zone 'America/Sao_Paulo')::date = h.d + 1
  and not exists (select 1 from public.mensagens_wa m
                  where m.agendamento_id = a.id
                    and m.template in ('lembrete_vespera','checkin_2a'))
union all
-- 2. como passou a noite? — 24h apos TODA primeira sessao (inegociavel nº 6)
select 'pos_primeira_24h'::wa_template_t,
       s.paciente_id, null::uuid, s.id, s.ciclo_id, null::uuid, s.concluida_em
from public.sessoes s, hoje h
where s.tipo = 'primeira' and s.status = 'concluida'
  and (s.concluida_em at time zone 'America/Sao_Paulo')::date = h.d - 1
  and not exists (select 1 from public.mensagens_wa m
                  where m.sessao_id = s.id and m.template = 'pos_primeira_24h')
union all
-- 3. boa-noite do dia do fechamento (playbook §5.2)
select 'boa_noite_fechamento'::wa_template_t,
       c.paciente_id, null::uuid, null::uuid, c.id, null::uuid, c.fechado_em
from public.ciclos c, hoje h
where c.status = 'ativo'
  and c.programa in ('reset_10','alivio_5','continuidade')
  and (c.fechado_em at time zone 'America/Sao_Paulo')::date = h.d
  and not exists (select 1 from public.mensagens_wa m
                  where m.ciclo_id = c.id and m.template = 'boa_noite_fechamento')
union all
-- 4. retorno do combinado — 48h depois do "vai pensar"
select 'retorno_48h'::wa_template_t,
       p.paciente_id, null::uuid, null::uuid, null::uuid, p.id, p.criado_em
from public.propostas p, hoje h
where p.resultado = 'pendente'
  and p.data <= h.d - 2
  and not exists (select 1 from public.mensagens_wa m
                  where m.proposta_id = p.id and m.template = 'retorno_48h')
union all
-- 5. credito de R$450 vencendo (a <=2 dias do fim)
select 'credito_expira'::wa_template_t,
       p.paciente_id, null::uuid, null::uuid, null::uuid, p.id, p.credito_expira::timestamptz
from public.propostas p, hoje h
where p.resultado = 'pendente'
  and p.credito_expira is not null
  and p.credito_expira between h.d and h.d + 2
  and not exists (select 1 from public.mensagens_wa m
                  where m.proposta_id = p.id and m.template = 'credito_expira')
union all
-- 6. follow-up 30 dias pos-alta (script 2.3)
select 'followup_30d'::wa_template_t,
       c.paciente_id, null::uuid, null::uuid, c.id, null::uuid, c.concluido_em::timestamptz
from public.ciclos c, hoje h
where c.status = 'concluido' and c.proxima_fase = 'alta'
  and c.concluido_em is not null
  and c.concluido_em <= h.d - 30
  and not exists (select 1 from public.mensagens_wa m
                  where m.ciclo_id = c.id and m.template = 'followup_30d')
union all
-- 7. recuperacao de falta (hoje ou ontem)
select 'falta_reagendar'::wa_template_t,
       a.paciente_id, a.id, null::uuid, a.ciclo_id, null::uuid, a.inicio
from public.agendamentos a, hoje h
where a.status = 'faltou'
  and (a.inicio at time zone 'America/Sao_Paulo')::date between h.d - 1 and h.d
  and not exists (select 1 from public.mensagens_wa m
                  where m.agendamento_id = a.id and m.template = 'falta_reagendar');

-- =====================================================================
-- VIEWS DE METRICAS (area NUMEROS do Fernando)
-- =====================================================================

-- Evolucao de EVA por sessao (grafico da ficha + media geral)
create view public.v_evolucao_eva with (security_invoker = on) as
select s.paciente_id,
       p.nome,
       s.ciclo_id,
       s.numero_no_ciclo,
       (s.concluida_em at time zone 'America/Sao_Paulo')::date as data,
       s.eva_pre,
       s.eva_pos,
       s.eva_pre - s.eva_pos as queda_imediata,
       s.destravamento
from public.sessoes s
join public.pacientes p on p.id = s.paciente_id
where s.status = 'concluida';

-- O numero de marketing: "queda media de X pontos em Y pacientes"
create view public.v_eva_marketing with (security_invoker = on) as
select count(*)                                      as reavaliacoes,
       round(avg(queda_pontos), 1)                   as queda_media_pontos,
       round(avg(queda_pct), 0)                      as queda_media_pct,
       count(*) filter (where criterio_atingido)     as criterio_atingido,
       count(*) filter (where not criterio_atingido) as criterio_nao_atingido
from public.avaliacoes
where tipo = 'checkpoint';

-- Destravamento funciona? (protocolo §5 — o dado que vira argumento de venda)
create view public.v_efeito_destravamento with (security_invoker = on) as
select destravamento,
       count(*)                         as sessoes,
       round(avg(eva_pre - eva_pos), 2) as queda_media_na_sessao
from public.sessoes
where status = 'concluida' and eva_pre is not null and eva_pos is not null
group by destravamento;

-- Funil mensal: leads -> primeiras -> propostas -> fechamentos (playbook §6)
create view public.v_funil_mensal with (security_invoker = on) as
with leads as (
  select date_trunc('month', criado_em at time zone 'America/Sao_Paulo')::date as mes,
         count(*) as leads
  from public.pacientes
  group by 1
), primeiras as (
  select date_trunc('month', concluida_em at time zone 'America/Sao_Paulo')::date as mes,
         count(*) as primeiras_sessoes
  from public.sessoes
  where tipo = 'primeira' and status = 'concluida'
  group by 1
), prop as (
  select date_trunc('month', data)::date as mes,
         count(*) as propostas,
         count(*) filter (where resultado = 'fechou_na_sala') as fechou_na_sala,
         count(*) filter (where resultado in ('fechou_na_sala','fechou_7_dias')) as fechou_total
  from public.propostas
  group by 1
)
select coalesce(l.mes, pr.mes, p.mes)   as mes,
       coalesce(l.leads, 0)             as leads,
       coalesce(pr.primeiras_sessoes,0) as primeiras_sessoes,
       coalesce(p.propostas, 0)         as propostas,
       coalesce(p.fechou_na_sala, 0)    as fechou_na_sala,
       coalesce(p.fechou_total, 0)      as fechou_total,
       round(100.0 * coalesce(p.fechou_na_sala,0) / nullif(coalesce(p.propostas,0),0), 1) as taxa_sala_pct,
       round(100.0 * coalesce(p.fechou_total,0)   / nullif(coalesce(p.propostas,0),0), 1) as taxa_total_pct
from leads l
full join primeiras pr on pr.mes = l.mes
full join prop p on p.mes = coalesce(l.mes, pr.mes)
order by 1 desc;

-- Objecoes das propostas nao fechadas (diagnostico do playbook §6)
create view public.v_objecoes_mensal with (security_invoker = on) as
select date_trunc('month', data)::date as mes,
       objecao,
       count(*) as vezes
from public.propostas
where resultado in ('nao_fechou','expirada','pendente')
  and objecao <> 'nenhuma'
group by 1, 2
order by 1 desc, 3 desc;

-- Receita (caixa real, devolucoes negativas) + ticket medio de programa
create view public.v_receita_mensal with (security_invoker = on) as
with caixa as (
  select date_trunc('month', pago_em)::date as mes,
         sum(valor_centavos) / 100.0        as receita_reais,
         count(*)                           as lancamentos
  from public.pagamentos
  group by 1
), prog as (
  select date_trunc('month', fechado_em at time zone 'America/Sao_Paulo')::date as mes,
         count(*) as programas_fechados,
         round(avg(preco_centavos) / 100.0, 2) as ticket_medio_programa
  from public.ciclos
  where programa in ('reset_10','alivio_5')
  group by 1
)
select coalesce(c.mes, p.mes)          as mes,
       coalesce(c.receita_reais, 0)    as receita_reais,
       coalesce(c.lancamentos, 0)      as lancamentos,
       coalesce(p.programas_fechados,0) as programas_fechados,
       p.ticket_medio_programa
from caixa c
full join prog p on p.mes = c.mes
order by 1 desc;

-- Ocupacao semanal (Fernando compara com a capacidade da config)
create view public.v_ocupacao_semanal with (security_invoker = on) as
select date_trunc('week', inicio at time zone 'America/Sao_Paulo')::date as semana,
       count(*) filter (where status = 'realizada') as realizadas,
       count(*) filter (where status = 'faltou')    as faltas,
       count(*) filter (where status = 'agendada')  as agendadas
from public.agendamentos
group by 1
order by 1 desc;
