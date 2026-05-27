# Alves Estética — Gerenciamento de Agenda pela Profissional

**Data:** 2026-05-26
**Branch:** `pedro/musing-montalcini-5f3dd3`

## Contexto

Hoje toda profissional aparece como disponível 09:00–17:30 todos os dias. Não há como a profissional bloquear domingo, fechar mais cedo numa quinta, ou marcar pausa de almoço. Esta entrega dá a ela um **horário semanal padrão** editável; o fluxo do cliente em `/agendar` passa a respeitar esse horário.

Fora do escopo desta entrega:
- Folgas em datas específicas (ex: feriado, férias)
- Bloquear horários pontuais num dia (ex: compromisso de amanhã 16:30)
- Abertura extra fora do padrão
- Admin editar a agenda das profissionais

Esses ficam pra evoluções futuras.

## Modelo de dados

Nova coluna em `specialists`:

```sql
ALTER TABLE specialists ADD COLUMN "weeklySchedule" JSONB NOT NULL DEFAULT '{
  "monday":    [{"start":"09:00","end":"17:30"}],
  "tuesday":   [{"start":"09:00","end":"17:30"}],
  "wednesday": [{"start":"09:00","end":"17:30"}],
  "thursday":  [{"start":"09:00","end":"17:30"}],
  "friday":    [{"start":"09:00","end":"17:30"}],
  "saturday":  [{"start":"09:00","end":"17:30"}],
  "sunday":    []
}'::jsonb;
```

- Cada dia é um array de `{start, end}` em "HH:mm".
- Array vazio = folga.
- Múltiplos intervalos = pausa entre eles (ex: `[{09-12},{14-18}]` = almoço bloqueado 12-14).
- O default cobre as profissionais existentes — comportamento atual menos o domingo.

Migração entregue como `supabase/migrations/002_weekly_schedule.sql` (idempotente: `IF NOT EXISTS` no ADD COLUMN).

## Tipos TypeScript

Em `src/types.ts`:

```ts
export type TimeRange = { start: string; end: string }; // "HH:mm"
export type WeekDay = 'monday'|'tuesday'|'wednesday'|'thursday'|'friday'|'saturday'|'sunday';
export type WeeklySchedule = Record<WeekDay, TimeRange[]>;

export interface Specialist {
  // ...existing fields
  weeklySchedule: WeeklySchedule;
}
```

Default factory em utils para uso no frontend (novo specialist, fallback):

```ts
export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = { ... default igual ao SQL ... };
```

## Backend

### Novo endpoint

`PUT /api/specialists/me/schedule` — `requireAuth`.

Body: `{ weeklySchedule: WeeklySchedule }`.

Validação (rejeita com 400 se falhar):
- Tem exatamente as 7 chaves esperadas.
- Cada intervalo tem `start` e `end` no formato `HH:mm` (regex `^([01]\d|2[0-3]):[0-5]\d$`).
- `end > start` em cada intervalo.
- Intervalos dentro de um mesmo dia não se sobrepõem (`ranges[i].end <= ranges[i+1].start` quando ordenados).

Atualiza apenas o `weeklySchedule` de `req.user.id`. Admin não pode editar agenda de outras profissionais por aqui (decisão de produto). O endpoint serve tanto admin (editando a própria) quanto profissional.

### Camada Supabase

Nova função em `supabase.ts`:
```ts
export async function updateSpecialistSchedule(
  id: string,
  weeklySchedule: WeeklySchedule
): Promise<{ data: Specialist | null; error: { code?: string; message: string } | null }>
```

Padrão `{data, error}` consistente com `upsertSpecialist`. Atualiza só a coluna `weeklySchedule`.

### Defesa em profundidade no POST /api/bookings

Adicionar verificação após a checagem de overlap atual: se o `(date, time)` da reserva cai **fora** de qualquer intervalo do `weeklySchedule[diaDaSemana]` da profissional escolhida, retornar 409 com `"Horário fora da agenda do profissional."`. Considera também a `totalDuration` — a reserva inteira tem que caber dentro de um único intervalo.

## Cliente (/agendar)

### `src/utils/timeSlots.ts`

Refatorar `generateDaySlots`:

