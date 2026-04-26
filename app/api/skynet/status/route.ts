import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SKYNET_CHAT_URL =
  process.env.NEXT_PUBLIC_SKYNET_CHAT_URL ||
  "http://127.0.0.1:4020/chat?sandbox=touring_autonomy_lab";

function getOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return "http://127.0.0.1:4020";
  }
}

export async function GET() {
  const checkedAt = new Date().toISOString();
  const origin = getOrigin(SKYNET_CHAT_URL);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(origin, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    }).catch(() => null);

    clearTimeout(timeout);

    return NextResponse.json({
      ok: true,
      status: response ? "ready" : "offline",
      backendReady: Boolean(response && response.ok),
      chatUrl: SKYNET_CHAT_URL,
      checkedAt,
      releaseLabel: "local-shell-bridge",
      note: response && response.ok
        ? "Skynet bridge reachable."
        : "Skynet bridge unavailable. Webnett will stay in fallback mode.",
    });
  } catch {
    return NextResponse.json({
      ok: true,
      status: "offline",
      backendReady: false,
      chatUrl: SKYNET_CHAT_URL,
      checkedAt,
      releaseLabel: "local-shell-bridge",
      note: "Skynet bridge unavailable. Webnett will stay in fallback mode.",
    });
  }
}
