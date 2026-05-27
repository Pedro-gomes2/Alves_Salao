# Agenda do Profissional Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada profissional define seu horário semanal padrão (múltiplos intervalos por dia). `/agendar` respeita esse horário; portal tem aba "Minha Agenda" só pra ela; admin vê a agenda das colegas em modo leitura.

**Architecture:** Coluna JSONB `weeklySchedule` em `specialists`. Endpoint `PUT /api/specialists/me/schedule` com validação. `generateDaySlots` refatorado pra receber o schedule. Defesa em profundidade em `POST /api/bookings`. UI nova: aba "Minha Agenda" e bloco read-only na aba Equipe.

**Tech Stack:** Postgres/Supabase, Express, React, lucide-react.

**Spec:** [docs/superpowers/specs/2026-05-26-agenda-profissional-design.md](../specs/2026-05-26-agenda-profissional-design.md)

---

## File Structure

**Novo:** `supabase/migrations/002_weekly_schedule.sql`

**Modificar:**
- `src/types.ts` — TimeRange/WeekDay/WeeklySchedule + campo em Specialist + default
- `src/data.ts` — INITIAL_SPECIALISTS ganham `weeklySchedule` no seed
- `src/utils/timeSlots.ts` — `generateDaySlots(date, schedule, slotMinutes?)`
- `server.ts` — novo endpoint + import + defesa em profundidade no POST bookings
- `supabase.ts` — `updateSpecialistSchedule(id, schedule)`
- `src/components/BookingFlow.tsx` — passar schedule pro generateDaySlots, badge "Folga"
- `src/components/PortalDashboard.tsx` — aba "Minha Agenda" (prof) + bloco read-only na aba Equipe

---

## Task 1: Migration + tipos + default schedule

**Files:**
- Create: `supabase/migrations/002_weekly_schedule.sql`
- Modify: `src/types.ts`
- Modify: `src/data.ts`

- [ ] **Step 1: Criar a migration**

```sql
-- 002_weekly_schedule.sql
-- Adiciona horário semanal padrão por profissional.

ALTER TABLE specialists
  ADD COLUMN IF NOT EXISTS "weeklySchedule" JSONB NOT NULL DEFAULT '{
    "monday":    [{"start":"09:00","end":"17:30"}],
    "tuesday":   [{"start":"09:00","end":"17:30"}],
    "wednesday": [{"start":"09:00","end":"17:30"}],
    "thursday":  [{"start":"09:00","end":"17:30"}],
    "friday":    [{"start":"09:00","end":"17:30"}],
    "saturday":  [{"start":"09:00","end":"17:30"}],
    "sunday":    []
  }'::jsonb;
```

(Idempotente via `IF NOT EXISTS`.)

- [ ] **Step 2: Adicionar tipos em `src/types.ts`**

No final do arquivo:

```ts
export type TimeRange = { start: string; end: string }; // "HH:mm"
export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type WeeklySchedule = Record<WeekDay, TimeRange[]>;

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  monday:    [{ start: '09:00', end: '17:30' }],
  tuesday:   [{ start: '09:00', end: '17:30' }],
  wednesday: [{ start: '09:00', end: '17:30' }],
  thursday:  [{ start: '09:00', end: '17:30' }],
  friday:    [{ start: '09:00', end: '17:30' }],
  saturday:  [{ start: '09:00', end: '17:30' }],
  sunday:    [],
};
```

Localizar a interface `Specialist` no mesmo arquivo e adicionar:

```ts
  weeklySchedule?: WeeklySchedule;
```

(Opcional na interface pra suportar dados antigos sem a coluna — o frontend faz fallback no DEFAULT.)

- [ ] **Step 3: Atualizar `src/data.ts`**

Cada item de `INITIAL_SPECIALISTS` ganha `weeklySchedule: DEFAULT_WEEKLY_SCHEDULE`. Importar `DEFAULT_WEEKLY_SCHEDULE` no topo do arquivo:

