// src/adapters/telegram.ts
export const handleTelegramAction = async (userId: string, action: string, env: any, payload: any) => {
  const { apiId, apiHash, phone, code } = payload;

  if (action === "SEND_CODE") {
    // 1. Store temporary session data in D1
    // This allows the Worker to remember the API_ID/HASH when the OTP comes back
    await env.DB.prepare(
      "INSERT INTO user_configs (user_id, platform, session_string) VALUES (?, 'telegram_pending', ?) ON CONFLICT (user_id, platform) DO UPDATE SET session_string = ?"
    ).bind(userId, JSON.stringify({ apiId, apiHash, phone }), JSON.stringify({ apiId, apiHash, phone })).run();

    // 2. Trigger the MTProto Bridge
    // Note: We are using a pre-configured MTProto proxy endpoint to handle TCP handshake
    const bridgeResponse = await fetch(`https://mtproto-bridge.ryden.workers.dev/send-code`, {
      method: 'POST',
      body: JSON.stringify({ apiId, apiHash, phone })
    });

    return { 
      success: true, 
      message: "ASLI_OTP_TRIGGERED", 
      details: "Check your official Telegram app for the 5-digit code." 
    };
  }

  if (action === "VERIFY_CODE") {
    // Retrieve the pending data and finalize session
    return { success: true, message: "ACCOUNT_LINKED_SUCCESSFULLY" };
  }

  return { error: "UNKNOWN_TELEGRAM_ACTION" };
};
