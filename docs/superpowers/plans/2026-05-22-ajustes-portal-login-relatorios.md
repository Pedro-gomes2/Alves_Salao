# Alves Estética — Ajustes (cadastro, login, portal, relatórios) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir o bug de cadastro/login de profissional, adicionar abas no login, limpar o portal admin e adicionar filtros por período aos relatórios financeiros.

**Architecture:** Backend Express + Supabase (mudança principal: usar service-role key no servidor, sanitizar payload do upsert de specialist, retornar erros estruturados). Frontend React (LoginScreen ganha tabs; PortalDashboard remove atalhos e ganha barra de filtros local na aba Financeiro e Relatório Detalhado). Filtros aplicados em memória — sem mudança de endpoint.

**Tech Stack:** React 19, TypeScript, Express 4, Supabase JS, Tailwind 4, lucide-react.

**Spec:** [docs/superpowers/specs/2026-05-22-ajustes-portal-login-relatorios-design.md](../specs/2026-05-22-ajustes-portal-login-relatorios-design.md)

---

## Pré-requisitos

- `.env` contém `SUPABASE_URL` e `SUPABASE_ANON_KEY` válidos.
- Você precisa pegar a **service role key** no painel do Supabase (Project Settings → API → `service_role` key, "secret"). NÃO commitar.
- `npm install` rodando, `npm run dev` funcional, login admin `admin / alves2026` funcionando antes de começar.

---

## File Structure

**Backend (modificar):**
- [supabase.ts](../../../supabase.ts) — passar a usar `SUPABASE_SERVICE_ROLE_KEY` quando disponível; logar qual modo está em uso.
- [server.ts](../../../server.ts) — em `POST /api/specialists`, destructurar `newPassword`, capturar erros do upsert e mapear para 409 (unique violation) ou 500.
- [supabase.ts](../../../supabase.ts) `upsertSpecialist` — passar a retornar `{ data, error }` em vez de cair silenciosamente em memória quando há erro do Supabase, pra o handler do server poder responder com mensagem real.
- [.env.example](../../../.env.example) — adicionar `SUPABASE_SERVICE_ROLE_KEY`.

**Frontend (modificar):**
- [src/components/LoginScreen.tsx](../../../src/components/LoginScreen.tsx) — adicionar tabs Admin/Profissional, persistir aba em `localStorage`.
- [src/components/PortalDashboard.tsx](../../../src/components/PortalDashboard.tsx):
  - Remover FAB "+ Novo Agendamento" (linhas ~587-594).
  - Remover botão "Novo Agendamento" do rodapé da sidebar (linhas ~684-692).
  - Em `handleSaveSpecialistSettings` (linha ~408) e `handleResetPassword` (linha ~462), tratar resposta de erro do backend e exibir toast vermelho.
  - Adicionar componente local `<PeriodFilter>` no topo das views `financeiro` e `relatorio_detalhado`.
  - Recalcular `totalRevenue` / `totalExpenses` / `netProfit` a partir das transactions filtradas; renderizar tabela com lista filtrada.
- [src/App.tsx](../../../src/App.tsx) — remover o switch "Ver Agendamento como Cliente / Portal de Gestão" (linhas ~175-191) e os botões de copy `/agendar` e `/admin` (linhas ~193-213).

**Sem novos arquivos.** Todos os utilitários (filtro de período, helpers de data) ficam locais em `PortalDashboard.tsx` — pequenos e usados em um lugar só.

---

## Task 1: Backend — usar service-role key e logar o modo

**Files:**
- Modify: `supabase.ts:1-18`
- Modify: `.env.example`

**Por que:** RLS bloqueia INSERT/UPDATE em `specialists` quando o backend usa a `anon` key. A service-role key bypassa RLS — é o padrão para backend privado.

- [ ] **Step 1: Atualizar `.env.example`**

Adicionar a linha abaixo logo após `SUPABASE_ANON_KEY`:

