// src/auth/keyManager.ts

export async function verifyAppKey(key: string, env: any) {
  // Verification logic with Neon can go here
  return key.startsWith("rk_live_");
}

export async function createKey(request: Request, env: any) {
  const rawKey = `rk_live_${crypto.randomUUID().replace(/-/g, '')}`;
  return new Response(JSON.stringify({ key: rawKey }));
}