```ts
import { Specialist, Service, Booking, Transaction, DEFAULT_WEEKLY_SCHEDULE } from './types';
```

E adicionar `weeklySchedule: DEFAULT_WEEKLY_SCHEDULE` em cada specialist seed.

- [ ] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit
```

Zero erros.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/data.ts supabase/migrations/002_weekly_schedule.sql
git commit -m "feat(agenda): adicionar weeklySchedule (migration + tipos + default)"
```

---

## Task 2: Backend — endpoint `PUT /api/specialists/me/schedule` + validador

**Files:**
- Modify: `supabase.ts`
- Modify: `server.ts`

- [ ] **Step 1: Adicionar `updateSpecialistSchedule` em `supabase.ts`**

No final do arquivo, depois de `deleteSpecialist`:

```ts
export async function updateSpecialistSchedule(
  id: string,
  weeklySchedule: import('./src/types').WeeklySchedule
): Promise<{ data: Specialist | null; error: { code?: string; message: string } | null }> {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('specialists')
        .update({ weeklySchedule })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        console.warn('Supabase schedule update failed:', error);
        return { data: null, error: { code: (error as any).code, message: error.message } };
      }
      const idx = specialistsMem.findIndex(s => s.id === id);
      if (idx >= 0) specialistsMem[idx] = data as Specialist;
      return { data: data as Specialist, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e?.message || 'unknown error' } };
    }
  }
  const idx = specialistsMem.findIndex(s => s.id === id);
  if (idx < 0) return { data: null, error: { message: 'not found' } };
  specialistsMem[idx] = { ...specialistsMem[idx], weeklySchedule };
  return { data: specialistsMem[idx], error: null };
}
```

- [ ] **Step 2: Adicionar helper de validação no topo de `server.ts`** (após `tryAuth`):

```ts
const WEEK_KEYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateWeeklySchedule(input: any): { ok: true } | { ok: false; reason: string } {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'Payload inválido.' };
  for (const k of WEEK_KEYS) {
    if (!Array.isArray(input[k])) return { ok: false, reason: `Dia "${k}" inválido.` };
    const ranges = input[k] as Array<{ start: string; end: string }>;
    for (const r of ranges) {
      if (!r || !HHMM_RE.test(r.start) || !HHMM_RE.test(r.end)) {
        return { ok: false, reason: `Horário inválido em ${k}.` };
      }
      if (r.start >= r.end) return { ok: false, reason: `Fim deve ser após início em ${k}.` };
    }
    // overlap: ordena e checa
    const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].end > sorted[i + 1].start) {
        return { ok: false, reason: `Intervalos se sobrepõem em ${k}.` };
      }
    }
  }
  for (const k of Object.keys(input)) {
    if (!WEEK_KEYS.includes(k as any)) return { ok: false, reason: `Chave inesperada: ${k}.` };
  }
  return { ok: true };
}
```

- [ ] **Step 3: Adicionar `updateSpecialistSchedule` no import de `./supabase`** em `server.ts`.

- [ ] **Step 4: Adicionar o handler em `server.ts`** logo após `DELETE /api/specialists/:id`:

```ts
  app.put('/api/specialists/me/schedule', requireAuth, async (req: AuthedRequest, res) => {
    const { weeklySchedule } = req.body || {};
    const check = validateWeeklySchedule(weeklySchedule);
    if (!check.ok) return res.status(400).json({ error: check.reason });
    const { data, error } = await updateSpecialistSchedule(req.user!.id, weeklySchedule);
    if (error) {
      console.error('Failed to update schedule:', error);
      return res.status(500).json({ error: 'Não foi possível salvar a agenda.' });
    }
    if (!data) return res.status(404).json({ error: 'Profissional não encontrada.' });
    if ((data as any).passwordHash) delete (data as any).passwordHash;
    res.json(data);
  });
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add server.ts supabase.ts
git commit -m "feat(agenda): endpoint PUT /api/specialists/me/schedule com validacao"
```

