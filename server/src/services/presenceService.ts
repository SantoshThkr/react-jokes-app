/**
 * Tracks which users currently have a live dashboard connection. Kept in
 * process memory because the API runs as a single instance; scaling out would
 * mean moving this (and Socket.IO fan-out) to a shared adapter.
 */
const connectionsByUser = new Map<string, number>();

/** Returns true when this is the user's first open connection. */
export function trackConnection(userId: string): boolean {
  const count = connectionsByUser.get(userId) ?? 0;
  connectionsByUser.set(userId, count + 1);
  return count === 0;
}

/** Returns true when the user's last open connection has closed. */
export function releaseConnection(userId: string): boolean {
  const count = connectionsByUser.get(userId) ?? 0;
  if (count <= 1) {
    connectionsByUser.delete(userId);
    return count === 1;
  }
  connectionsByUser.set(userId, count - 1);
  return false;
}

export function countActiveUsers(): number {
  return connectionsByUser.size;
}

/** Test helper. */
export function resetPresence(): void {
  connectionsByUser.clear();
}
