# Arqprod

Plataforma de **gestão de produtos (PIM — Product Information Management)** multi-tenant, com **API aberta e documentada** como funcionalidade central.

O diferencial: qualquer usuário cria **campos customizados por categoria sem migração de banco** (valores em JSONB, validação na camada de aplicação), e qualquer sistema externo (e-commerce, ERP, marketplace) se conecta via **API REST com API keys**, **webhooks** (com HMAC) e fila assíncrona.

## Stack

| Camada     | Tecnologia                                             |
|------------|--------------------------------------------------------|
| Backend    | Node.js + NestJS + TypeScript                          |
| Banco      | PostgreSQL 16 (UUID, JSONB, RLS-ready)                 |
| Fila       | Redis + BullMQ (entrega de webhooks)                   |
| Auth       | API Key (`akp_…`, hash HMAC-SHA256) + JWT (painel)     |
| Docs       | Swagger/OpenAPI gerado do código em `/api/docs`        |
| Frontend   | React + TypeScript + Tailwind (build estático)         |
| Deploy     | Docker Compose (postgres, redis, api, web, nginx)      |

## Estrutura

```
arqprod/
├── backend/            # API NestJS
│   └── src/
│       ├── auth/           # login JWT
│       ├── api-keys/       # gestão de chaves (somente painel, admin)
│       ├── attributes/     # campos customizados + validação
│       ├── categories/     # hierarquia + vínculo de atributos
│       ├── products/       # produtos, variações, valores de atributos
│       ├── commerce/       # canais, preços, armazéns, estoque, fornecedores
│       ├── webhooks/       # registro + worker BullMQ com HMAC
│       ├── integrations/   # registro + importação simples
│       └── database/       # migrações + seed
├── frontend/           # painel React (login, listagem de produtos, detalhe)
├── nginx/              # reverse proxy (TLS)
└── docker-compose.yml  # stack completa
```

## Modelo de dados (resumo)

- **Atributos nunca são deletados** — apenas `status = arquivado` (não quebra produtos/integrações).
- `Product.atributos` (JSONB) é **cache de leitura** denormalizado, reconstruído a cada escrita.
- `ProductAttributeValue` / `ProductVariantAttributeValue` são a fonte da verdade.
- Nível do atributo (`produto` vs `variacao`) define **onde** o valor é gravado; tentar gravar no lugar errado é rejeitado (400).
- Atributos de categoria são herdados dos pais quando `herda_de_categoria_pai = true`.
- `disponivel = quantidade - reservado` (calculado, nunca armazenado).
- Toda tabela de tenant tem `organization_id` e **todas as queries são filtradas por ele** (isolamento multi-tenant no guard de autenticação).

## Rodando localmente (sem Docker)

Requisitos: Node 20+, PostgreSQL local, Redis local.

```bash
# 1. Banco
createdb arqprod

# 2. Backend
cd backend
cp ../.env.example ../.env   # ajuste DATABASE_URL/REDIS_URL para o seu local
npm install
npm run migration:run        # cria todas as tabelas
npm run seed                 # organização exemplo + admin + produto de exemplo
npm run start:dev            # API em http://localhost:3000 (Swagger: /api/docs)

# 3. Frontend (outro terminal)
cd ../frontend
npm install
npm run dev                  # painel em http://localhost:5173
```

Login do seed: `admin@exemplo.com` / `admin123456`.

## Quickstart da API

