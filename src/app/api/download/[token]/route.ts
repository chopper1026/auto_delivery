import fs from "node:fs";
import { Readable } from "node:stream";
import { NextRequest } from "next/server";
import { consumeDownload } from "@/lib/redemption/service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await consumeDownload({
    receiptToken: token,
    ipAddress: _request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || _request.headers.get("x-real-ip") || "unknown",
    userAgent: _request.headers.get("user-agent") || "unknown",
  });

  switch (result.result) {
    case "NOT_FOUND":
      return new Response("Not found", { status: 404 });
    case "ALREADY_DOWNLOADED":
      {
        const redirectUrl = new URL("/download/already-downloaded", _request.url);
        redirectUrl.searchParams.set("receipt", token);
        return Response.redirect(redirectUrl, 303);
      }
    case "ERROR":
      return new Response("Download unavailable", { status: 500 });
    case "SUCCESS":
      break;
  }

  const stream = fs.createReadStream(result.zipPath);
  return new Response(Readable.toWeb(stream) as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(result.filename)}"`,
    },
  });
}
