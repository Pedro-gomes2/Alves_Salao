# Alves Estética — Financeiro do Profissional + Editar/Excluir Transações

**Data:** 2026-05-26
**Branch:** `pedro/musing-montalcini-5f3dd3`

## Contexto

Dois ajustes pequenos e ortogonais ao branch atual:

1. A profissional logada hoje só vê Dashboard + Agenda. Precisa enxergar quanto ela gerou no período e quanto receberá de comissão — sem ver dados das colegas nem custos do salão.
2. Admin não tem como corrigir ou apagar lançamentos no histórico financeiro (só consegue criar). Precisa de editar e excluir.

## Bloco 1 — Aba Financeiro do Profissional

### Backend

- `GET /api/transactions` deixa de exigir admin. Passa a usar `tryAuth` (igual `GET /api/bookings`):
  - Admin (ou ausência de auth) recebe **todas** as transações (como hoje).
  - Profissional autenticada recebe **apenas** transações com `specialistId === req.user.id`.

### Frontend

- A sidebar e a mobile-nav passam a mostrar **Financeiro** para profissionais também (hoje está dentro de `{isAdmin && ...}`).
- A view `activeTab === 'financeiro'` ganha um modo "profissional" quando `!isAdmin`:
  - **Header:** título "Meu Financeiro" + subtítulo "Acompanhe seus atendimentos e repasses." Sem o botão "Lançar Operação".
  - **Cards (3, no período filtrado):**
    1. **Faturamento Gerado** = soma de `entrada` no array filtrado pela profissional.
    2. **Sua Comissão (%)** = `currentSpec.commission` (vem do array `specialists`).
    3. **Repasse Estimado** = `faturamento × commission / 100`.
  - **Tabela "Meus Atendimentos":** mesmas colunas atuais menos a info "Gerado por" (redundante). Usa `filteredTransactions` (que já vem filtrado pelo backend).
  - **Sem** link "Detalhar Relatório", **sem** seção de saídas/lucro.
- Filtro de período (Task 6/7 do branch atual) continua igual — funciona para profissional também.
- Aba **Relatório Detalhado**, **Equipe**, **Gestão de Serviços** seguem admin-only — sem mudança.

## Bloco 2 — Editar e Excluir Transações (admin only)

### Backend

Dois endpoints novos em `server.ts`, ambos `requireAdmin`:

- `PATCH /api/transactions/:id` — body com os campos editáveis (`type`, `description`, `amount`, `date`, `category`, `specialistId`, `specialistName`). Retorna a transação atualizada ou 404/500.
- `DELETE /api/transactions/:id` — apaga. Retorna `{ success: true, id }` ou 404.

Camada `supabase.ts` ganha:

- `updateTransaction(id, patch): Promise<{ data: Transaction | null; error: ... | null }>`
- `deleteTransaction(id): Promise<{ success: boolean; error: ... | null }>`

Padrão `{data, error}` consistente com `upsertSpecialist`.

### Frontend (`PortalDashboard.tsx`, aba Financeiro)

- Tabela "Histórico de Lançamentos" ganha coluna **Ações** (só renderizada para admin). Dois ícones por linha:
  - **Editar (lápis):** popula o estado do formulário "Lançar Operação" com os campos da transação, troca `activeTab` para `nova_operacao`, e marca a tela em modo edição (novo state `editingTransactionId`).
  - **Excluir (lixeira):** `window.confirm("Excluir o lançamento '{descrição}' de R$ {valor}?")` → `DELETE /api/transactions/:id` → toast → refresh.
- Formulário de Lançar Operação ganha:
  - Título dinâmico: "Lançar Nova Operação" vs "Editar Lançamento".
  - Submit decide: se `editingTransactionId` setado → `PATCH`, senão → `POST` (comportamento atual).
  - Botão "Cancelar" limpa `editingTransactionId` e volta pra Financeiro.

### Sem mudança

- Edição de bookings (out of scope).
- Auditoria/histórico de quem editou (out of scope).
- Permissão: profissional **não** vê os botões e o backend bloqueia em 403 mesmo se chamado direto.

## Plano de verificação

1. Logar como profissional → ver aba Financeiro com cards e tabela só dos próprios atendimentos.
2. Logar como admin → editar uma transação existente, confirmar persistência.
3. Logar como admin → excluir uma transação, confirmar sumiço.
4. Logar como profissional → confirmar que ela **não vê** botões de editar/excluir.
5. (Curiosidade) Tentar `DELETE /api/transactions/:id` com token de profissional via `curl` → esperar 403.
