export function isAdmin(userId: string | undefined | null): boolean {
  if (!userId) return false;
  const adminUids = (process.env.NEXT_PUBLIC_ADMIN_UIDS || process.env.ADMIN_UIDS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  return adminUids.includes(userId);
}

export function requireAdmin(userId: string | undefined | null): void {
  if (!isAdmin(userId)) {
    throw new Error('Unauthorized: Admin access required');
  }
}
