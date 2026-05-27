-- 003_individual_slots.sql
-- Converte weeklySchedule de [{start,end}] (intervalos) para [HH:mm, ...] (slots individuais).
-- Idempotente: detecta se o primeiro elemento já é texto e pula.

DO $$
DECLARE
  rec RECORD;
  days TEXT[] := ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  d TEXT;
  ranges JSONB;
  new_day JSONB;
  range_item JSONB;
  start_min INT;
  end_min INT;
  m INT;
  hhmm TEXT;
  new_sched JSONB;
BEGIN
  FOR rec IN SELECT id, "weeklySchedule" FROM specialists LOOP
    IF rec."weeklySchedule" IS NULL THEN
      CONTINUE;
    END IF;

    -- Detectar formato: se algum dia tem elementos do tipo texto, já está migrado.
    BEGIN
      IF jsonb_typeof(rec."weeklySchedule"->'monday'->0) = 'string' THEN
        CONTINUE; -- já está no novo formato
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- ignora e tenta converter
    END;

    new_sched := '{}'::jsonb;
    FOREACH d IN ARRAY days LOOP
      ranges := COALESCE(rec."weeklySchedule"->d, '[]'::jsonb);
      new_day := '[]'::jsonb;
      FOR range_item IN SELECT * FROM jsonb_array_elements(ranges) LOOP
        IF jsonb_typeof(range_item) = 'string' THEN
          -- já é HH:mm
          new_day := new_day || to_jsonb(range_item #>> '{}');
          CONTINUE;
        END IF;
        start_min := (split_part(range_item->>'start', ':', 1))::INT * 60
                   + (split_part(range_item->>'start', ':', 2))::INT;
        end_min   := (split_part(range_item->>'end',   ':', 1))::INT * 60
                   + (split_part(range_item->>'end',   ':', 2))::INT;
        m := start_min;
        WHILE m + 30 <= end_min LOOP
          hhmm := lpad((m / 60)::TEXT, 2, '0') || ':' || lpad((m % 60)::TEXT, 2, '0');
          new_day := new_day || to_jsonb(hhmm);
          m := m + 30;
        END LOOP;
      END LOOP;
      new_sched := new_sched || jsonb_build_object(d, new_day);
    END LOOP;

    UPDATE specialists SET "weeklySchedule" = new_sched WHERE id = rec.id;
  END LOOP;
END$$;

-- Atualiza o DEFAULT da coluna para o novo formato
ALTER TABLE specialists ALTER COLUMN "weeklySchedule" SET DEFAULT '{
  "monday":    ["09:00","09:30","10:00","10:30","11:00","11:30","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"],
  "tuesday":   ["09:00","09:30","10:00","10:30","11:00","11:30","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"],
  "wednesday": ["09:00","09:30","10:00","10:30","11:00","11:30","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"],
  "thursday":  ["09:00","09:30","10:00","10:30","11:00","11:30","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"],
  "friday":    ["09:00","09:30","10:00","10:30","11:00","11:30","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"],
  "saturday":  ["09:00","09:30","10:00","10:30","11:00","11:30","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"],
  "sunday":    []
}'::jsonb;
