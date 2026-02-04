export const sendGhostMessage = async (userId: string, targetChat: string, message: string, env: any) => {
  // 1. D1 se session uthao
  const { results } = await env.DB.prepare(
    "SELECT session_string FROM user_configs WHERE user_id = ? AND platform = 'telegram'"
  ).bind(userId).all();

  if (!results.length) return { error: "TELEGRAM_NOT_LINKED" };

  const session = results[0].session_string;

  // 2. MTProto Bridge ko command do
  const ghostRes = await fetch(`https://mtproto-bridge.ryden.workers.dev/execute`, {
    method: 'POST',
    body: JSON.stringify({
      session: session,
      action: 'SEND_MESSAGE',
      to: targetChat,
      text: message
    })
  });

  return await ghostRes.json();
};
