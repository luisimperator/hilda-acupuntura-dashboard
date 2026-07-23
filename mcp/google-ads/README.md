# MCP Google Ads — consultório da Hilda

Servidor [MCP](https://modelcontextprotocol.io) que deixa o Claude ler e (com trava) operar a conta de Google Ads do consultório.

- **Leitura:** resumo da conta, campanhas, termos de busca, palavras-chave, consulta GAQL livre.
- **Escrita (com 3 travas):** pausar, retomar, ajustar orçamento e criar campanha de pesquisa.

## As 3 travas de segurança da escrita

1. **Chave-mestra** — escrita só funciona com `GOOGLE_ADS_PERMITIR_ESCRITA=true`. Sem isso, é só-leitura.
2. **Teto de orçamento** — nada pode passar de `GOOGLE_ADS_ORCAMENTO_DIARIO_MAX` por dia (padrão R$ 100). Criar/ajustar/retomar acima disso é recusado.
3. **Nasce pausada** — toda campanha nova é criada **PAUSADA**. Nada gasta até você revisar e ativar na mão, na conta do Google Ads.

## O que você precisa (a parte que demora)

O código é a parte fácil. O que trava é o acesso à API do Google:

1. **Projeto no Google Cloud** → ativar a *Google Ads API* → tela de consentimento OAuth → criar credencial **OAuth cliente (App para computador)**. Guarde o `client_id` e o `client_secret`.
2. **Developer token** → no Google Ads, entre na conta **administradora (MCC)** → Ferramentas → **Central de API** → solicite o token. Começa com acesso de teste; o acesso básico (para a conta real) passa por **aprovação manual do Google** (de horas a alguns dias).
3. **Refresh token** → o jeito mais fácil sem código: [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) → engrenagem ⚙️ → marque *Use your own OAuth credentials* e cole seu client id/secret → no campo de escopo digite `https://www.googleapis.com/auth/adwords` → *Authorize* com a conta do Google Ads → *Exchange authorization code for tokens* → copie o **Refresh token**.
4. **Customer ID** → os 10 dígitos da conta de anúncios, **sem traços**. Se você acessa por uma conta administradora (MCC), pegue também o ID dela para o `GOOGLE_ADS_LOGIN_CUSTOMER_ID`.

## Instalar e rodar

```bash
cd mcp/google-ads
npm install
cp .env.example .env      # preencha com as credenciais acima
npm run build             # gera dist/
```

Teste rápido (só-leitura): `npm run dev` — deve imprimir "MCP Google Ads (somente leitura) pronto." no stderr.

## Ligar no Claude

**Claude Desktop** — em `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "google-ads": {
      "command": "node",
      "args": ["/caminho/absoluto/mcp/google-ads/dist/index.js"],
      "env": {
        "GOOGLE_ADS_CLIENT_ID": "...",
        "GOOGLE_ADS_CLIENT_SECRET": "...",
        "GOOGLE_ADS_DEVELOPER_TOKEN": "...",
        "GOOGLE_ADS_REFRESH_TOKEN": "...",
        "GOOGLE_ADS_CUSTOMER_ID": "1234567890",
        "GOOGLE_ADS_LOGIN_CUSTOMER_ID": "",
        "GOOGLE_ADS_MOEDA": "BRL",
        "GOOGLE_ADS_PERMITIR_ESCRITA": "false",
        "GOOGLE_ADS_ORCAMENTO_DIARIO_MAX": "50"
      }
    }
  }
}
```

**Claude Code** — mesma ideia num `.mcp.json` na raiz do projeto (ou `claude mcp add`), com o mesmo bloco de `env`.

> Comece com `GOOGLE_ADS_PERMITIR_ESCRITA` em `"false"` e valide os relatórios. Só ligue a escrita (`"true"`) quando quiser deixar o Claude criar/pausar/ajustar — sempre respeitando o teto e nascendo pausada.

## Ferramentas

| Ferramenta | Tipo | O que faz |
|---|---|---|
| `resumo_conta` | leitura | Investimento, cliques, conversões e custo por conversão no período |
| `campanhas` | leitura | Campanhas com status e desempenho |
| `termos_de_busca` | leitura | O que as pessoas digitaram (achar desperdício → negativas) |
| `palavras_chave` | leitura | Desempenho por palavra-chave |
| `consulta` | leitura | GAQL cru (só SELECT) |
| `pausar_campanha` | escrita | Pausa (reversível) |
| `retomar_campanha` | escrita | Reativa (recusa se orçamento > teto) |
| `ajustar_orcamento` | escrita | Muda o diário (recusa acima do teto) |
| `criar_campanha_busca` | escrita | Cria campanha de pesquisa **pausada**, com orçamento, palavras-chave e anúncio responsivo |

## Aviso

Este MCP mexe em conta que gasta dinheiro real. As travas reduzem o risco, mas revise toda ação de escrita. A conta continua sendo sua responsabilidade.