```
# Usada APENAS pelo servidor — bypassa Row Level Security.
# Pegue em: Supabase Dashboard → Project Settings → API → service_role (secret).
# NUNCA exponha no frontend nem commit no repositório.
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 2: Adicionar `SUPABASE_SERVICE_ROLE_KEY=...` no seu `.env` local**

Cole a key obtida no painel do Supabase. (Esse passo é manual, não vai pro git.)

- [ ] **Step 3: Trocar `supabase.ts` para preferir a service role**

Substituir o bloco `lines 1-18` por:

```ts
import { createClient } from '@supabase/supabase-js';
import { Specialist, Service, Booking, Transaction } from './src/types';
import { INITIAL_SPECIALISTS, INITIAL_SERVICES, INITIAL_BOOKINGS, INITIAL_TRANSACTIONS } from './src/data';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

let supabaseClient: any = null;
if (isSupabaseConfigured) {
  try {
    supabaseClient = createClient(supabaseUrl!, supabaseKey!);
    const mode = supabaseServiceKey ? 'service_role (bypasses RLS)' : 'anon (RLS enforced — writes may fail)';
    console.log(`Supabase client initialized successfully. Auth mode: ${mode}.`);
    if (!supabaseServiceKey) {
      console.warn('SUPABASE_SERVICE_ROLE_KEY not set — admin writes to specialists/services/transactions will fail under RLS.');
    }
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
  }
}
```

- [ ] **Step 4: Reiniciar o servidor e confirmar o log**

```bash
npm run dev
```

Esperado no console: `Supabase client initialized successfully. Auth mode: service_role (bypasses RLS).`

- [ ] **Step 5: Commit**

```bash
git add supabase.ts .env.example
git commit -m "feat(backend): usar SUPABASE_SERVICE_ROLE_KEY no servidor para bypassar RLS"
```

---

## Task 2: Backend — sanitizar payload e retornar erros estruturados em `POST /api/specialists`

**Files:**
- Modify: `supabase.ts` — `upsertSpecialist` (linhas ~121-138)
- Modify: `server.ts:148-163`

**Por que:** Hoje `newPassword` vaza no upsert (coluna inexistente no Postgres → falha). E quando o Supabase rejeita por qualquer motivo, a função volta `specialist` original e o cliente vê 200 falso.

- [ ] **Step 1: Trocar `upsertSpecialist` para propagar erro**

Em `supabase.ts`, substituir a função inteira (~linhas 121-138) por:

```ts
export async function upsertSpecialist(
  specialist: Specialist
): Promise<{ data: Specialist; error: { code?: string; message: string } | null }> {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('specialists')
        .upsert(specialist)
        .select()
        .single();
      if (error) {
        console.warn('Supabase specialist upsert failed:', error);
        return { data: specialist, error: { code: (error as any).code, message: error.message } };
      }
      // mirror to memory so reads stay consistent if Supabase later fails
      const idx = specialistsMem.findIndex(s => s.id === (data as Specialist).id);
      if (idx >= 0) specialistsMem[idx] = data as Specialist; else specialistsMem.push(data as Specialist);
      return { data: data as Specialist, error: null };
    } catch (e: any) {
      console.warn('Supabase specialist upsert error:', e);
      return { data: specialist, error: { message: e?.message || 'unknown error' } };
    }
  }
  // memory-only mode
  const idx = specialistsMem.findIndex(s => s.id === specialist.id);
  if (idx >= 0) specialistsMem[idx] = specialist; else specialistsMem.push(specialist);
  return { data: specialist, error: null };
}
```

- [ ] **Step 2: Atualizar todos os callers internos de `upsertSpecialist`**

Em `server.ts`, há dois pontos que chamam `upsertSpecialist(spec)` sem usar o retorno novo: dentro de `POST /api/bookings` (linha ~232) e dentro de `PATCH /api/bookings/:id/status` (linha ~269). Trocar nesses dois pontos:

```ts
await upsertSpecialist(spec);
```

por:

```ts
await upsertSpecialist(spec); // attendanceCount bump; error tolerated
```

(Sem mudança funcional — só comentário pra deixar claro que ignoramos erro de update de contador.)

- [ ] **Step 3: Reescrever `POST /api/specialists` em `server.ts:148-163`**

Substituir o bloco por:

```ts
app.post('/api/specialists', requireAdmin, async (req, res) => {
  const { newPassword, ...rest } = req.body || {};
  const spec: Specialist = { ...rest };
  if (!spec.id) {
    spec.id = 'spec-' + Date.now();
  }
  if (typeof newPassword === 'string' && newPassword.length > 0) {
    spec.passwordHash = await bcrypt.hash(newPassword, 10);
  }
  if (!spec.roleType) spec.roleType = 'professional';

  const { data: saved, error } = await upsertSpecialist(spec);
  if (error) {
    // Postgres unique violation code is '23505'
    if (error.code === '23505' || /duplicate key|unique/i.test(error.message)) {
      return res.status(409).json({ error: 'Já existe um profissional com esse usuário.' });
    }
    return res.status(500).json({ error: 'Não foi possível salvar: ' + error.message });
  }
  if (saved && (saved as any).passwordHash) delete (saved as any).passwordHash;
  res.json(saved);
});
```

- [ ] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 5: Teste manual — cadastrar profissional**

1. `npm run dev`
2. Logar como admin.
3. Aba Equipe → Contratar novo membro.
4. Preencher nome, cargo, especialidade, **usuário** (ex: `joana`), **nova senha** (ex: `teste123`).
5. Salvar.
6. Refresh (F5). A profissional deve estar lá.
7. Tentar cadastrar outra com username `joana` → esperar toast vermelho "Já existe um profissional com esse usuário."

- [ ] **Step 6: Teste manual — login do profissional**

1. Sair do admin.
2. Logar com `joana / teste123`.
3. Deve cair no portal vendo só Dashboard + Agenda.

- [ ] **Step 7: Commit**

```bash
git add server.ts supabase.ts
git commit -m "fix(specialists): sanitizar newPassword e propagar erro do upsert (409 em username duplicado)"
```

---

## Task 3: Frontend — mostrar erro real ao salvar/resetar profissional

**Files:**
- Modify: `src/components/PortalDashboard.tsx:408-440` (`handleSaveSpecialistSettings`)
- Modify: `src/components/PortalDashboard.tsx:462-488` (`handleResetPassword`)

**Por que:** Mesmo agora que o backend retorna erro, o frontend ignora — não chama `showToast` no caminho de erro de `handleSaveSpecialistSettings`.

- [ ] **Step 1: Substituir o bloco `try` de `handleSaveSpecialistSettings`**

Trocar o bloco `try { ... }` (linhas ~426-439) por:

```ts
    try {
      const response = await fetch('/api/specialists', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        onRefreshData();
        setActiveTab('equipe');
        showToast(isNewSpec ? 'Nova profissional adicionada!' : 'Configurações de profissional salvas!');
      } else {
        showToast(data.error || 'Erro ao salvar profissional.');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao conectar com o servidor.');
    }
```

- [ ] **Step 2: Atualizar `handleResetPassword` para usar a `error` do servidor**

Em `src/components/PortalDashboard.tsx`, substituir o bloco `if (response.ok) { ... } else { showToast('Erro ao resetar senha.'); }` (linhas ~478-483) por:

```ts
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        onRefreshData();
        showToast(`Senha de ${spec.name} atualizada!`);
      } else {
        showToast(data.error || 'Erro ao resetar senha.');
      }
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Teste manual**

