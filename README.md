# Sistema de Gestao Documental (Desafio Tecnico)

## Visao geral
Aplicacao web para controlar documentos internos com versionamento, fluxo de aprovacao e visibilidade por setor, mantendo historico e auditoria.

## O desafio pedia
- Controle de versoes e status do documento.
- Processo de revisao e aprovacao por perfis.
- Regras de visibilidade por setor.
- Registro de auditoria das acoes.

## O que foi entregue
- Backend em FastAPI com regras de negocio e API REST.
- Frontend em React com login, dashboard e gestao de documentos.
- Banco PostgreSQL.
- Ambiente completo em Docker.

## Funcionalidades principais
- Login com perfis e permissoes (admin, coordenador, autor, leitor).
- Cadastro de documentos com campos obrigatorios (setor, tipo e validade).
- Ciclo do documento: rascunho -> em revisao -> aprovado (vigente) ou reprovado.
- Apenas 1 versao vigente por documento; ao aprovar uma nova, a anterior vira obsoleta.
- Abrangencia:
  - `CORPORATE`: visivel para todos
  - `LOCAL`: visivel apenas para usuarios do mesmo setor
- Dashboard com indicadores (status, vencimentos) e acesso a auditoria (conforme perfil).

## Paginas criadas (frontend)
- Login: acesso com email e senha.
- Dashboard: indicadores e visao geral.
- Documentos (lista): busca, filtros e acesso aos documentos.
- Novo documento: criacao de rascunho e dados iniciais.
- Detalhe do documento: versoes, status e acoes do fluxo.
- Auditoria: trilha de eventos (quando permitido).
- Usuarios: gestao de usuarios.
- Setores: gestao de setores.
- Workflow de documentos: alias da pagina de lista para reutilizar layout.

## Regras de negocio (resumo)
- Status da versao: `DRAFT -> IN_REVIEW -> ACTIVE -> OBSOLETE`.
- Somente uma versao `ACTIVE` por documento.
- Ao aprovar nova versao `ACTIVE`, a anterior vira `OBSOLETE`.
- Visibilidade por abrangencia (corporate/local).
- Trilha de auditoria imutavel.

## Stack
- Backend: Python, FastAPI, SQLAlchemy, Alembic
- Frontend: React + Vite
- Banco: PostgreSQL
- Infra: Docker e Docker Compose

## Estrutura do projeto
```
ProjetoDev/
  backend/
  frontend/
  docker-compose.yml
  README.md
```

## Como rodar (rapido)
1. Na raiz do projeto, execute `docker compose up -d --build`.
2. Acesse:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:8000 (documentacao em `/docs`)

## Usuarios de teste (seed demo)
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

## Variaveis de ambiente
- O arquivo `backend/.env` concentra as configuracoes locais.
- Use `backend/.env.example` como base.

## Scripts de apoio (Windows)
Na raiz do projeto, existe `scripts\\dev.bat` com comandos:
- `up`, `down`, `logs`, `restart`, `reset`, `status`, `pytest`

## Endpoints principais (resumo)
- Auth: `POST /auth/login`, `GET /auth/me`
- Documentos: `POST /documents/drafts`, `POST /documents/{version_id}/submit`, `POST /documents/{version_id}/approve`,
  `POST /documents/{version_id}/reject`, `GET /documents/search`, `GET /documents/{document_id}/versions`
- Gestao: `GET/POST /sectors`, `GET/POST /document-types`, `GET/POST /users`
- Auditoria: `GET /audit/logs`

## Observacoes
- O backend e o frontend sobem juntos via `docker-compose.yml`.
- A API aplica migrations automaticamente ao iniciar o container do backend.
