-- AlterTable: add optional endDate column to Medication
ALTER TABLE "Medication" ADD COLUMN "endDate" TIMESTAMP(3);
