import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BACKEND_BASE_URL =
  process.env.INTERNAL_API_BASE_URL ?? "http://localhost:3001";

const buildTargetUrl = (request: NextRequest) => {
  const { pathname, search } = request.nextUrl;
  const proxyPath = pathname.replace(/^\/api\/proxy/, "") || "/";
  return `${BACKEND_BASE_URL}${proxyPath}${search}`;
};

const buildHeaders = (request: NextRequest) => {
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  return headers;
};

const forward = async (request: NextRequest) => {
  const targetUrl = buildTargetUrl(request);
  const headers = buildHeaders(request);
  const method = request.method.toUpperCase();

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
    redirect: "manual",
  };

  if (method !== "GET" && method !== "HEAD") {
    const body = await request.text();
    if (body.length > 0) {
      init.body = body;
    }
  }

  try {
    const response = await fetch(targetUrl, init);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(
      `Failed to proxy request to ${targetUrl}:`,
      error instanceof Error ? error.message : String(error)
    );

    return new NextResponse(
      JSON.stringify({
        error: "Backend service unavailable",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const GET = (request: NextRequest) => forward(request);
export const POST = (request: NextRequest) => forward(request);
export const PUT = (request: NextRequest) => forward(request);
export const PATCH = (request: NextRequest) => forward(request);
export const DELETE = (request: NextRequest) => forward(request);

export const OPTIONS = () =>
  new NextResponse(null, {
    status: 204,
  });
