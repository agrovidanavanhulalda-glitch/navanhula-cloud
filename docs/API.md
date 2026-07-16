# API Documentation

Endpoint público: `/functions/v1/public-api`

## Autenticação
- Header `x-api-key: <chave>` (SHA-256 armazenada em `api_keys`)
- Scopes por chave (leitura, escrita)

## Recursos
- `GET /products` — lista produtos da empresa
- `GET /sales?from&to` — lista vendas do período
- `POST /webhooks/subscribe` — registar webhook

Rate limit: 60 req/min por chave. Erros seguem RFC 7807 (problem+json).
