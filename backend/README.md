# Backend - Plataforma de Gestao Documental

API REST desenvolvida com FastAPI para o desafio tecnico de Gestao Documental.

## Stack

- Python 3.12
- FastAPI + Uvicorn
- SQLAlchemy 2
- Alembic (migrations)
- PostgreSQL 16
- JWT Bearer (login)
- Docker + Docker Compose
- Pytest (testes automatizados)

## Regras de negocio implementadas

- Taxonomia obrigatoria no documento: setor, tipo documental e data de vencimento.
- Ciclo de vida da versao: `DRAFT -> IN_REVIEW -> ACTIVE -> OBSOLETE`.
- Somente uma versao `ACTIVE` por documento (indice unico parcial).
- Ao aprovar nova versao `ACTIVE`, a `ACTIVE` anterior vira `OBSOLETE` automaticamente.
- Visibilidade por abrangencia:
  - `CORPORATE`: visivel para todos.
  - `LOCAL`: visivel apenas para usuarios do setor.
- Perfis:
  - `AUTOR`: cria rascunho e submete.
  - `COORDENADOR`: aprova/rejeita no proprio setor.
  - `LEITOR`: consulta documentos vigentes.
- Trilha de auditoria imutavel em `audit_logs`.
- Busca retorna somente versoes `ACTIVE`.

## Estrutura

```text
backend/
  app/
    core/
    dependencies/
    models/
    routers/
    schemas/
    main.py
    database.py
  alembic/
    versions/
  tests/
  Dockerfile
  alembic.ini
  requirements.txt
  .env.example
  pytest.ini
```

## Variaveis de ambiente

Use o `.env.example` como base para criar `backend/.env`.

Variaveis principais:

- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `JWT_ALGORITHM`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- Seeds de usuarios (admin/autor/leitor): `ADMIN_*`, `AUTHOR_*`, `READER_*`

## Como executar (Docker)

Na raiz do projeto:

```bash
docker compose up -d --build
```

API: `http://localhost:8000`

Swagger: `http://localhost:8000/docs`

### Script facilitador (Windows)

```bat
scripts\dev.bat
```

Opcoes disponiveis:

- `up`, `down`, `logs`, `restart`, `reset`, `status`, `pytest`

Exemplo direto:

```bat
scripts\dev.bat pytest
```

## Migrations

A imagem do backend ja executa migration automaticamente ao subir:

```bash
alembic -c alembic.ini upgrade head
```

Manual (local):

```bash
cd backend
alembic -c alembic.ini upgrade head
```

## Testes

Na raiz do projeto:

```bash
python -m pytest backend/tests -q
```

Status atual esperado:

- Suite cobrindo auth, documents (fluxo principal), management e audit.

## Autenticacao

- Login: `POST /auth/login` (`username`=email, `password`)
- Perfil autenticado: `GET /auth/me`
- Enviar token no header:

```http
Authorization: Bearer <token>
```

## Endpoints principais

### Auth

- `POST /auth/login`
- `GET /auth/me`

### Documents

- `POST /documents/drafts`
- `POST /documents/{version_id}/submit`
- `POST /documents/{version_id}/approve`
- `POST /documents/{version_id}/reject`
- `GET /documents/search`
- `GET /documents/{document_id}/versions`

### Management

- `GET /sectors`
- `POST /sectors`
- `GET /document-types`
- `POST /document-types`
- `GET /users`
- `POST /users`

### Audit

- `GET /audit/logs`

## Healthcheck

- `GET /`
- `GET /health/db`

## Seed inicial

As migrations incluem seed de usuarios padrao (controlado por `.env`):

- Coordenador admin
- Autor padrao
- Leitor padrao

## Link de producao

Preencher antes da entrega final:

- API (producao): `COLOCAR_LINK_DA_API`

## Observacoes

- Nao commitar `backend/.env`.
- Manter apenas `backend/.env.example` no repositorio.
- Para reset total do banco em Docker: `scripts\dev.bat` -> opcao `reset`.
