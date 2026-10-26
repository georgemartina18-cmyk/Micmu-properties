import type { SupabaseClient } from "@supabase/supabase-js";
export async function hasSecondFactor(db: SupabaseClient) {
  const { data, error } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  return !error && data?.currentLevel === "aal2";
}