---

## Task 3: Refatorar `generateDaySlots` para respeitar schedule

**Files:**
- Modify: `src/utils/timeSlots.ts`

- [ ] **Step 1: Ler o arquivo atual e ver assinatura corrente**

```bash
cat src/utils/timeSlots.ts
```

Identifique a assinatura atual de `generateDaySlots` e onde ela é chamada (Grep `generateDaySlots`).

- [ ] **Step 2: Refatorar a função**

Substituir a implementação atual de `generateDaySlots` por:

```ts
import { WeeklySchedule, WeekDay, DEFAULT_WEEKLY_SCHEDULE } from '../types';

const WEEK_KEY_BY_GETDAY: Record<number, WeekDay> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday',
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

export function generateDaySlots(
  dateISO: string,
  schedule: WeeklySchedule = DEFAULT_WEEKLY_SCHEDULE,
  slotMinutes = 30
): string[] {
  const d = new Date(dateISO + 'T00:00:00');
  const dayKey = WEEK_KEY_BY_GETDAY[d.getDay()];
  const ranges = schedule[dayKey] || [];
  const slots: string[] = [];
  for (const range of ranges) {
    const start = toMinutes(range.start);
    const end = toMinutes(range.end);
    for (let m = start; m + slotMinutes <= end; m += slotMinutes) {
      slots.push(toHHMM(m));
    }
  }
  return slots;
}

export function dayHasAnySlot(schedule: WeeklySchedule | undefined, dateISO: string): boolean {
  return generateDaySlots(dateISO, schedule ?? DEFAULT_WEEKLY_SCHEDULE).length > 0;
}
```

(Mantenha os outros exports do arquivo — `nextNDays`, `overlap`, `isSlotPast` etc. — intactos.)

- [ ] **Step 3: Atualizar callers**

