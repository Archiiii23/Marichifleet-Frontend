/**
 * Seed demo data helper - seeding is now fully handled by the MongoDB backend on startup.
 */
export async function seedDemoData(_tenantId?: string) {
  return { skipped: true as const };
}
