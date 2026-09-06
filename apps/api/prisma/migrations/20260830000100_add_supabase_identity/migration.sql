-- Add the Supabase identity alongside Kinde so users can be linked and tested
-- before the old provider is disabled. Removing kindeId is a later cutover.
ALTER TABLE "User" ADD COLUMN "supabaseId" TEXT;

CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");
