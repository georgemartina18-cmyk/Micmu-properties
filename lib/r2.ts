import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { R2Bucket } from "@cloudflare/workers-types";
export async function mediaBucket(): Promise<R2Bucket | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env as unknown as { MICMU_MEDIA?: R2Bucket }).MICMU_MEDIA || null;
  } catch {
    return null;
  }
}
