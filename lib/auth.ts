import { hasSecondFactor } from "./assurance";
import { redirect } from "next/navigation";
import { database } from "./supabase";
export async function requireUser() {
  const db = await database();
  if (!db) redirect("/login?notice=unconfigured");
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  return { db, user };
}
export async function requireAdmin() {
  const { db, user } = await requireUser();
  const { data } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) redirect("/dashboard");
  if (!(await hasSecondFactor(db))) redirect("/dashboard/security");
  return { db, user };
}
