-- Remove os pacientes de exemplo do seed inicial (e tudo que depende deles).
-- Rodar no SQL Editor do Supabase quando o consultório começar com pacientes reais.
with exemplo as (
  select id from public.pacientes where observacoes = 'exemplo — pode apagar'
)
, del_wa as (delete from public.mensagens_wa where paciente_id in (select id from exemplo))
, del_pag as (delete from public.pagamentos where paciente_id in (select id from exemplo))
, del_prop as (delete from public.propostas where paciente_id in (select id from exemplo))
, del_rf as (delete from public.red_flags where paciente_id in (select id from exemplo))
, del_av as (delete from public.avaliacoes where paciente_id in (select id from exemplo))
, del_se as (delete from public.sessoes where paciente_id in (select id from exemplo))
, del_ag as (delete from public.agendamentos where paciente_id in (select id from exemplo))
, del_ci as (delete from public.ciclos where paciente_id in (select id from exemplo))
delete from public.pacientes where id in (select id from exemplo);
