// src/auth/keyManager.ts

// 1. Verify existing keys
export const verifyAppKey = async (appKey: string, env: any): Promise<boolean> => {
  const result = await env.DB.prepare(
    "SELECT clerk_id FROM user_keys WHERE app_key = ?"
  ).bind(appKey).first();
  return !!result;
};

// 2. Generate and Save new keys
export const generateUserKeys = async (clerkId: string, env: any) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(clerkId + Date.now().toString());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  const appKey = `rk_live_${clerkId.substring(0, 8)}_${Math.random().toString(36).substring(7)}`;
  const appSecret = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);

  await env.DB.prepare(
    "INSERT INTO user_keys (clerk_id, app_key, app_secret) VALUES (?, ?, ?) ON CONFLICT (clerk_id) DO UPDATE SET app_key = ?, app_secret = ?"
  ).bind(clerkId, appKey, appSecret, appKey, appSecret).run();

  return { app_key: appKey, app_secret: appSecret };
};