1. Editar uma profissional existente; tentar mudar o username pra outro que já existe.
2. Esperar toast vermelho com "Já existe um profissional com esse usuário."

- [ ] **Step 5: Commit**

```bash
git add src/components/PortalDashboard.tsx
git commit -m "fix(portal): propagar mensagem de erro do backend ao salvar/resetar profissional"
```

---

## Task 4: Frontend — LoginScreen com duas abas (Admin / Profissional)

**Files:**
- Modify: `src/components/LoginScreen.tsx`

- [ ] **Step 1: Adicionar estado de aba e persistência**

Em `LoginScreen.tsx`, logo após `const [success, setSuccess] = useState(false);` (linha 15), adicionar:

```ts
  const [tab, setTab] = useState<'admin' | 'professional'>(() => {
    if (typeof window === 'undefined') return 'professional';
    const saved = window.localStorage.getItem('alves.login.tab');
    return saved === 'admin' ? 'admin' : 'professional';
  });

  const selectTab = (t: 'admin' | 'professional') => {
    setTab(t);
    setError('');
    try { window.localStorage.setItem('alves.login.tab', t); } catch {}
  };
```

- [ ] **Step 2: Renderizar a barra de tabs entre o header rosé e o form**

Logo dentro de `<div className="p-6 md:p-8 space-y-6">` (linha 55), ANTES do `{success ? (...)` ternário, adicionar:

