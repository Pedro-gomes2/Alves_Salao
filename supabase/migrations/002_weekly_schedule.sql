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
