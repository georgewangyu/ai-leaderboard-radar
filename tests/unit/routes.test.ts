import { afterEach, describe, expect, test, vi } from "vitest";
import { POST as postLead } from "@/app/api/leads/route";
import { POST as postSubmit } from "@/app/api/submit/route";

const submission = {
  submissionType: "submit-company",
  visibility: "public",
  title: "Acme AI",
  outcome: "Crossed 10M ARR with a team of 8.",
};

function jsonRequest(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://radar.example${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/submit", () => {
  test("creates a GitHub issue in the public repo and returns its number", async () => {
    vi.stubEnv("GITHUB_TOKEN", "token");
    vi.stubEnv("GITHUB_OWNER", "owner");
    vi.stubEnv("GITHUB_REPO", "public-repo");
    const fetchMock = stubFetch(
      Response.json({ number: 7, html_url: "https://github.com/owner/public-repo/issues/7" }),
    );

    const response = await postSubmit(jsonRequest("/api/submit", submission));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      issueNumber: 7,
      issueUrl: "https://github.com/owner/public-repo/issues/7",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.github.com/repos/owner/public-repo/issues");
    expect(init.headers.Authorization).toBe("Bearer token");
    expect(JSON.parse(init.body).labels).toContain("visibility:public");
  });

  test("private submissions go to the private repo", async () => {
    vi.stubEnv("GITHUB_TOKEN", "token");
    vi.stubEnv("GITHUB_OWNER", "owner");
    vi.stubEnv("GITHUB_PRIVATE_REPO", "private-repo");
    const fetchMock = stubFetch(Response.json({ number: 1, html_url: "u" }));

    await postSubmit(jsonRequest("/api/submit", { ...submission, visibility: "private" }));

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.github.com/repos/owner/private-repo/issues",
    );
  });

  test.each([
    ["a filled honeypot", { ...submission, website: "bot" }],
    ["a too-short company name", { ...submission, title: "x" }],
    ["an unknown submission type", { ...submission, submissionType: "hack" }],
    ["malformed json", "{not json"],
  ])("rejects %s with 400 and never calls GitHub", async (_label, body) => {
    const fetchMock = stubFetch(Response.json({}));

    const response = await postSubmit(jsonRequest("/api/submit", body));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Invalid submission.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a configured origin rejects other origins but allows a missing Origin header", async () => {
    vi.stubEnv("AI_LEADERBOARD_REQUEST_ALLOWED_ORIGIN", "https://radar.example");
    const fetchMock = stubFetch(Response.json({}));

    const foreign = await postSubmit(
      jsonRequest("/api/submit", submission, { Origin: "https://evil.example" }),
    );
    const noOrigin = await postSubmit(jsonRequest("/api/submit", { ...submission, title: "x" }));

    expect(foreign.status).toBe(403);
    expect(noOrigin.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a GitHub failure returns a generic 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("GITHUB_TOKEN", "token");
    vi.stubEnv("GITHUB_OWNER", "owner");
    vi.stubEnv("GITHUB_REPO", "public-repo");
    stubFetch(new Response("boom", { status: 502 }));

    const response = await postSubmit(jsonRequest("/api/submit", submission));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Could not create leaderboard submission." });
  });
});

describe("POST /api/leads", () => {
  test("upserts the lead into Supabase with consent and request metadata", async () => {
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co/");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    const fetchMock = stubFetch(new Response(null, { status: 201 }));

    const response = await postLead(
      jsonRequest(
        "/api/leads",
        { email: " Reader@Example.com ", name: " Ada " },
        { Referer: "https://radar.example/", "User-Agent": "test-agent" },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://project.supabase.co/rest/v1/radar_leads?on_conflict=product,email",
    );
    expect(init.headers.Prefer).toBe("resolution=merge-duplicates");
    expect(JSON.parse(init.body)).toMatchObject({
      email: "reader@example.com",
      name: "Ada",
      product: "ai-leaderboard-radar",
      source: "website-install-gate",
      consent_updates: true,
      install_command_revealed: true,
      repo_url: "https://github.com/georgewangyu/ai-leaderboard-radar",
      referrer: "https://radar.example/",
      user_agent: "test-agent",
    });
  });

  test.each([
    ["a filled honeypot", { email: "a@b.co", name: "Ada", website: "bot" }],
    ["an invalid email", { email: "nope", name: "Ada" }],
    ["a missing name", { email: "a@b.co" }],
  ])("rejects %s with 400 and never calls Supabase", async (_label, body) => {
    const fetchMock = stubFetch(new Response(null));

    const response = await postLead(jsonRequest("/api/leads", body));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Invalid lead.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("missing Supabase config returns a generic 500", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const fetchMock = stubFetch(new Response(null));

    const response = await postLead(jsonRequest("/api/leads", { email: "a@b.co", name: "Ada" }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Could not save lead." });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