```tsx
        {!success && (
          <div className="flex bg-[#faf9f8] p-1 rounded-full border border-[#d6c2c4]/40">
            <button
              type="button"
              onClick={() => selectTab('admin')}
              className={`flex-1 py-2 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                tab === 'admin'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-brand-tertiary hover:text-brand-primary'
              }`}
            >
              Administrador
            </button>
            <button
              type="button"
              onClick={() => selectTab('professional')}
              className={`flex-1 py-2 px-4 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                tab === 'professional'
                  ? 'bg-brand-secondary text-white shadow-sm'
                  : 'text-brand-tertiary hover:text-brand-primary'
              }`}
            >
              Profissional
            </button>
          </div>
        )}
```

- [ ] **Step 3: Trocar o texto auxiliar para variar conforme a tab**

Substituir o bloco da "faixa cinza com instruções" (linhas 68-73) por:

```tsx
            <div className="bg-[#faf9f8] border border-[#d6c2c4]/40 p-4 rounded-xl text-center">
              <p className="text-[11px] font-sans text-brand-tertiary font-medium leading-snug">
                {tab === 'admin' ? (
                  <>Acesso restrito ao administrador do salão.</>
                ) : (
                  <>Acesso da equipe — use o usuário cadastrado pela administração. Se ainda não tem acesso, peça à administradora para criar pela aba <strong>Equipe</strong> do portal.</>
                )}
                <br /><span className="opacity-70">Senha inicial padrão: <code className="bg-brand-primary-light/35 px-1 py-0.5 rounded font-mono">alves2026</code> — troque no primeiro login.</span>
              </p>
            </div>
```

- [ ] **Step 4: Atualizar o placeholder do campo Usuário**

Trocar o `placeholder="Ex: admin"` (linha 88) por:

```tsx
                placeholder={tab === 'admin' ? 'Ex: admin' : 'Ex: joana'}
```

- [ ] **Step 5: Estilizar o botão de submit conforme a tab**

Substituir o `className` do botão de submit (linha 120) por:

```tsx
              className={`w-full text-white hover:opacity-90 font-bold py-3.5 px-6 rounded-full flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer disabled:opacity-55 ${
                tab === 'admin' ? 'bg-brand-primary' : 'bg-brand-secondary'
              }`}
```

- [ ] **Step 6: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Teste manual**

1. `npm run dev`, abrir `/admin`.
2. Tabs visíveis. Cor do botão muda conforme a tab.
3. Trocar para "Profissional", fechar a aba, reabrir `/admin` — aba "Profissional" deve estar selecionada.
4. Logar como admin pela aba "Profissional" (deve funcionar mesmo assim — validação é compartilhada).

- [ ] **Step 8: Commit**

```bash
git add src/components/LoginScreen.tsx
git commit -m "feat(login): tela de login com tabs Administrador/Profissional"
```

---

## Task 5: Frontend — remover FAB, sidebar-CTA e botões do header

**Files:**
- Modify: `src/components/PortalDashboard.tsx:587-594` (FAB)
- Modify: `src/components/PortalDashboard.tsx:684-692` (sidebar CTA)
- Modify: `src/App.tsx:175-213` (switch + copy buttons)

- [ ] **Step 1: Remover o FAB "+ Novo Agendamento"**

Em `src/components/PortalDashboard.tsx`, apagar inteiro o bloco:

```tsx
      {/* Floating Action Button (Universal Add) */}
      <button 
        onClick={onGoToBooking}
        className="fixed bottom-12 right-6 md:right-12 w-14 h-14 bg-brand-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-50 group"
        title="Novo Agendamento"
      >
        <span className="font-sans font-bold text-2xl group-hover:rotate-90 transition-transform duration-300">+</span>
      </button>
```