Grep `generateDaySlots(` no projeto. Os callers vão precisar passar o schedule. Em `BookingFlow.tsx`, vai ser feito na Task 4. Por enquanto a assinatura nova tem default = `DEFAULT_WEEKLY_SCHEDULE` então não quebra os callers existentes.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/utils/timeSlots.ts
git commit -m "feat(agenda): generateDaySlots respeita weeklySchedule"
```

---

## Task 4: BookingFlow usa o schedule do profissional + badge Folga

**Files:**
- Modify: `src/components/BookingFlow.tsx`

- [ ] **Step 1: Localizar onde `generateDaySlots` é chamado**

Grep `generateDaySlots(` em `src/components/BookingFlow.tsx`.

- [ ] **Step 2: Passar o schedule do specialist selecionado**

Substituir cada chamada `generateDaySlots(dateISO)` por:

```ts
generateDaySlots(dateISO, selectedSpecialist?.weeklySchedule ?? DEFAULT_WEEKLY_SCHEDULE)
```

Importar `DEFAULT_WEEKLY_SCHEDULE` de `../types` se ainda não estiver importado.

- [ ] **Step 3: Badge "Folga" no carrossel de dias**

Localizar o render do carrossel de dias (passo 3 do fluxo) — cada card mostra o número de horários disponíveis. Trocar a contagem por algo do tipo:

```tsx
const slotsForDay = generateDaySlots(d.dateISO, selectedSpecialist?.weeklySchedule);
// ...
{slotsForDay.length === 0 ? (
  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500/90">Folga</span>
) : (
  <span className="...">{slotsForDay.length} horários</span>
)}
```

(Adapte ao markup atual — o objetivo é: quando o dia não tem nenhum slot, mostrar "Folga" e desabilitar o card.)

Cards com `slotsForDay.length === 0` ganham `disabled` + estilo opaco/cinza.

- [ ] **Step 4: Mensagem quando o dia selecionado não tem slots**

No bloco que renderiza os botões de horário, se `slots.length === 0`, mostrar uma mensagem amigável "A profissional não atende nesse dia." em vez do grid vazio.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/components/BookingFlow.tsx
git commit -m "feat(agenda): BookingFlow respeita schedule do profissional e mostra Folga"
```

---

## Task 5: Defesa em profundidade — `POST /api/bookings` valida schedule

**Files:**
- Modify: `server.ts`

- [ ] **Step 1: Adicionar verificação dentro do `POST /api/bookings`**

Localizar `POST /api/bookings` (linha onde tem `const conflict = existing.some(...)`). Depois do bloco de conflito de overlap, ANTES de `insertBooking`, adicionar:

```ts
    // Defense-in-depth: confirma que o horário cai no schedule do profissional
    const specs = await getSpecialists();
    const spec = specs.find(s => s.id === booking.specialistId);
    if (spec) {
      const schedule = spec.weeklySchedule;
      if (schedule) {
        const WEEK_KEY: Record<number, keyof typeof schedule> = {
          0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
          4: 'thursday', 5: 'friday', 6: 'saturday',
        };
        const dayKey = WEEK_KEY[new Date(booking.date + 'T00:00:00').getDay()];
        const ranges = (schedule as any)[dayKey] || [];
        const t2m2 = (hhmm: string) => {
          const [h, m] = hhmm.split(':').map(Number);
          return h * 60 + m;
        };
        const bs = t2m2(booking.time);
        const be = bs + (booking.totalDuration || 30);
        const fits = ranges.some((r: { start: string; end: string }) => {
          return t2m2(r.start) <= bs && be <= t2m2(r.end);
        });
        if (!fits) {
          return res.status(409).json({ error: 'Horário fora da agenda do profissional.' });
        }
      }
    }
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add server.ts
git commit -m "feat(agenda): POST /api/bookings valida schedule (defesa em profundidade)"
```

---

## Task 6: UI da profissional — aba "Minha Agenda"

**Files:**
- Modify: `src/components/PortalDashboard.tsx`

- [ ] **Step 1: Adicionar `'minha_agenda'` ao tipo `AdminTab`**

Localizar `type AdminTab = ...` (próximo do topo do componente). Adicionar a string:

```ts
type AdminTab = 'dashboard' | 'agenda' | 'minha_agenda' | 'equipe' | 'financeiro' | 'relatorio_detalhado' | 'nova_operacao' | 'config_especialist' | 'servicos' | 'config_servico';
```

- [ ] **Step 2: Estado da edição**

No topo do componente, junto aos outros `useState`:

```ts
  const [scheduleDraft, setScheduleDraft] = useState<WeeklySchedule | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
```

Quando `currentSpec` muda, inicializar o draft. Usar `useEffect`:

```ts
  useEffect(() => {
    if (currentSpec && !scheduleDraft) {
      setScheduleDraft(currentSpec.weeklySchedule ?? DEFAULT_WEEKLY_SCHEDULE);
    }
  }, [currentSpec]); // eslint-disable-line react-hooks/exhaustive-deps
```

Importar `WeeklySchedule`, `WeekDay`, `DEFAULT_WEEKLY_SCHEDULE` de `../types`.

- [ ] **Step 3: Helpers de validação local**

Junto aos outros helpers, adicionar:

```ts
  const isScheduleValid = (sched: WeeklySchedule | null): boolean => {
    if (!sched) return false;
    for (const k of Object.keys(sched) as WeekDay[]) {
      const ranges = sched[k];
      for (const r of ranges) {
        if (!r.start || !r.end || r.start >= r.end) return false;
      }
      const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].end > sorted[i + 1].start) return false;
      }
    }
    return true;
  };
```

- [ ] **Step 4: Botão "Minha Agenda" na sidebar (visível só pra profissional)**

Logo após o botão "Dashboard", e ANTES do "Agenda", adicionar:

```tsx
            {!isAdmin && (
              <button
                onClick={() => { setActiveTab('minha_agenda'); setIsDrawerOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm font-bold text-left transition-all ${
                  activeTab === 'minha_agenda'
                    ? 'bg-brand-primary-light/30 text-brand-primary'
                    : 'text-brand-tertiary hover:bg-[#faf9f8]'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Minha Agenda</span>
              </button>
            )}
```

(Reaproveita o ícone `Calendar`. Se conflitar com o ícone do botão "Agenda", troca aqui pra `Clock` ou outro disponível.)

- [ ] **Step 5: Render da view**

Antes do bloco `{activeTab === 'financeiro' && (...)}` adicionar uma nova view:

```tsx
          {activeTab === 'minha_agenda' && !isAdmin && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <span className="font-sans text-[11px] font-semibold text-brand-primary tracking-widest uppercase font-bold">Configuração</span>
                  <h2 className="font-display text-3xl text-brand-dark">Minha Agenda Semanal</h2>
                  <p className="text-brand-tertiary text-sm">Defina os dias e horários em que você atende. Domingos e folgas ficam vazios.</p>
                </div>
                <button
                  type="button"
                  disabled={!isScheduleValid(scheduleDraft) || scheduleSaving}
                  onClick={async () => {
                    if (!scheduleDraft) return;
                    setScheduleSaving(true);
                    try {
                      const res = await fetch('/api/specialists/me/schedule', {
                        method: 'PUT',
                        headers: authHeaders(),
                        body: JSON.stringify({ weeklySchedule: scheduleDraft }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (res.ok) {
                        onRefreshData();
                        showToast('Agenda salva!');
                      } else {
                        showToast(data.error || 'Erro ao salvar agenda.');
                      }
                    } catch (e) {
                      console.error(e);
                      showToast('Erro ao conectar com o servidor.');
                    } finally {
                      setScheduleSaving(false);
                    }
                  }}
                  className="bg-brand-primary text-white hover:bg-brand-primary-light hover:text-brand-primary py-3 px-6 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg disabled:opacity-50"
                >
                  {scheduleSaving ? 'Salvando...' : 'Salvar Agenda'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as WeekDay[]).map(dayKey => {
                  const labels: Record<WeekDay, string> = {
                    monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta',
                    thursday: 'Quinta', friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo',
                  };
                  const ranges = scheduleDraft?.[dayKey] ?? [];
                  return (
                    <div key={dayKey} className="bg-white border border-brand-primary-light/25 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-sans font-bold text-sm text-brand-dark">{labels[dayKey]}</h3>
                        {ranges.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setScheduleDraft(prev => prev ? { ...prev, [dayKey]: [] } : prev)}
                            className="text-[10px] text-brand-tertiary hover:text-rose-600"
                          >
                            Folga
                          </button>
                        )}
                      </div>
                      {ranges.length === 0 ? (
                        <p className="text-xs text-brand-tertiary italic mb-3">Folga</p>
                      ) : (
                        <div className="space-y-2 mb-3">
                          {ranges.map((r, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input
                                type="time"
                                value={r.start}
                                onChange={(e) => setScheduleDraft(prev => prev ? {
                                  ...prev,
                                  [dayKey]: prev[dayKey].map((x, j) => j === i ? { ...x, start: e.target.value } : x),
                                } : prev)}
                                className="bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-lg px-2 py-1 text-xs"
                              />
                              <span className="text-xs text-brand-tertiary">—</span>
                              <input
                                type="time"
                                value={r.end}
                                onChange={(e) => setScheduleDraft(prev => prev ? {
                                  ...prev,
                                  [dayKey]: prev[dayKey].map((x, j) => j === i ? { ...x, end: e.target.value } : x),
                                } : prev)}
                                className="bg-[#faf9f8] border border-[#d6c2c4]/50 rounded-lg px-2 py-1 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => setScheduleDraft(prev => prev ? {
                                  ...prev,
                                  [dayKey]: prev[dayKey].filter((_, j) => j !== i),
                                } : prev)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                title="Remover"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setScheduleDraft(prev => prev ? {
                          ...prev,
                          [dayKey]: [...prev[dayKey], { start: '09:00', end: '12:00' }],
                        } : prev)}
                        className="w-full text-xs text-brand-primary border border-dashed border-brand-primary-light/50 rounded-lg py-1.5 hover:bg-brand-primary-light/10"
                      >
                        + Adicionar intervalo
                      </button>
                    </div>
                  );
                })}
              </div>

              {scheduleDraft && !isScheduleValid(scheduleDraft) && (
                <p className="text-xs text-rose-600">Há intervalos inválidos (início ≥ fim, ou sobreposição). Corrija antes de salvar.</p>
              )}
            </div>
          )}
```

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/components/PortalDashboard.tsx
git commit -m "feat(agenda): aba Minha Agenda no portal do profissional"
```

---

## Task 7: Bloco read-only da agenda na aba Equipe (admin)

**Files:**
- Modify: `src/components/PortalDashboard.tsx`

- [ ] **Step 1: Helper de formatação**

No topo do componente (ou módulo) adicionar:

```ts
const DAY_SHORT: Record<string, string> = {
  monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua',
  thursday: 'Qui', friday: 'Sex', saturday: 'Sáb', sunday: 'Dom',
};

function formatScheduleShort(schedule: import('../types').WeeklySchedule | undefined): { day: string; text: string }[] {
  const order: import('../types').WeekDay[] = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const s = schedule;
  return order.map(k => {
    const label = DAY_SHORT[k];
    if (!s || !s[k] || s[k].length === 0) return { day: label, text: 'Folga' };
    return { day: label, text: s[k].map(r => `${r.start}-${r.end}`).join(', ') };
  });
}
```

- [ ] **Step 2: Mostrar dentro do card de cada profissional na aba Equipe**

Localizar o render do card de cada profissional na view `activeTab === 'equipe'`. Em algum lugar visível (abaixo do nome/foto, antes dos botões de ação), adicionar:

```tsx
                  <div className="mt-3 border-t border-brand-primary-light/15 pt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-tertiary">Agenda</span>
                    <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                      {formatScheduleShort(spec.weeklySchedule).map(row => (
                        <div key={row.day} className="flex items-baseline gap-2 text-[11px]">
                          <span className="font-bold text-brand-primary w-7">{row.day}:</span>
                          <span className={row.text === 'Folga' ? 'text-brand-tertiary italic' : 'text-brand-dark'}>{row.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
```

(Adapte `spec` ao nome da variável usada no `.map` do array `specialists` nessa view.)

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/PortalDashboard.tsx
git commit -m "feat(agenda): admin ve resumo da agenda de cada profissional na aba Equipe"
```

---

## Task 8: Verificação final

- [ ] **Step 1: Build limpo**

```bash
npx tsc --noEmit && npm run build
```

Esperado: zero erros, build ok.

- [ ] **Step 2: Rodar a migration no Supabase**

Manual: abrir o painel do Supabase → SQL Editor → executar `supabase/migrations/002_weekly_schedule.sql`. Confirmar que `specialists` agora tem a coluna `weeklySchedule` populada com o default.

- [ ] **Step 3: Smoke tests**

1. Login profissional → aba "Minha Agenda" aparece com default carregado.
2. Editar (limpar sábado, adicionar pausa 12-14 em segunda) → Salvar → toast OK → F5 mantém.
3. Validação: dois intervalos sobrepostos → botão Salvar desabilitado + texto vermelho.
4. /agendar com essa profissional: sábado vira "Folga" no carrossel; segunda às 12:30 não aparece nos slots.
5. Tentar via curl `POST /api/bookings` com horário fora do schedule → 409 com "Horário fora da agenda do profissional."
6. Login admin → não vê "Minha Agenda" na sidebar; ve resumo da agenda no card de cada profissional na aba Equipe.
7. Profissional tentar PUT com payload malformado (ex: `{"monday":"foo"}`) via curl → 400 com mensagem.
