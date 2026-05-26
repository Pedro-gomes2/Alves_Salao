# Financeiro do Profissional + Editar/Excluir Transações Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Profissional passa a ter aba Financeiro com totais e lançamentos próprios. Admin ganha botões de editar/excluir transações.

**Architecture:** Backend afrouxa permissão de `GET /api/transactions` (tryAuth + filtro por specialistId), adiciona PATCH/DELETE. Frontend renderiza variação "profissional" da aba Financeiro e coluna de Ações condicional na tabela; formulário "Lançar Operação" vira create OR edit.

**Tech Stack:** Express, Supabase, React, Tailwind, lucide-react.

**Spec:** [docs/superpowers/specs/2026-05-26-financeiro-profissional-e-editar-transacoes-design.md](../specs/2026-05-26-financeiro-profissional-e-editar-transacoes-design.md)

---

## File Structure

**Modificar:**
- `server.ts` — afrouxar GET, adicionar PATCH e DELETE.
- `supabase.ts` — adicionar `updateTransaction` e `deleteTransaction` no padrão `{data, error}`.
- `src/components/PortalDashboard.tsx`:
  - Sidebar/mobile-nav: mostrar Financeiro para profissional.
  - View `financeiro`: variação "profissional" (cards próprios + tabela própria) vs "admin" (existente + coluna Ações).
  - View `nova_operacao`: formulário em modo create OR edit baseado em novo state `editingTransactionId`.
  - Novos handlers `handleEditTransaction`, `handleDeleteTransaction`, `handleUpdateTransaction`.

**Sem novos arquivos.**

---

## Task 1: Backend — `GET /api/transactions` aberto pra profissional (filtrado)

**Files:**
- Modify: `server.ts` (linhas onde está `app.get('/api/transactions', requireAdmin, ...)`)

- [ ] **Step 1: Substituir handler de GET /api/transactions**

Encontrar o bloco atual:

```ts
  app.get('/api/transactions', requireAdmin, async (req, res) => {
    const transactions = await getTransactions();
    res.json(transactions);
  });
```

Substituir por:

```ts
  app.get('/api/transactions', tryAuth, async (req: AuthedRequest, res) => {
    const transactions = await getTransactions();
    if (req.user && req.user.roleType === 'professional') {
      return res.json(transactions.filter(t => t.specialistId === req.user!.id));
    }
    res.json(transactions);
  });
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 3: Commit**

```bash
git add server.ts
git commit -m "feat(backend): GET /api/transactions filtrado para profissional"
```

---

## Task 2: Backend — PATCH e DELETE de transações (admin only)

**Files:**
- Modify: `supabase.ts` (adicionar `updateTransaction`, `deleteTransaction`)
- Modify: `server.ts` (adicionar dois handlers)

- [ ] **Step 1: Adicionar duas funções em `supabase.ts`**

No final do arquivo, depois de `insertTransaction`, adicionar:

```ts
export async function updateTransaction(
  id: string,
  patch: Partial<Transaction>
): Promise<{ data: Transaction | null; error: { code?: string; message: string } | null }> {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('transactions')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.warn('Supabase transaction update failed:', error);
        return { data: null, error: { code: (error as any).code, message: error.message } };
      }
      const idx = transactionsMem.findIndex(t => t.id === id);
      if (idx >= 0) transactionsMem[idx] = data as Transaction;
      return { data: data as Transaction, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'unknown error' } };
    }
  }
  const idx = transactionsMem.findIndex(t => t.id === id);
  if (idx < 0) return { data: null, error: { message: 'not found' } };
  transactionsMem[idx] = { ...transactionsMem[idx], ...patch };
  return { data: transactionsMem[idx], error: null };
}

