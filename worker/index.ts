/**
 * CodeClash Worker
 * Serves the React app and handles API routes
 */

interface Env {
  RESULTS: KVNamespace;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API Routes
    if (url.pathname === "/api/results") {
      return handleGetResults(env);
    }

    if (url.pathname === "/api/results/upload" && request.method === "POST") {
      return handleUploadResults(request, env);
    }

    // Serve static assets (React app)
    // The Cloudflare Vite plugin handles this automatically
    return env.ASSETS.fetch(request);
  },
};

async function handleGetResults(env: Env): Promise<Response> {
  try {
    const results = await env.RESULTS.get("latest");

    if (!results) {
      return Response.json(
        { error: "No tournament results available yet" },
        { status: 404 }
      );
    }

    return Response.json(JSON.parse(results), {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (err) {
    return Response.json(
      { error: "Failed to fetch results" },
      { status: 500 }
    );
  }
}

async function handleUploadResults(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const data = await request.json();
    const id = data.id || new Date().toISOString().split("T")[0];

    // Store both "latest" and dated version
    await env.RESULTS.put("latest", JSON.stringify(data));
    await env.RESULTS.put(id, JSON.stringify(data));

    return Response.json({ success: true, id });
  } catch (err) {
    return Response.json(
      { error: "Failed to upload results" },
      { status: 400 }
    );
  }
}
