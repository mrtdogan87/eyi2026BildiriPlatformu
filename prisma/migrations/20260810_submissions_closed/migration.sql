-- Add manual on/off switch that stops new paper submissions
ALTER TABLE "Congress" ADD COLUMN "submissionsClosed" BOOLEAN NOT NULL DEFAULT false;
