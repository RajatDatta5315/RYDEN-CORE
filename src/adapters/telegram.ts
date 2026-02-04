// src/adapters/telegram.ts

export const handleTelegramAction = async (userId: string, action: string, env: any, payload: any) => {
  const { apiId, apiHash, phone, code } = payload;

  if (action === "SEND_CODE") {
    // 1. Store the data so we know who is trying to login when the OTP comes back
    await env.DB.prepare(
      "INSERT INTO user_configs (user_id, platform, session_string) VALUES (?, 'telegram_pending', ?) ON CONFLICT (user_id, platform) DO UPDATE SET session_string = ?"
    ).bind(userId, JSON.stringify({ apiId, apiHash, phone }), JSON.stringify({ apiId, apiHash, phone })).run();

    // 2. Call the MTProto Bridge to trigger the official Telegram 5-digit code
    await fetch(`https://mtproto-bridge.ryden.workers.dev/send-code`, {
      method: 'POST',
      body: JSON.stringify({ apiId, apiHash, phone })
    });

    return { success: true, message: "OTP_SENT" };
  }

  if (action === "VERIFY_CODE") {
    // 3. Finalize Handshake: Send the OTP to the bridge to get the permanent Session String
    const verifyRes = await fetch(`https://mtproto-bridge.ryden.workers.dev/verify-code`, {
      method: 'POST',
      body: JSON.stringify({ apiId, apiHash, phone, code })
    });

    const result: any = await verifyRes.json();

    if (result.sessionString) {
      // 4. Save the permanent session to D1. Delete the 'pending' status.
      await env.DB.prepare(
        "UPDATE user_configs SET session_string = ?, platform = 'telegram' WHERE user_id = ? AND platform = 'telegram_pending'"
      ).bind(result.sessionString, userId).run();

      return { success: true, message: "TELEGRAM_FULLY_CONNECTED" };
    }

    return { error: "INVALID_OTP_CODE" };
  }

  return { error: "ACTION_NOT_FOUND" };
};
