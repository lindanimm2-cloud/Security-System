-- Vehicle emergency situation labels (stolen, hijacking, accident, …)
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "emergency_status" TEXT;
