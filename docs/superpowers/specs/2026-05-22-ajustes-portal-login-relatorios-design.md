# Alves Estética — Ajustes: cadastro de profissional, login com duas abas, limpeza do portal e filtros de relatório

**Data:** 2026-05-22
**Branch:** `pedro/musing-montalcini-5f3dd3`

## Contexto

O sistema já está funcional, mas três frentes precisam de ajuste antes de ir pro PR final:

1. **Bug:** cadastrar um novo profissional pelo portal não persiste e, em consequência, o login do profissional não funciona.
2. **UX de login:** a tela única atual não comunica que existem dois tipos de acesso (admin vs profissional).
3. **Portal admin com elementos confusos** (atalho de agendar como cliente, botões de troca de modo, FAB de novo agendamento) que vamos remover.
4. **Relatórios financeiros** não têm filtro por período — qualquer análise mensal exige conta na mão.

## Bloco 1 — Fix do cadastro de profissional

### Causa raiz

Dois bugs combinados em [server.ts](../../../server.ts) + [supabase.ts](../../../supabase.ts):

1. **RLS bloqueia escrita em `specialists`.** A migração `001_init.sql` só concede `SELECT` público; `INSERT`/`UPDATE` ficam restritos. O servidor usa `SUPABASE_ANON_KEY`, então toda chamada `upsert` em `specialists` cai silenciosamente, o fallback em memória "salva", o servidor responde 200, mas no próximo `GET /api/specialists` (que vai no Supabase) o profissional não está lá.
2. **Campo `newPassword` vaza no upsert.** Em `POST /api/specialists`, `spec: Specialist = req.body` carrega `newPassword`, que é passado direto pro `upsert` do Supabase — a coluna não existe, então o request falha mesmo se a RLS permitisse.

### Mudanças

- Em `supabase.ts`: ler `SUPABASE_SERVICE_ROLE_KEY` primeiro; cair pra `SUPABASE_ANON_KEY` apenas em dev. `isSupabaseConfigured` true se qualquer uma estiver presente. Logar qual modo está em uso no boot.
- Em `.env.example`: adicionar `SUPABASE_SERVICE_ROLE_KEY=` com comentário "use no servidor — ignora RLS".
- Em `POST /api/specialists` ([server.ts:148](../../../server.ts)): destructurar `newPassword` separadamente; nunca incluir no objeto passado ao upsert.
- Em `POST /api/specialists`: capturar erro do upsert e responder 409 com mensagem clara se for violação de UNIQUE em `username`; 500 com a mensagem do banco em outros casos.
- No frontend (`PortalDashboard.tsx`, modal de equipe): no catch do submit, mostrar a `error` que veio do servidor via toast vermelho em vez de só "salvo".

### Resultado esperado

Cadastrar profissional → aparece na lista após refresh → login com a senha definida funciona.

## Bloco 2 — Login com duas abas

### Mudanças em `LoginScreen.tsx`

- Duas tabs no topo do card: **Administrador** | **Profissional**. Visual simples no estilo da paleta atual (rosé/dourado), nada mais.
- Tab ativa muda só rótulos auxiliares ("Acesso restrito ao administrador" / "Acesso da equipe") e a cor de destaque do botão de submit.
- Submit chama o mesmo `POST /api/auth/login` — a aba é puramente visual; o backend autentica pelo username e o JWT carrega o `roleType` correto.
- Aba ativa é persistida em `localStorage` (`alves.login.tab`), default `professional` no primeiro acesso.

### Pós-login

Sem mudança: `App.tsx` já decide o que renderizar a partir do `roleType` do JWT.

## Bloco 3 — Limpeza do portal admin

### Em `PortalDashboard.tsx`

Remover, sem substituir:

- Botão flutuante "+ Novo Agendamento" (FAB inferior direito).
- Qualquer link/atalho "agendar como cliente" / pra `/agendar` dentro do portal logado.
- Os botões de troca de modo "barra agendar / barra admin" que hoje aparecem no header do portal logado.

Quem quiser usar o fluxo do cliente abre `/agendar` no navegador direto. O portal logado fica focado em gestão.

## Bloco 4 — Filtros nos relatórios financeiros

### Onde aplica

Aba **Financeiro** e aba **Relatório Detalhado** do portal admin (em `PortalDashboard.tsx`).

### Barra de filtros (componente local na aba)

- Dropdown rápido: `Este mês` (padrão) · `Mês passado` · `Últimos 30 dias` · `Este ano` · `Personalizado`.
- Quando `Personalizado` → renderiza dois `<input type="date">` (início / fim). Validar que `início ≤ fim`.
- Botão "Limpar filtro" volta pra `Este mês`.

### Aplicação do filtro

- Frontend-only: as transactions já vêm todas via `GET /api/transactions`. Filtra em memória por `transaction.date` dentro do intervalo selecionado.
- Cards de totais (entradas, saídas, lucro, comissões) recalculam a partir do array filtrado.
- Tabela/lista de transações renderiza apenas as filtradas.
- O mesmo padrão para o "Relatório Detalhado" (que agrega por profissional/serviço).

### Sem mudança de backend

`GET /api/transactions` continua igual. Se no futuro o volume crescer, podemos mover o filtro pro servidor sem mudar a UI.

## Itens fora de escopo (deste design)

- Remover fallback `password === 'alves2026'` — feito quando todas as senhas forem trocadas.
- Rotacionar chaves Supabase vazadas no `.env.example` — operacional, fora do código.
- Mover `seedInitialData` pra script standalone — débito técnico, fica pra depois.

## Plano de verificação

1. `npm run dev` com `SUPABASE_SERVICE_ROLE_KEY` no `.env`.
2. Login `admin / alves2026`.
3. Cadastrar uma profissional nova com username + senha; refresh da página; confirmar que persiste.
4. Logout, abrir `/admin`, escolher aba "Profissional", logar com as credenciais criadas; confirmar que cai no portal restrito.
5. Conferir que FAB + atalhos foram removidos do portal admin.
6. Aba Financeiro: trocar entre `Este mês`, `Personalizado`, e confirmar que cards e lista atualizam juntos.