export async function deleteTransaction(
  id: string
): Promise<{ success: boolean; error: { code?: string; message: string } | null }> {
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient.from('transactions').delete().eq('id', id);
      if (error) {
        console.warn('Supabase transaction delete failed:', error);
        return { success: false, error: { code: (error as any).code, message: error.message } };
      }
      transactionsMem = transactionsMem.filter(t => t.id !== id);
      return { success: true, error: null };
    } catch (e: any) {
      return { success: false, error: { message: e?.message || 'unknown error' } };
    }
  }
  const before = transactionsMem.length;
  transactionsMem = transactionsMem.filter(t => t.id !== id);
  return { success: transactionsMem.length < before, error: null };
}
```

- [ ] **Step 2: Importar em `server.ts`**

No `import { ... } from './supabase';`, adicionar `updateTransaction` e `deleteTransaction`.

- [ ] **Step 3: Adicionar handlers em `server.ts`**

Logo após o `app.post('/api/transactions', requireAdmin, ...)`, adicionar:

```ts
  app.patch('/api/transactions/:id', requireAdmin, async (req, res) => {
    const id = req.params.id;
    const { id: _ignored, ...patch } = req.body || {};
    const { data, error } = await updateTransaction(id, patch);
    if (error) {
      console.error('Failed to update transaction:', error);
      return res.status(500).json({ error: 'Não foi possível atualizar o lançamento.' });
    }
    if (!data) return res.status(404).json({ error: 'Lançamento não encontrado.' });
    res.json(data);
  });

  app.delete('/api/transactions/:id', requireAdmin, async (req, res) => {
    const id = req.params.id;
    const { success, error } = await deleteTransaction(id);
    if (error) {
      console.error('Failed to delete transaction:', error);
      return res.status(500).json({ error: 'Não foi possível excluir o lançamento.' });
    }
    if (!success) return res.status(404).json({ error: 'Lançamento não encontrado.' });
    res.json({ success: true, id });
  });
```

- [ ] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add server.ts supabase.ts
git commit -m "feat(backend): PATCH e DELETE de transacoes (admin)"
```

---

## Task 3: Frontend — Financeiro visível pra profissional na sidebar

**Files:**
- Modify: `src/components/PortalDashboard.tsx`

A aba Financeiro hoje só aparece quando `isAdmin`. Mover o botão **Financeiro** da sidebar e da mobile-nav pra fora do `{isAdmin && ...}`.

- [ ] **Step 1: Sidebar desktop**

Encontrar o bloco `{isAdmin && ( <> ... </>)}` na sidebar (~linha 631). Dentro tem 4 botões: Equipe, Financeiro, Relatório Detalhado, Gestão de Serviços. **Recortar** o botão "Financeiro" inteiro e **colar fora** do `{isAdmin && ...}`, logo após o botão "Agenda" (que está fora desse guard). Mantém Equipe, Relatório Detalhado e Gestão de Serviços dentro do guard.

O botão movido fica:

```tsx
            <button
              onClick={() => { setActiveTab('financeiro'); setIsDrawerOpen(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm font-bold text-left transition-all ${
                activeTab === 'financeiro'
                  ? 'bg-brand-primary-light/30 text-brand-primary'
                  : 'text-brand-tertiary hover:bg-[#faf9f8]'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>{isAdmin ? 'Financeiro' : 'Meu Financeiro'}</span>
            </button>
```

(Texto adaptado por papel.)

- [ ] **Step 2: Mobile nav**

Encontrar o mesmo padrão na nav mobile (~linha 711). Mover o botão Financeiro (com label "Caixa") pra fora do `{isAdmin && ...}`. Pra profissional o label vira "Meu Caixa":

