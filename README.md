# Painel · Hilda de Oliveira — Acupuntura

Dashboard interno de atendimento do consultório (Moema, SP). Feito para uma usuária
muito simples de computador: tipografia grande, botões enormes, um passo por vez.

**Produção:** painel.acupunturahilda.com.br

## Stack

- **Front:** Vite + React + TypeScript (SPA), design system próprio (marca da landing:
  cream/jade/cinnabar, fontes Gloock / Instrument Sans / Spline Sans Mono)
- **Backend:** Supabase (projeto `hilda-acupuntura-dashboard`, `uwbofeleagsdtdsnrdhj`, sa-east-1)
  - Postgres com RLS + allowlist de usuários (`app_usuarios_permitidos`)
  - Auth por e-mail/senha (contas criadas manualmente; sem cadastro aberto)
  - Edge Function `recepcionista` — recepcionista virtual com Claude API
- **Deploy:** Vercel

## Rodar localmente

```bash
cp .env.example .env   # preencher com a chave publicável do Supabase
npm install
npm run dev
```

## Recepcionista virtual (IA)

- Tabelas: `ia_config` (persona/modelo), `ia_conhecimento` (base treinável pelo painel),
  `ia_conversas` + `ia_mensagens` (histórico).
- Edge Function `recepcionista`:
  - Painel: `POST` com JWT do usuário → chat de teste.
  - WhatsApp: `POST ?key=<RECEPCIONISTA_WEBHOOK_KEY>` com `{ telefone, nome, mensagem }`
    → responde `{ resposta }` (pronto para automação HTTP do Unnichat).
- Segredos necessários (Dashboard Supabase → Edge Functions → Secrets):
  - `ANTHROPIC_API_KEY` — obrigatório para a IA responder
  - `RECEPCIONISTA_WEBHOOK_KEY` — opcional, habilita o webhook de WhatsApp
- Regras de segurança fixas no código (não editáveis pelo painel): nunca passar preço de
  programas por mensagem, nunca diagnosticar, sinais de alerta → encaminhar para humano.

## Documentos de origem

O plano de negócio completo (protocolo de atendimento, playbook de venda, estudo
econômico) vive fora deste repositório, no pacote `projeto-consultorio-hilda`.
