-- Normalize patients where the full name was stored in the "name" field
-- and "surnames" is NULL. Splits on the first space:
--   "Juan Pérez Ruiz" → name="Juan", surnames="Pérez Ruiz"
-- Patients with a single-word name and no surnames are left untouched.
UPDATE "Patient"
SET
  "surnames" = TRIM(SUBSTRING("name" FROM POSITION(' ' IN "name") + 1)),
  "name"     = SPLIT_PART("name", ' ', 1)
WHERE
  "surnames" IS NULL
  AND "name" LIKE '% %';