```bash
BASE=http://localhost:3000/api

# 1. Login (painel) e criação de API key (somente admin)
TOKEN=$(curl -s $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@exemplo.com","senha":"admin123456"}' | jq -r .access_token)

curl -s -X POST $BASE/api-keys -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"nome":"ERP","escopos":["products:read","products:write","catalog:write"]}'
# -> { "chave": "akp_..." }  (mostrada uma única vez)

AK="akp_..."

# 2. Campo customizado SEM migração (validação na aplicação)
curl -s -X POST $BASE/attributes -H "Authorization: Bearer $AK" -H 'Content-Type: application/json' \
  -d '{"nome":"Voltagem","chave":"voltagem","tipo_dado":"lista","nivel":"produto",
       "opcoes":[{"valor":"110V"},{"valor":"220V"}]}'

# 3. Produto + valores de atributos
curl -s -X POST $BASE/products -H "Authorization: Bearer $AK" -H 'Content-Type: application/json' \
  -d '{"nome":"Fone Bluetooth Pro","sku_base":"TEC-001","category_id":"<id>"}'

curl -s -X POST $BASE/products/<id>/attribute-values -H "Authorization: Bearer $AK" \
  -H 'Content-Type: application/json' \
  -d '{"valores":[{"atributo":"voltagem","valor":"220V"}]}'

# 4. Consultar o formulário dinâmico de uma categoria (inclui herdados)
curl -s $BASE/categories/<id>/attributes -H "Authorization: Bearer $AK"

# 5. Webhook
curl -s -X POST $BASE/webhooks -H "Authorization: Bearer $AK" -H 'Content-Type: application/json' \
  -d '{"url_destino":"https://seu-sistema.com/hook","eventos":["product.updated"],"segredo":"s3creto"}'
```

Toda a documentação interativa (com exemplos executáveis) está em `/api/docs`.

## Webhooks

- Eventos: `product.created`, `product.updated`, `variant.created`, `variant.updated`, `price.updated`, `stock.updated` (ou `*`).
- Entrega assíncrona via BullMQ com retry exponencial (5 tentativas) e registro em `webhook_deliveries`.
- Assinatura: header `X-Arqprod-Signature: sha256=<HMAC-SHA256 do body com o segredo>`.
- Verifique o histórico em `GET /webhooks/:id/deliveries`.

## Deploy na VPS (do zero)

Requisitos mínimos: 2 vCPUs, 4 GB RAM, 40 GB SSD, Docker + Compose, portas 80/443 liberadas.

```bash
# 1. Clonar
git clone <seu-repo> arqprod && cd arqprod

# 2. Configurar
cp .env.example .env
#   Gere segredos:
#   openssl rand -hex 32   -> JWT_SECRET
#   openssl rand -hex 32   -> API_KEY_HASH_SALT
#   Defina uma senha forte para POSTGRES_PASSWORD e o domínio em PUBLIC_APP_URL

# 3. Subir a stack
docker compose up -d --build
docker compose ps            # aguarde postgres/redis healthy

# 4. Migrações e seed
docker compose exec api npm run migration:run
docker compose exec api npm run seed        # opcional

# 5. TLS (Let's Encrypt) — um dos dois caminhos:

#   (a) Com o serviço nginx do compose + certbot:
#       1. Aponte o DNS do domínio para o IP da VPS.
#       2. Edite nginx/nginx.conf e preencha seu domínio no bloco 443 (descomente).
#       3. Suba o certbot:
#          docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
#          docker compose exec certbot certbot certonly --webroot \
#            -w /var/www/certbot -d seu-dominio.com --email voce@email.com \
#            --agree-tos --no-eff-email
#       4. A renovação automática roda no próprio container certbot.
#
#   (b) Nginx do host (recomendado se já tiver): aponte o site para
#       localhost:80 do compose e emita o certificado com certbot no host.

# 6. Backup automático do Postgres (cron diário, fora da VPS)
#    Exemplo: /etc/cron.d/arqprod
#    15 3 * * * root docker compose -f /opt/arqprod/docker-compose.yml exec -T postgres \
#      pg_dump -U arqprod arqprod | gzip > /backups/arqprod-$(date +\%F).sql.gz
```

### Observações de produção

- `docker-compose.prod.yml` adiciona apenas o serviço `certbot` (renovação automática).
- O `nginx` do compose **termina o TLS**; o serviço `web` expõe somente o build estático em HTTP interno.
- Nunca commitе `.env`. Segredos são lidos via `env_file` pelo container `api`.
- Para escalar o worker de webhooks separadamente, extraia `WebhookWorker` para um container próprio.

## Limites atuais (fora do escopo do MVP)

- Conectores prontos (Shopify/Mercado Livre/WooCommerce) — fase 2
- GraphQL, marketplace de plugins, analytics de catálogo
- Coluna "Markets" da listagem = **canais com estoque disponível** (opção 1 do spec, sem tabela `Market`)

## Licença

UNLICENSED — uso interno.