# Sistema de Gestão Documental (Desafio Técnico)

## Visão geral
Aplicação web para controlar documentos internos com versionamento, fluxo de aprovação e visibilidade por setor, mantendo histórico e auditoria.

## Projeto
- Backend em FastAPI com regras de negócio e API REST.
- Frontend em React com login, dashboard e gestão de documentos.
- Banco PostgreSQL.
- Ambiente completo em Docker.

## Stack
- Backend: Python, FastAPI, SQLAlchemy, Alembic
- Frontend: React + Vite
- Banco: PostgreSQL
- Infra: Docker e Docker Compose

## Ferramentas Utilizadas
- HeidiSQL
- Visual Studio Code
- Codex - GPT 5.3 Codex

## Funcionalidades principais
- Login com perfis e permissões (admin, coordenador, autor, leitor).
- Cadastro de documentos com campos obrigatórios (setor, tipo e validade).
- Ciclo do documento: rascunho -> em revisão -> aprovado (vigente) ou reprovado.
- Apenas 1 versão vigente por documento; ao aprovar uma nova, a anterior vira obsoleta.
- Abrangência:
  - `CORPORATE`: visível para todos
  - `LOCAL`: visível apenas para usuários do mesmo setor
- Dashboard com indicadores (status, vencimentos) e acesso à auditoria (conforme perfil).

## Páginas criadas (frontend)
- Login: acesso com email e senha.
- Dashboard: indicadores e visão geral.
- Documentos (lista): busca, filtros e acesso aos documentos.
- Novo documento: criação de rascunho e dados iniciais.
- Detalhe do documento: versões, status e ações do fluxo.
- Auditoria: trilha de eventos (quando permitido).
- Usuários: gestão de usuários.
- Setores: gestão de setores.
- Workflow de documentos: alias da página de lista para reutilizar layout.

## Regras de negócio (resumo)
- Status da versão: `DRAFT -> IN_REVIEW -> ACTIVE -> OBSOLETE`.
- Somente uma versão `ACTIVE` por documento.
- Ao aprovar nova versão `ACTIVE`, a anterior vira `OBSOLETE`.
- Visibilidade por abrangência (corporate/local).
- Trilha de auditoria imutável.

## Estrutura do projeto

```
ProjetoDev/
  backend/
  frontend/
  docker-compose.yml
  README.md
```

## Como rodar (rápido)
- Na raiz do projeto, execute `docker compose up -d --build`.
- Acesse:
  - Frontend: http://localhost:5173
  - Backend: http://localhost:8000 (documentação em `/docs`)

## Usuários de teste (seed demo)
- admin@local.com / Admin@123
- coord.adm@local.com / Coord@123
- coord.qualidade@local.com / Coord@123
- coord.farmacia@local.com / Coord@123
- coord.enfermagem@local.com / Coord@123
- autor.adm@local.com / Autor@123
- autor.qualidade@local.com / Autor@123
- autor.farmacia@local.com / Autor@123
- autor.enfermagem@local.com / Autor@123
- leitor.adm@local.com / Leitor@123
- leitor.qualidade@local.com / Leitor@123
- leitor.farmacia@local.com / Leitor@123

## Variáveis de ambiente
- O arquivo `backend/.env` concentra as configurações locais.
- Use `backend/.env.example` como base.

## Scripts de apoio (Windows)
- Na raiz do projeto, existe `scripts\\dev.bat` com comandos:
  - `up`
  - `down`
  - `logs`
  - `restart`
  - `reset`
  - `status`
  - `pytest`

## Endpoints principais (resumo)
- Auth:
  - `POST /auth/login`
  - `GET /auth/me`
- Documentos:
  - `POST /documents/drafts`
  - `POST /documents/{version_id}/submit`
  - `POST /documents/{version_id}/approve`
  - `POST /documents/{version_id}/reject`
  - `GET /documents/search`
  - `GET /documents/{document_id}/versions`
- Gestão:
  - `GET/POST /sectors`
  - `GET/POST /document-types`
  - `GET/POST /users`
- Auditoria:
  - `GET /audit/logs`

## Observações
- O backend e o frontend sobem juntos via `docker-compose.yml`.
- A API aplica migrations automaticamente ao iniciar o container do backend.