```tsx
              <button
                onClick={() => setActiveTab('financeiro')}
                className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'financeiro' ? 'text-brand-primary' : 'text-brand-tertiary/75'}`}
              >
                <DollarSign className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-1 uppercase">{isAdmin ? 'Caixa' : 'Meu Caixa'}</span>
              </button>
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/PortalDashboard.tsx
git commit -m "feat(portal): aba Financeiro visível para profissional na sidebar e nav mobile"
```

---

## Task 4: Frontend — Variação "profissional" da view Financeiro

**Files:**
- Modify: `src/components/PortalDashboard.tsx` (bloco `{activeTab === 'financeiro' && (...)}`)

- [ ] **Step 1: Derivar specialist atual e dados próprios**

Junto às outras derivações no topo do componente (perto de `filteredTransactions`), adicionar:

```ts
  const currentSpec = !isAdmin ? specialists.find(s => s.id === currentUser.id) : undefined;
  const mySpecialistId = currentUser.id;
  const myCommissionPct = currentSpec?.commission ?? 0;
  const myGenerated = filteredTransactions
    .filter(t => t.type === 'entrada' && t.specialistId === mySpecialistId)
    .reduce((sum, t) => sum + t.amount, 0);
  const myEstimatedPayout = (myGenerated * myCommissionPct) / 100;
```

(Para admin, `currentSpec` é undefined e essas vars não são usadas — sem custo.)

- [ ] **Step 2: Renderizar a variação profissional ANTES do bloco admin existente**

Substituir o cabeçalho do bloco da view financeiro:

```tsx
          {activeTab === 'financeiro' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="font-sans text-[11px] font-semibold text-brand-primary tracking-widest uppercase font-bold">Fluxo de Caixa</span>
                  <h2 className="font-display text-3xl text-brand-dark">Resumo Financeiro</h2>
                  ...
```

Por:

```tsx
          {activeTab === 'financeiro' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="font-sans text-[11px] font-semibold text-brand-primary tracking-widest uppercase font-bold">{isAdmin ? 'Fluxo de Caixa' : 'Meus Atendimentos'}</span>
                  <h2 className="font-display text-3xl text-brand-dark">{isAdmin ? 'Resumo Financeiro' : 'Meu Financeiro'}</h2>
                  <p className="text-brand-tertiary text-sm">{isAdmin ? 'Acompanhe a saúde do seu santuário em tempo real.' : 'Acompanhe seus atendimentos e repasses no período selecionado.'}</p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setEditingTransactionId(null); setActiveTab('nova_operacao'); }}
                      className="bg-brand-primary text-white hover:bg-brand-primary-light hover:text-brand-primary py-3 px-6 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition-transform active:scale-95"
                    >
                      <Plus className="w-4 h-4" /> Lançar Operação
                    </button>
                  </div>
                )}
              </div>
```

(Note o `setEditingTransactionId(null)` antes de ir pra nova_operacao — garante que o botão admin sempre cria, não edita. Esse state vem na Task 5.)

- [ ] **Step 3: Substituir os 3 stats cards por variação por papel**

Logo após a barra de filtros, substituir o bloco `{/* Stats Cards Row */} <div className="grid grid-cols-1 sm:grid-cols-3 gap-6"> ... </div>` por:

```tsx
              {isAdmin ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Entradas */}
                  <div className="bg-white border border-brand-primary-light/25 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-sans text-[10px] font-bold text-brand-tertiary uppercase tracking-wider">Entradas</span>
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="font-display text-2xl lg:text-3xl text-brand-primary font-bold">
                      R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">Geração de sessões e vendas</p>
                  </div>
                  {/* Saidas */}
                  <div className="bg-white border border-brand-primary-light/25 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-sans text-[10px] font-bold text-brand-tertiary uppercase tracking-wider">Saídas</span>
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    </div>
                    <h3 className="font-display text-2xl lg:text-3xl text-brand-dark font-bold">
                      R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">Custos com materiais e equipe</p>
                  </div>
                  {/* Net Profit */}
                  <div className="bg-brand-secondary text-white rounded-2xl p-6 shadow-md">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-sans text-[10px] font-bold uppercase tracking-wider opacity-75">Lucro Líquido</span>
                      <DollarSign className="w-5 h-5 opacity-75" />
                    </div>
                    <h3 className="font-display text-2xl lg:text-3xl font-bold">
                      R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs opacity-75 mt-2">Saldo total consolidado</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Faturamento Gerado */}
                  <div className="bg-white border border-brand-primary-light/25 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-sans text-[10px] font-bold text-brand-tertiary uppercase tracking-wider">Faturamento Gerado</span>
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="font-display text-2xl lg:text-3xl text-brand-primary font-bold">
                      R$ {myGenerated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">Atendimentos seus no período</p>
                  </div>
                  {/* Sua Comissão (%) */}
                  <div className="bg-white border border-brand-primary-light/25 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-sans text-[10px] font-bold text-brand-tertiary uppercase tracking-wider">Sua Comissão</span>
                      <DollarSign className="w-5 h-5 text-brand-secondary" />
                    </div>
                    <h3 className="font-display text-2xl lg:text-3xl text-brand-dark font-bold">
                      {myCommissionPct}%
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">Definida pela administração</p>
                  </div>
                  {/* Repasse Estimado */}
                  <div className="bg-brand-secondary text-white rounded-2xl p-6 shadow-md">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-sans text-[10px] font-bold uppercase tracking-wider opacity-75">Repasse Estimado</span>
                      <DollarSign className="w-5 h-5 opacity-75" />
                    </div>
                    <h3 className="font-display text-2xl lg:text-3xl font-bold">
                      R$ {myEstimatedPayout.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                    <p className="text-xs opacity-75 mt-2">Faturamento × comissão</p>
                  </div>
                </div>
              )}
