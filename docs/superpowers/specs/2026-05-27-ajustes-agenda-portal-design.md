# Ajustes — Agenda por slots, data dinâmica, WhatsApp e propagação ao cliente

**Data:** 2026-05-27
**Branch:** `pedro/musing-montalcini-5f3dd3`

## Contexto

Lista de ajustes pedidos pelo usuário após o primeiro round:

1. **Data/hora hardcoded.** O portal usa `todayStr = '2026-05-22'` em vários lugares — todas as métricas e o filtro "Este mês" partem desse valor fixo, então parece "congelado no tempo". Trocar pra `new Date()` real.
2. **Schedule não chega no /agendar.** A profissional salva agenda nova, mas o cliente que já tem `/agendar` aberto continua vendo a agenda antiga (specialists só carrega na montagem). Refetch automático quando o cliente avança no fluxo de booking.
3. **Modelo de agenda: slots individuais.** Trocar o modelo atual `Record<WeekDay, TimeRange[]>` (intervalos com início/fim) por `Record<WeekDay, string[]>` (lista de horários liberados). Profissional clica nos slots de 30min que ela libera; cada dia tem zero ou mais slots; mesmos slots valem pra qualquer serviço (a duração do serviço continua bloqueando slots subsequentes via conflito).
4. **WhatsApp do salão fora da visão do profissional.** O bloco de configuração do WhatsApp aparece no Dashboard pra todos hoje — só admin deve ver/editar.
5. **Confirmar:** valores dos atendimentos aparecem no Financeiro do profissional. Já funciona em código (`transactions.specialistId` é setado quando o admin finaliza um booking, e `GET /api/transactions` filtra por specialistId pra profissional). Sem mudança necessária — só validar no smoke test.
6. **Confirmar:** Profissional só vê própria agenda e não pode editar Gestão de Equipe. Já funciona — Agenda backend filtra por specialistId, e a aba Equipe está dentro de `isAdmin && ...`. Sem mudança necessária.

## Mudanças

### Modelo de dados — slots individuais

Mudar o tipo `WeeklySchedule` em `src/types.ts`:

```ts
// Antes: Record<WeekDay, TimeRange[]> (intervalos)
// Depois:
export type WeeklySchedule = Record<WeekDay, string[]>; // ex: { monday: ["09:00","09:30","10:00"], ... }
```

`TimeRange` deixa de ser usado pra schedule (mantém o type exportado caso outros lugares usem).

`DEFAULT_WEEKLY_SCHEDULE` vira:

```ts
export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  monday:    ['09:00','09:30','10:00','10:30','11:00','11:30','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'],
  tuesday:   [...mesma lista],
  wednesday: [...],
  thursday:  [...],
  friday:    [...],
  saturday:  [...],
  sunday:    [],
};
```

(Seg-sáb 09:00-17:30 a cada 30min, com pausa default 12:00-13:30 — preserva o que existia. Domingo folga.)

### Migration SQL

`supabase/migrations/003_individual_slots.sql`:

- Converte o JSON `weeklySchedule` de cada specialist do formato `[{start,end}]` pra `[ "HH:mm", ... ]`, expandindo cada intervalo em slots de 30min.
- Idempotente: detecta se o primeiro elemento já é string (já migrado) e pula.

Implementação com função PL/pgSQL anônima (`DO $$ ... $$`) iterando por linha.

### Backend — validador atualizado

Em `server.ts`, `validateWeeklySchedule` passa a aceitar `Record<WeekDay, string[]>`:

- Cada chave (`monday`..`sunday`) é array.
- Cada elemento é string `HH:mm` válida.
- Sem duplicatas dentro do mesmo dia.

`updateSpecialistSchedule` em `supabase.ts` não muda — só o tipo do parâmetro.

A defesa em profundidade no `POST /api/bookings` muda: em vez de checar se o `(time, time+duration)` cabe num intervalo, agora checa se **todos** os slots cobertos pela duração estão liberados. Ex: serviço de 60min começando 10:00 exige que `["10:00","10:30"]` estejam em `weeklySchedule[diaDaSemana]`.

### `generateDaySlots` simplificado

Em `src/utils/timeSlots.ts`:

```ts
export function generateDaySlots(
  dateISO: string,
  schedule: WeeklySchedule = DEFAULT_WEEKLY_SCHEDULE
): string[] {
  const d = new Date(dateISO + 'T00:00:00');
  const dayKey = WEEK_KEY_BY_GETDAY[d.getDay()];
  return [...(schedule[dayKey] || [])].sort();
}
```

(Trivial: retorna direto a lista do dia. Ordenado por segurança.)

### UI — Minha Agenda (PortalDashboard)

Reescrever a view `activeTab === 'minha_agenda'`:

- 7 cards (Seg..Dom).
- Cada card mostra um **grid de toggle buttons** com todos os slots possíveis de 06:00 a 21:00 em 30min (30 slots). Slot **selecionado** = liberado (verde/preenchido). Slot não selecionado = cinza/outline.
- Botões em cada card:
  - **Selecionar todos** (marca todos os 30 slots).
  - **Folga** (limpa todos).
  - **Replicar p/ semana inteira** (copia a seleção atual desse dia pra todos os outros — útil pra montagem rápida).
- Botão **Salvar Agenda** continua no topo.
- Validação local: nenhum slot duplicado; HH:mm sempre válido (vem de constante). Sem necessidade de mostrar "intervalos inválidos".

### Cliente — propagação automática

Em `App.tsx` (ou onde `fetchData` mora), expor uma forma do `BookingFlow` chamar `onRefreshData` quando o cliente entra no passo 3 (escolha de data/horário). Garantir que slots e weeklySchedule sejam frescos.

Implementação mínima: `BookingFlow` recebe `onRefreshData` como prop opcional e chama uma vez quando `selectedSpecialist` muda (ou ao entrar no passo 3). App.tsx já expõe `fetchData` — passar como `onRefreshData`.

### Data dinâmica

Em `PortalDashboard.tsx`, trocar:

```ts
const todayStr = '2026-05-22'; // Default mocked system date
```

Por:

```ts
const todayStr = new Date().toISOString().slice(0, 10);
```

Conferir que outras referências (filtros, métricas) usam `todayStr` — não há outros hardcoded.

### Esconder WhatsApp do profissional

Envolver o bloco "Configuration of Salon WhatsApp" (linhas ~928-951) em `{isAdmin && (...)}`. Profissional não vê nem edita.

### Sem mudança

- `GET /api/transactions` continua filtrando por specialistId pra profissional → valores dos atendimentos finalizados aparecem no "Meu Financeiro".
- Aba Equipe continua restrita a admin.
- `GET /api/bookings` continua filtrando por specialistId.

## Plano de verificação

1. Migration 003 roda no Supabase, dados existentes ficam com listas de strings.
2. Profissional abre Minha Agenda → cards mostram slots em grid; default carregado.
3. Selecionar/desmarcar slots, "Replicar pra semana inteira" → Salvar → toast OK → F5 mantém.
4. Cliente em /agendar com a profissional editada: dias sem slots viram "Folga"; horários que ela tirou somem dos botões.
5. Profissional muda agenda enquanto cliente está com `/agendar` aberto → cliente avança/volta no fluxo → vê os novos horários.
6. Dashboard: data dinâmica reflete hoje; "Este mês" filtra o mês corrente.
7. Profissional logada não vê o bloco WhatsApp no Dashboard.
8. Admin finaliza atendimento → transação criada → profissional vê no "Meu Financeiro".
9. Profissional logada não consegue acessar aba Equipe (não aparece na sidebar).
