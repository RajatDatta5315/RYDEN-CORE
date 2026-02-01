// src/adapters/x.ts (Strategic Version)
export async function xActions(request: Request, env: any) {
  const url = new URL(request.url);
  
  if (url.pathname === "/api/v1/x/automate") {
    // 1. BRAIN: Groq se trend uthao
    const trendSearch = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [{ role: "user", content: "Suggest 1 high-traffic keyword for AI tech tweets right now." }]
      })
    });
    const trendData: any = await trendSearch.json();
    const keyword = trendData.choices[0].message.content;

    // 2. ACTION: Like recent tweets with that keyword (Basic/Free tier limit check)
    // Note: Twitter Free tier has strict search limits, so we prioritize Posting.
    
    // 3. STRATEGIC POST
    const postResponse = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.X_BEARER_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: `Analysis complete: ${keyword} is the current focal point. #RYDEN_CORE` }),
    });

    return new Response(JSON.stringify(await postResponse.json()));
  }
}