```

- [ ] **Step 4: Adaptar a tabela "Histórico de Lançamentos"**

A tabela existente fica fora do `if`. Mudar só:
- Título: `{isAdmin ? 'Histórico de Lançamentos' : 'Meus Atendimentos'} ({filteredTransactions.length})`
- Esconder o link "Detalhar Relatório" pra profissional: envolver no `{isAdmin && (...)}`.
- Esconder a coluna `<th className="p-4">Categoria</th>` pra não-admin? **Mantém pra todos** — categoria é útil mesmo pra profissional.
- Esconder a linha "Gerado por: ..." dentro do `<td>` quando `!isAdmin` (redundante já que tudo é dela): trocar `{t.specialistName && (...)}` por `{isAdmin && t.specialistName && (...)}`.

- [ ] **Step 5: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/components/PortalDashboard.tsx
git commit -m "feat(portal): variacao da aba Financeiro para o profissional"
```

---

## Task 5: Frontend — coluna Ações (admin) + editar/excluir transações

**Files:**
- Modify: `src/components/PortalDashboard.tsx`

### Step 1: Novo state e import de ícones

- [ ] **Step 1a: Adicionar state**

Junto aos outros `useState`, adicionar:

```ts
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
```

- [ ] **Step 1b: Garantir imports `Pencil` e `Trash2` do `lucide-react`**

Conferir o import. Se faltar, adicionar.

### Step 2: Handlers

- [ ] **Step 2: Adicionar três handlers**

Junto a `handleCreateTransaction`:

