-- Add the enum in its own migration before using it in data backfill.
ALTER TYPE "ModuleKey" ADD VALUE 'ATTENDANCE';
