# Changelog

## [0.1.0] — 2026-08-17

MVP inicial do Arqprod, um PIM (Product Information Management) multi-tenant.

### Backend (NestJS + PostgreSQL/JSONB + Redis)

- **Autenticação**: login JWT com senha com hash Argon2; senha padrão redefinida no primeiro login
- **API aberta**: API keys `akp_...` com hash SHA-256 + HMAC, permitindo integrar produtos/skus sem interface
- **Atributos dinâmicos**: schema flexível (`texto`, `numero`, `booleano`, `lista`, `lista_multipla`, `data`), níveis `produto`/`variacao`, herança de atributos de categoria para subcategorias e regras de validação (obrigatório, tamanho, intervalo, opções)
- **Produtos**: SKU base + SKUs por variação, valores de atributos em JSONB com cache materializado (`atributos`), imagens, tags, status
- **Categoria**: hierarquia com herança, vínculo de atributos com obrigatoriedade e ordem
- **Variações, estoque e preços**: por armazém (`disponivel`/`reservado`) e por canal
- **Webhooks**: entrega com HMAC-SHA256 e retry com fila BullMQ
- **Integração** (`POST /integrations/products`): criação upsert de produto/variacões em lote via API key

### Painel (React + Vite + Tailwind)

- Login
- Listagem de produtos com paginação (10/25/50), status e resumo de estoque
- Página individual do produto: galeria, descrição, campos customizados editáveis por tipo, tabela de variações com estoque/preços por canal, troca de status

### Infraestrutura

- `docker-compose.yml` (Postgres + Redis + app) e `docker-compose.prod.yml` com nginx + TLS via certbot
- Migração única com 25 tabelas + seed inicial com org demo, admin (`admin@exemplo.com`) e dados de exemplo
- CI: build do backend e frontend via GitHub Actions

### API de exemplo

- `GET /api/products` — listar produtos com agregados (estoque, canais, markets, space)
- `GET /api/products/:id` — produto completo: atributos, variações, imagens, tags
- `POST /api/products/:id/attribute-values` — salvar valores de campos dinâmicos
- `GET /api/categories/:id/attributes` — schema do formulário da categoria
- `POST /api/integrations/products` — upsert em lote via API key
- Swagger em `/api/docs`