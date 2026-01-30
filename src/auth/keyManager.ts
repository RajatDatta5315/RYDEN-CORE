export async function createKey(request: Request, env: any) {
  const { clerk_id } = await request.json();
  const rawKey = `RYDEN_${crypto.randomUUID().replace(/-/g, '').toUpperCase()}`;
  
  // SHA-256 Hashing for security
  const msgUint8 = new TextEncoder().encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  // Store Hash in Neon DB (Link to user)
  // [DB Logic Here]

  return new Response(JSON.stringify({ key: rawKey })); // Show user only once
}