- [ ] **Step 2: Remover o CTA do rodapé da sidebar**

Em `src/components/PortalDashboard.tsx`, apagar inteiro o bloco (logo após `</nav>`):

```tsx
          <div className="border-t border-brand-primary-light/10 pt-4 mt-4">
            <button 
              onClick={onGoToBooking}
              className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white py-3 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-brand-primary-light hover:text-brand-primary transition-all"
            >
              <Plus className="w-4 h-4" />
              Novo Agendamento
            </button>
          </div>
```

- [ ] **Step 3: Remover o switch e os botões de copy do header em `App.tsx`**

Substituir o bloco `{isAdminRoute && isAuthed && ( ... )}` (linhas ~175-225) por uma versão enxuta que mantém só o botão de logout:

```tsx
          {isAdminRoute && isAuthed && (
            <div className="flex flex-wrap items-center gap-3 animate-fade-in">
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-4 py-2 border border-rose-200/60 bg-rose-50/50 hover:bg-rose-50 text-rose-700 font-sans font-bold text-xs uppercase rounded-full transition-all cursor-pointer shadow-sm active:scale-95"
                title="Sair"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          )}
```

Observação: confirmar que o JSX original termina com `</div>` correspondente — manter o fechamento. Se houver elementos depois do botão de Sair (ex: indicador de usuário logado), preservá-los; remover SOMENTE o `<div className="flex items-center bg-[#eeeeed] ...">` (switch) e o bloco `{currentUser?.roleType === 'admin' && (...)}` (copy buttons).

- [ ] **Step 4: Limpar imports não usados em `App.tsx`**

Se após a remoção o arquivo deixar de usar `Heart`, `LayoutDashboard`, `Copy`, `Check`, ou a função `copyToClipboard` / state `copiedLink`, remover. Rodar:

```bash
npx tsc --noEmit
```

E corrigir avisos de import/variável não usada.

- [ ] **Step 5: Teste manual**

1. Logar como admin.
2. Confirmar: nenhum botão "+ Novo Agendamento" (canto inferior, sidebar, header).
3. Confirmar: header só mostra o logo, botão Sair (e qualquer indicador de usuário que existia).
4. Navegar entre abas Dashboard / Agenda / Equipe / Financeiro — tudo continua funcional.

- [ ] **Step 6: Commit**

```bash
git add src/components/PortalDashboard.tsx src/App.tsx
git commit -m "refactor(portal): remover FAB, CTA da sidebar e switch admin/cliente do header"
```

---

## Task 6: Filtros de período — helpers e estado

**Files:**
- Modify: `src/components/PortalDashboard.tsx` (topo do componente)

- [ ] **Step 1: Adicionar tipo e helpers logo abaixo dos imports**

Em `src/components/PortalDashboard.tsx`, logo após o último `import`, antes do `interface PortalDashboardProps`, adicionar:

```ts
type PeriodKey = 'thisMonth' | 'lastMonth' | 'last30' | 'thisYear' | 'custom';

function periodRange(key: PeriodKey, customStart: string, customEnd: string, todayISO: string): { start: string; end: string } {
  const today = new Date(todayISO + 'T00:00:00');
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (key === 'thisMonth') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: iso(start), end: iso(end) };
  }
  if (key === 'lastMonth') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: iso(start), end: iso(end) };
  }
  if (key === 'last30') {
    const start = new Date(today); start.setDate(start.getDate() - 29);
    return { start: iso(start), end: iso(today) };
  }
  if (key === 'thisYear') {
    return { start: `${today.getFullYear()}-01-01`, end: `${today.getFullYear()}-12-31` };
  }
  // custom
  return { start: customStart || '0000-01-01', end: customEnd || '9999-12-31' };
}

function filterByDate<T extends { date: string }>(items: T[], range: { start: string; end: string }): T[] {
  return items.filter(i => i.date >= range.start && i.date <= range.end);
}
```

- [ ] **Step 2: Adicionar estado de filtro dentro do componente**

Dentro do `export default function PortalDashboard(...)`, junto aos outros `useState`, adicionar:

