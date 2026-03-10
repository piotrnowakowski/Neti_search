import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE_URL = (process.env.NETI_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");

type RouteContext = {
  params: Promise<{ path: string[] }> | { path: string[] };
};

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const resolved = await context.params;
  const path = resolved.path.join("/");
  const targetUrl = new URL(`${API_BASE_URL}/${path}`);
  const incomingUrl = new URL(request.url);
  targetUrl.search = incomingUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

    const payload = await response.text();
    return new Response(payload, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reach the local backend.";
    return Response.json({ detail: message }, { status: 503 });
  }
}

export {
  proxyRequest as DELETE,
  proxyRequest as GET,
  proxyRequest as PATCH,
  proxyRequest as POST,
  proxyRequest as PUT,
};
