-- Expand install workflow to match technician field app stages
ALTER TYPE "InstallJobStatus" ADD VALUE IF NOT EXISTS 'ARRIVED';
ALTER TYPE "InstallJobStatus" ADD VALUE IF NOT EXISTS 'SITE_CHECK';
ALTER TYPE "InstallJobStatus" ADD VALUE IF NOT EXISTS 'INSTALL';
ALTER TYPE "InstallJobStatus" ADD VALUE IF NOT EXISTS 'TESTING';
ALTER TYPE "InstallJobStatus" ADD VALUE IF NOT EXISTS 'CLIENT_APPROVAL';

ALTER TABLE "install_jobs" ADD COLUMN IF NOT EXISTS "serial" TEXT;
ALTER TABLE "install_jobs" ADD COLUMN IF NOT EXISTS "checklist" JSONB;
ALTER TABLE "install_jobs" ADD COLUMN IF NOT EXISTS "override_reason" TEXT;