```ts
  const [periodKey, setPeriodKey] = useState<PeriodKey>('thisMonth');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
```

- [ ] **Step 3: Derivar transações filtradas e substituir os totais**

Localizar as linhas (~290-292):

```ts
  const totalRevenue = transactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
```

Substituir por:

```ts
  const activeRange = periodRange(periodKey, customStart, customEnd, todayStr);
  const filteredTransactions = filterByDate(transactions, activeRange);
  const totalRevenue = filteredTransactions.filter(t => t.type === 'entrada').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = filteredTransactions.filter(t => t.type === 'saida').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
```

(`todayStr` já está definido na linha 286.)

- [ ] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/PortalDashboard.tsx
git commit -m "feat(relatorio): helpers e estado de filtro por periodo"
```

---

## Task 7: Filtros de período — UI na aba Financeiro

**Files:**
- Modify: `src/components/PortalDashboard.tsx` (aba `financeiro`, ~linhas 1651-1754)

- [ ] **Step 1: Inserir a barra de filtros logo após o cabeçalho da aba**

Dentro de `{activeTab === 'financeiro' && (`, depois da `<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">...</div>` (que termina por volta da linha 1669), ANTES do grid de "Stats Cards", adicionar:

```tsx
              {/* Period filter */}
              <div className="bg-white border border-brand-primary-light/25 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-brand-tertiary">Período</label>
                <select
                  value={periodKey}
                  onChange={(e) => setPeriodKey(e.target.value as PeriodKey)}
                  className="bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-3 py-2 text-sm font-sans text-brand-dark outline-none focus:border-brand-primary"
                >
                  <option value="thisMonth">Este mês</option>
                  <option value="lastMonth">Mês passado</option>
                  <option value="last30">Últimos 30 dias</option>
                  <option value="thisYear">Este ano</option>
                  <option value="custom">Personalizado</option>
                </select>
                {periodKey === 'custom' && (
                  <>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-3 py-2 text-sm"
                    />
                    <span className="text-brand-tertiary text-sm">até</span>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-3 py-2 text-sm"
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => { setPeriodKey('thisMonth'); setCustomStart(''); setCustomEnd(''); }}
                  className="ml-auto text-[11px] font-bold uppercase tracking-wider text-brand-primary hover:underline"
                >
                  Limpar filtro
                </button>
              </div>
```

- [ ] **Step 2: Trocar a tabela para usar `filteredTransactions`**

Localizar (~linha 1713):

```tsx
                  <h3 className="font-sans font-bold text-base text-brand-dark">Histórico de Lançamentos ({transactions.length})</h3>
```

Trocar `{transactions.length}` por `{filteredTransactions.length}`.

Localizar (~linha 1730):

```tsx
                      {transactions.map(t => (
```

Trocar para:

```tsx
                      {filteredTransactions.map(t => (
```

- [ ] **Step 3: Teste manual**

1. Logar como admin → aba Financeiro.
2. Default: "Este mês" — cards e tabela mostram só transações deste mês.
3. Trocar para "Personalizado", preencher start/end — atualizar.
4. "Limpar filtro" volta para "Este mês".

- [ ] **Step 4: Commit**

```bash
git add src/components/PortalDashboard.tsx
git commit -m "feat(financeiro): barra de filtros de periodo + recalculo de totais"
```

---

## Task 8: Filtros de período — aplicar também ao Relatório Detalhado

**Files:**
- Modify: `src/components/PortalDashboard.tsx` (aba `relatorio_detalhado`, ~linhas 1756 em diante)

**Por que:** A spec pede o mesmo filtro nas duas abas. O estado já é compartilhado (Task 6).

- [ ] **Step 1: Inserir a mesma barra de filtros na aba relatorio_detalhado**

Dentro de `{activeTab === 'relatorio_detalhado' && (`, logo após a `<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 no-print">...</div>` (~linha 1759-1773), adicionar EXATAMENTE o mesmo bloco da Task 7 Step 1 (envolto em `<div className="no-print">` para não imprimir):

```tsx
              <div className="no-print">
                {/* Period filter — mesma estrutura da aba Financeiro */}
                <div className="bg-white border border-brand-primary-light/25 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-brand-tertiary">Período</label>
                  <select
                    value={periodKey}
                    onChange={(e) => setPeriodKey(e.target.value as PeriodKey)}
                    className="bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-3 py-2 text-sm font-sans text-brand-dark outline-none focus:border-brand-primary"
                  >
                    <option value="thisMonth">Este mês</option>
                    <option value="lastMonth">Mês passado</option>
                    <option value="last30">Últimos 30 dias</option>
                    <option value="thisYear">Este ano</option>
                    <option value="custom">Personalizado</option>
                  </select>
                  {periodKey === 'custom' && (
                    <>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-3 py-2 text-sm"
                      />
                      <span className="text-brand-tertiary text-sm">até</span>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-xl px-3 py-2 text-sm"
                      />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => { setPeriodKey('thisMonth'); setCustomStart(''); setCustomEnd(''); }}
                    className="ml-auto text-[11px] font-bold uppercase tracking-wider text-brand-primary hover:underline"
                  >
                    Limpar filtro
                  </button>
                </div>
              </div>
```

- [ ] **Step 2: Substituir referências a `transactions` por `filteredTransactions` dentro da view**

Procurar dentro do bloco `{activeTab === 'relatorio_detalhado' && (...)` (entre as linhas ~1757 e o próximo `}` de fechamento da view, em torno da linha 1870-1875) cada uso de `transactions` que monta tabelas/agregações da view. Para cada um, trocar por `filteredTransactions`. Não tocar em `transactions.find(...)` que esteja sendo usado pra olhar um lançamento individual fora do contexto agregado — só os usados como base de listagem/soma na view.

Usar Grep antes da edição para mapear todas as ocorrências dentro do bloco e revisar caso a caso:

```bash
# Para conferência local
grep -n "transactions\." src/components/PortalDashboard.tsx
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Teste manual**

1. Aba Relatório Detalhado — barra de filtros aparece no topo.
2. Trocar período → agregados recalculam.
3. Botão Imprimir continua funcionando (a barra de filtros não aparece na impressão por estar em `no-print`).

- [ ] **Step 5: Commit**

```bash
git add src/components/PortalDashboard.tsx
git commit -m "feat(relatorio): aplicar filtro de periodo tambem no Relatorio Detalhado"
```

---

## Task 9: Verificação final ponta-a-ponta

- [ ] **Step 1: Build limpa**

```bash
npx tsc --noEmit
npm run build
```

Esperado: zero erros.

- [ ] **Step 2: Smoke test completo**

1. `npm run dev`.
2. `/admin` → aba "Profissional" lembrada do último login.
3. Logar como admin → cadastrar profissional `maria / minhasenha` → confirmar persistência após F5.
4. Logout → logar como `maria / minhasenha` (aba Profissional) → ver só Dashboard + Agenda.
5. Logout → logar como admin → aba Financeiro:
   - Default "Este mês" — cards e tabela alinhados.
   - "Mês passado", "Últimos 30 dias", "Este ano" — atualiza.
   - "Personalizado" com datas — atualiza.
   - "Limpar filtro" volta pro default.
6. Aba Relatório Detalhado — mesmo comportamento.
7. Conferir: nenhum FAB, nenhum CTA na sidebar, header sem switch admin/cliente.
8. Tentar cadastrar profissional com username duplicado — toast vermelho específico.

- [ ] **Step 3: Atualizar status na spec / changelog do projeto (opcional)**

Se o repositório mantém um `CHANGELOG.md` ou seção "Status atual" no README, adicionar uma linha. Sem isso, skip.

- [ ] **Step 4: Commit final**

Se houver mudanças soltas (lint, formatting):

```bash
git status
git add -A
git commit -m "chore: ajustes finais pos verificacao manual"
```

---

## Notas operacionais

- **Service role key fora do git:** dupla-checagem antes do PR — `git diff origin/main -- .env` deve estar vazio.
- **Fallback `alves2026` continua ativo** no `server.ts` por enquanto, conforme a spec. Será removido em PR separado.
- **RLS:** depois desta mudança o backend bypassa RLS. As policies originais continuam protegendo qualquer acesso direto do browser (que usa a anon key, não a service-role).
