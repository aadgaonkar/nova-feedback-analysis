export interface Env {
  API: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> };
}

export default {
  async scheduled(event: any, env: Env, ctx: any) {
    console.log("✅ Cron triggered:", event?.cron);

    ctx.waitUntil(runDailyJob(env));
  },
};

async function runDailyJob(env: Env) {
  try {
    // call main worker through service binding
    const res = await env.API.fetch("https://internal/api/summary");

    console.log("📡 API status:", res.status);

    const text = await res.text();
    console.log("📊 Summary (first 500 chars):");
    console.log(text.slice(0, 500));

    if (!res.ok) {
      console.error("❌ Failed to fetch summary");
      return;
    }

    console.log("✅ Cron worker finished");
  } catch (err) {
    console.error("🔥 Cron worker error:", err);
  }
}