```ts
  const handleStartEditTransaction = (t: Transaction) => {
    setEditingTransactionId(t.id);
    setTransType(t.type);
    setTransDescription(t.description);
    setTransAmount(String(t.amount));
    setTransDate(t.date);
    setTransCategory(t.category);
    setTransSpecialistId(t.specialistId || '');
    setActiveTab('nova_operacao');
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransactionId || !transDescription || !transAmount) return;
    const selectedSpecObj = specialists.find(s => s.id === transSpecialistId);
    const patch: Partial<Transaction> = {
      type: transType,
      description: transDescription,
      amount: parseFloat(transAmount),
      date: transDate,
      category: transCategory,
      specialistId: transSpecialistId || undefined,
      specialistName: selectedSpecObj ? selectedSpecObj.name : undefined,
    };
    try {
      const response = await fetch(`/api/transactions/${editingTransactionId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(patch),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        onRefreshData();
        setEditingTransactionId(null);
        setTransDescription(''); setTransAmount(''); setTransSpecialistId('');
        setActiveTab('financeiro');
        showToast('Lançamento atualizado!');
      } else {
        showToast(data.error || 'Erro ao atualizar lançamento.');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao conectar com o servidor.');
    }
  };

  const handleDeleteTransaction = async (t: Transaction) => {
    if (!window.confirm(`Excluir o lançamento "${t.description}" de R$ ${t.amount.toFixed(2)}?`)) return;
    try {
      const response = await fetch(`/api/transactions/${t.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        onRefreshData();
        showToast('Lançamento excluído.');
      } else {
        showToast(data.error || 'Erro ao excluir lançamento.');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao conectar com o servidor.');
    }
  };
```

### Step 3: Coluna Ações na tabela

- [ ] **Step 3: Acrescentar coluna**

Na tabela "Histórico de Lançamentos", após `<th className="p-4 text-right">Valor</th>`, adicionar:

```tsx
                        {isAdmin && <th className="p-4 text-right">Ações</th>}
```

E após o `<td>` final de Valor (na linha de cada transação):

```tsx
                        {isAdmin && (
                          <td className="p-4 text-right">
                            <div className="inline-flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditTransaction(t)}
                                title="Editar"
                                className="p-1.5 rounded hover:bg-brand-primary-light/30 text-brand-primary"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(t)}
                                title="Excluir"
                                className="p-1.5 rounded hover:bg-rose-100 text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
```

### Step 4: Formulário create OR edit

- [ ] **Step 4a: Título dinâmico**

Encontrar o cabeçalho da view `nova_operacao` (`<h2>...</h2>`) e trocar pra:

```tsx
                <h2 className="font-display text-3xl text-brand-dark">{editingTransactionId ? 'Editar Lançamento' : 'Lançar Nova Operação'}</h2>
```

- [ ] **Step 4b: Submit binding**

No `<form onSubmit={handleCreateTransaction}`, trocar pra:

```tsx
                <form onSubmit={editingTransactionId ? handleUpdateTransaction : handleCreateTransaction} ...>
```

- [ ] **Step 4c: Botão Cancelar**

No bloco de botões do formulário, adicionar (se ainda não existir) um botão de cancelar visível quando editando:

```tsx
                    {editingTransactionId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTransactionId(null);
                          setTransDescription(''); setTransAmount(''); setTransSpecialistId('');
                          setActiveTab('financeiro');
                        }}
                        className="px-6 py-3 rounded-full font-bold text-xs uppercase tracking-wider border border-brand-primary-light/40 text-brand-tertiary hover:bg-[#faf9f8]"
                      >
                        Cancelar
                      </button>
                    )}
```

- [ ] **Step 4d: Label do botão de submit**

Trocar o texto do botão submit pra ser dinâmico:

```tsx
                    {editingTransactionId ? 'Salvar Alterações' : 'Lançar Operação'}
```

### Step 5: Verificar

- [ ] **Step 5: tsc**

```bash
npx tsc --noEmit
```

### Step 6: Commit

- [ ] **Step 6: Commit**

```bash
git add src/components/PortalDashboard.tsx
git commit -m "feat(portal): editar e excluir transacoes (admin)"
```

---

## Task 6: Verificação final

- [ ] **Step 1: Build**

```bash
npx tsc --noEmit && npm run build
```

Esperado: zero erros, build limpo.

- [ ] **Step 2: Smoke tests**

1. Login profissional → aba "Meu Financeiro" aparece. Cards mostram só dela. Tabela só com transações dela.
2. Login profissional → NÃO vê coluna Ações nem botão "Lançar Operação".
3. Login admin → aba Financeiro mantém visão completa + coluna Ações.
4. Admin clica editar → cai em "Editar Lançamento" preenchido → muda valor → Salvar → volta pra Financeiro com toast.
5. Admin clica excluir → confirm → registro some.
6. (curl) PATCH e DELETE com token de profissional → 403.
