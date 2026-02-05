// src/adapters/telegram.ts

export const handleTelegramAction = async (userId: string, action: string, env: any, payload: any) => {
  const { apiId, apiHash, phone, code, to, text } = payload;

  // 1. SEND OTP
  if (action === "SEND_CODE") {
    await env.DB.prepare(
      "INSERT INTO user_configs (user_id, platform, session_string) VALUES (?, 'telegram_pending', ?) ON CONFLICT (user_id, platform) DO UPDATE SET session_string = ?"
    ).bind(userId, JSON.stringify({ apiId, apiHash, phone }), JSON.stringify({ apiId, apiHash, phone })).run();

    await fetch(`https://mtproto-bridge.ryden.workers.dev/send-code`, {
      method: 'POST',
      body: JSON.stringify({ apiId, apiHash, phone })
    });
    return { success: true, message: "OTP_SENT" };
  }

  // 2. VERIFY OTP
  if (action === "VERIFY_CODE") {
    const verifyRes = await fetch(`https://mtproto-bridge.ryden.workers.dev/verify-code`, {
      method: 'POST',
      body: JSON.stringify({ apiId, apiHash, phone, code })
    });
    const result: any = await verifyRes.json();

    if (result.sessionString) {
      await env.DB.prepare(
        "UPDATE user_configs SET session_string = ?, platform = 'telegram' WHERE user_id = ? AND platform = 'telegram_pending'"
      ).bind(result.sessionString, userId).run();
      return { success: true, message: "CONNECTED" };
    }
    return { error: "INVALID_OTP" };
  }

  // 3. GHOST SEND MESSAGE (Used by 3rd Repo)
  if (action === "SEND_MESSAGE") {
    const config = await env.DB.prepare(
      "SELECT session_string FROM user_configs WHERE user_id = ? AND platform = 'telegram'"
    ).bind(userId).first();

    if (!config) return { error: "NOT_CONNECTED" };

    // 🤖 AI BRAIN INTEGRATION (If text is not provided, AI will generate it)
    let finalMsg = text;
    if (!text) {
        const aiPrompt = "Write a short, viral promotion message for RYDEN OS, an AI automation tool. Use emojis and a tech-noir vibe.";
        // Simple call to OpenRouter (Gemini)
        const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${env.OPENROUTER_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: env.OPENROUTER_MODEL, messages: [{ role: "user", content: aiPrompt }] })
        });
        const aiData: any = await aiRes.json();
        finalMsg = aiData.choices[0].message.content;
    }

    const bridgeRes = await fetch(`https://mtproto-bridge.ryden.workers.dev/execute`, {
      method: 'POST',
      body: JSON.stringify({
        session: config.session_string,
        action: 'SEND',
        to: to || "@RydenUpdates", // Default channel if none provided
        text: finalMsg
      })
    });
    return await bridgeRes.json();
  }

  return { error: "ACTION_NOT_FOUND" };
};
