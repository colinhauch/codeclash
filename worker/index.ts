/**
 * CodeClash Worker
 * Serves the React app, handles API routes, and routes WebSocket
 * connections to the appropriate Durable Objects.
 */

export { LobbyDO } from "./lobby-do";
export { MatchDO } from "./match-do";

interface Env {
  RESULTS: KVNamespace;
  ASSETS: Fetcher;
  LOBBY: DurableObjectNamespace;
  MATCH: DurableObjectNamespace;
  ADMIN_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ----- WebSocket routes → Durable Objects -----

    if (url.pathname === "/ws/lobby" || url.pathname === "/ws/admin") {
      const tournamentId = url.searchParams.get("tournament") || "default";
      const lobbyId = env.LOBBY.idFromName(tournamentId);
      const lobby = env.LOBBY.get(lobbyId);

      // Forward the full path so LobbyDO can distinguish /ws/lobby vs /ws/admin
      return lobby.fetch(request);
    }

    if (url.pathname.startsWith("/ws/match/")) {
      const matchDOIdHex = url.pathname.split("/ws/match/")[1];
      if (!matchDOIdHex) {
        return new Response("Missing match ID", { status: 400 });
      }
      const matchId = env.MATCH.idFromString(matchDOIdHex);
      const matchDO = env.MATCH.get(matchId);
      return matchDO.fetch(request);
    }

    // ----- API Routes -----

    // Existing results endpoints (backward compatible)
    if (url.pathname === "/api/results") {
      return handleGetResults(env);
    }

    if (url.pathname === "/api/results/upload" && request.method === "POST") {
      return handleUploadResults(request, env);
    }

    // Tournament data endpoints
    if (url.pathname === "/api/tournament/current") {
      return handleGetCurrentTournament(env);
    }

    if (url.pathname.match(/^\/api\/tournament\/[^/]+\/standings$/)) {
      const id = url.pathname.split("/")[3];
      return handleGetTournamentStandings(env, id);
    }

    // Admin proxy endpoints
    if (url.pathname.startsWith("/api/admin/")) {
      return handleAdminProxy(request, env, url);
    }

    // Serve static assets (React app)
    return env.ASSETS.fetch(request);
  },
};

// =============================================================================
// Existing Results Handlers (unchanged)
// =============================================================================

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
    const data = (await request.json()) as { id?: string };
    const id = data.id || new Date().toISOString().split("T")[0];

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

// =============================================================================
// Tournament Data Handlers
// =============================================================================

async function handleGetCurrentTournament(env: Env): Promise<Response> {
  try {
    const tournamentId = await env.RESULTS.get("current-tournament");
    if (!tournamentId) {
      return Response.json({ error: "No active tournament" }, { status: 404 });
    }

    const meta = await env.RESULTS.get(`tournament:${tournamentId}:meta`);
    if (!meta) {
      return Response.json({ error: "Tournament not found" }, { status: 404 });
    }

    return Response.json(JSON.parse(meta), {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch {
    return Response.json({ error: "Failed to fetch tournament" }, { status: 500 });
  }
}

async function handleGetTournamentStandings(env: Env, tournamentId: string): Promise<Response> {
  try {
    const standings = await env.RESULTS.get(`tournament:${tournamentId}:standings`);
    if (!standings) {
      return Response.json({ error: "No standings found" }, { status: 404 });
    }

    return Response.json(JSON.parse(standings), {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch {
    return Response.json({ error: "Failed to fetch standings" }, { status: 500 });
  }
}

// =============================================================================
// Admin Proxy (HTTP → LobbyDO)
// =============================================================================

async function handleAdminProxy(request: Request, env: Env, url: URL): Promise<Response> {
  const token = request.headers.get("X-Admin-Token");
  if (token !== env.ADMIN_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const tournamentId = url.searchParams.get("tournament") || "default";
  const lobbyId = env.LOBBY.idFromName(tournamentId);
  const lobby = env.LOBBY.get(lobbyId);

  const subpath = url.pathname.replace("/api/admin", "/admin");
  return lobby.fetch(new Request(`https://internal${subpath}`, {
    method: request.method,
    headers: request.headers,
    body: request.method !== "GET" ? request.body : undefined,
  }));
}