**Hoje:**
```ts
generateDaySlots(dateISO: string): string[]  // sempre 09:00-17:30 a cada 30min
```

**Vai virar:**
```ts
generateDaySlots(dateISO: string, schedule: WeeklySchedule, slotMinutes = 30): string[]
```

Algoritmo:
1. Descobrir o dia da semana de `dateISO` (mapear para chave `'monday'`...).
2. Pegar `schedule[dia]`.
3. Pra cada intervalo, gerar slots de `slotMinutes` em `slotMinutes` cobrindo o range (último slot precisa ter `start + slotMinutes ≤ end`).
4. Retornar lista ordenada.

Função auxiliar `dayHasAnySlot(schedule, dateISO): boolean` derivada da mesma lógica.

### BookingFlow

- Passo 3 (carrossel de dias + slots): passar `selectedSpecialist.weeklySchedule` para `generateDaySlots`.
- Cards de data no carrossel:
  - Quando o dia tem zero slots (folga ou só intervalos passados): card desabilitado, badge "Folga" no lugar de "X horários".
  - Quando tem slots mas todos já passaram/ocupados: comportamento atual (slots aparecem como "Ocupado"/desabilitados).
- Mensagem de fallback se o dia selecionado não tem slots: "A profissional não atende neste dia."

### Fallback de schedule

Se um specialist vier sem `weeklySchedule` (banco antigo, dados de seed, modo memória), o cliente usa `DEFAULT_WEEKLY_SCHEDULE`. Backend também aplica o default no validador se a coluna vier `null`.

## Portal — UI da profissional

Nova aba na sidebar entre **Dashboard** e **Agenda**: **Minha Agenda** (só pra `roleType === 'professional'`, escondida do admin).

### Layout

- Header: "Minha Agenda Semanal" + texto curto "Defina os dias e horários em que você atende. Domingos e folgas ficam vazios."
- Botão sticky "**Salvar Agenda**" no topo direito, desabilitado quando não há alterações pendentes ou quando a validação falha. Badge "Alterações não salvas" aparece quando há diff vs servidor.
- Grid de 7 cards (Seg, Ter, Qua, Qui, Sex, Sáb, Dom):
  - Cada intervalo é uma linha com dois `<input type="time">` (start, end) e botão lixeira.
  - Card vazio mostra "Folga" centralizado.
  - Botões em cada card: "**+ Adicionar intervalo**" e "**Limpar dia (folga)**".

### Validação no frontend

Antes de habilitar "Salvar":
- `start < end` em cada intervalo.
- Sem sobreposição dentro do mesmo dia.
- HH:mm válido (o `<input type="time">` já garante).

Mostrar mensagens inline em vermelho em cada intervalo inválido.

### Submit

`PUT /api/specialists/me/schedule` com o `weeklySchedule` editado. Toast de sucesso/erro. Refresh do `currentSpec`.

## Admin — visão somente leitura

Na aba **Equipe** existente, dentro do card de cada profissional, adicionar uma seção pequena "Agenda" exibindo de forma compacta (1 linha por dia: `"Seg: 09:00-12:00, 14:00-18:00"`, `"Dom: Folga"`). Sem botões — admin que quiser modificar precisa pedir pra profissional. Mantém a decisão de "só a profissional gerencia a própria".

## Plano de verificação

1. Migração roda no Supabase sem erro; profissionais existentes recebem o default.
2. Login como profissional → aba "Minha Agenda" aparece, mostra default carregado.
3. Editar: tirar sábado (limpar dia), adicionar pausa 12-14 na segunda, salvar → toast OK, refresh persiste.
4. Tentar criar overlap (intervalo 10-12 e 11-13 no mesmo dia) → "Salvar" desabilitado, mensagem inline.
5. /agendar com a profissional editada: sábado vira "Folga" no carrossel; segunda 12:30 não aparece como slot.
6. Forçar booking inválido via API (curl POST /api/bookings com horário fora do schedule) → 409.
7. Login como admin → não vê "Minha Agenda"; vê resumo da agenda da equipe no card de cada profissional.
8. Profissional tentar `PUT /api/specialists/me/schedule` com payload malformado → 400 com mensagem clara.
