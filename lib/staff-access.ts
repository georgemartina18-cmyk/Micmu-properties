export type StaffAccount = {
  user_id: string;
  email: string;
  full_name: string;
  is_administrator: boolean;
  is_owner: boolean;
  is_access_manager?: boolean;
};

export type StaffAccessEvent = {
  id: number;
  actor_id: string | null;
  target_id: string;
  action: string;
  created_at: string;
};

// Owner-only fallback keeps existing owner access during the additive rollout.
export async function staffAccessPermission(
  db: import("@supabase/supabase-js").SupabaseClient,
) {
  const owner = await db.rpc("is_company_owner");
  const delegation = await db.rpc("can_manage_staff_access");
  const isOwner = !owner.error && owner.data === true;
  const delegationReady =
    !delegation.error && typeof delegation.data === "boolean";
  return {
    isOwner,
    delegationReady,
    allowed: delegationReady ? delegation.data === true : isOwner,
  };
}
