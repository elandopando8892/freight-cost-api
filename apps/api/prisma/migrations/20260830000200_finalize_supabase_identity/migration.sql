-- Finalize the identity cutover only after every existing FCM user has been
-- reconciled to a permanent Supabase Auth subject. This migration deliberately
-- aborts before changing the schema when an unlinked user remains.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User"
    WHERE "supabaseId" IS NULL OR btrim("supabaseId") = ''
  ) THEN
    RAISE EXCEPTION 'Supabase Auth cutover blocked: User rows without supabaseId remain';
  END IF;
END
$$;

ALTER TABLE "User" ALTER COLUMN "supabaseId" SET NOT NULL;
DROP INDEX IF EXISTS "User_kindeId_key";
ALTER TABLE "User" DROP COLUMN "kindeId";

COMMIT;
