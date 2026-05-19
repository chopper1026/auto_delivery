import fs from "node:fs";
import { NextRequest } from "next/server";
import { claimDownload, completeDownloadClaim, releaseDownloadClaim } from "@/lib/redemption/service";
import { consumeRateLimit } from "@/lib/security/rate-limit";

type SuccessfulDownloadClaim = Extract<Awaited<ReturnType<typeof claimDownload>>, { result: "SUCCESS" }>;

const noStoreHeaders = { "Cache-Control": "no-store" };

function getIpAddress(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function getUserAgent(request: NextRequest) {
  return request.headers.get("user-agent") || "unknown";
}

function noStoreResponse(body: BodyInit | null, init: ResponseInit) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(body, { ...init, headers });
}

function logClaimReleaseFailure(redemptionId: string, result: "ERROR") {
  console.error("Download claim release failed", { redemptionId, result });
}

function logClaimCompletionFailure(redemptionId: string, result: "ERROR") {
  console.error("Download claim completion failed", { redemptionId, result });
}

function createDownloadStream(
  claim: SuccessfulDownloadClaim,
  meta: { ipAddress: string; userAgent: string },
): ReadableStream<Uint8Array> {
  let nodeStream: fs.ReadStream | null = null;
  let settled = false;

  function releaseClaim() {
    void releaseDownloadClaim({
      redemptionId: claim.redemptionId,
      claimToken: claim.claimToken,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    })
      .then((released) => {
        if (released.result !== "SUCCESS") {
          logClaimReleaseFailure(claim.redemptionId, released.result);
        }
      })
      .catch((error) => {
        console.error("Failed to release download claim", { redemptionId: claim.redemptionId, error });
      });
  }

  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream = fs.createReadStream(claim.zipPath);

      nodeStream.on("data", (chunk) => {
        controller.enqueue(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        if (controller.desiredSize !== null && controller.desiredSize <= 0) {
          nodeStream?.pause();
        }
      });

      nodeStream.once("end", () => {
        if (settled) return;
        settled = true;
        controller.close();

        void completeDownloadClaim({
          redemptionId: claim.redemptionId,
          claimToken: claim.claimToken,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        })
          .then((completed) => {
            if (completed.result !== "SUCCESS") {
              logClaimCompletionFailure(claim.redemptionId, completed.result);
            }
          })
          .catch((error) => {
            console.error("Failed to complete download claim", { redemptionId: claim.redemptionId, error });
          });
      });

      nodeStream.once("error", (error) => {
        if (settled) return;
        settled = true;
        releaseClaim();
        controller.error(error);
      });
    },
    pull() {
      nodeStream?.resume();
    },
    cancel() {
      if (!settled) {
        settled = true;
        releaseClaim();
      }
      nodeStream?.destroy();
    },
  });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ipAddress = getIpAddress(request);
  const userAgent = getUserAgent(request);

  const limit = await consumeRateLimit({
    scope: "public-download",
    identifier: ipAddress,
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });

  if (!limit.allowed) {
    return noStoreResponse("Too many requests", { status: 429 });
  }

  const result = await claimDownload({
    receiptToken: token,
    ipAddress,
    userAgent,
  });

  switch (result.result) {
    case "NOT_FOUND":
      return noStoreResponse("Not found", { status: 404 });
    case "ALREADY_DOWNLOADED":
      {
        const redirectUrl = `/download/already-downloaded?${new URLSearchParams({ receipt: token })}`;
        return noStoreResponse(null, {
          status: 303,
          headers: { Location: redirectUrl },
        });
      }
    case "ERROR":
      return noStoreResponse("Download unavailable", { status: 500 });
    case "SUCCESS":
      break;
  }

  if (!fs.existsSync(result.zipPath)) {
    const released = await releaseDownloadClaim({
      redemptionId: result.redemptionId,
      claimToken: result.claimToken,
      ipAddress,
      userAgent,
    });
    if (released.result !== "SUCCESS") {
      logClaimReleaseFailure(result.redemptionId, released.result);
    }
    return noStoreResponse("Download unavailable", { status: 500 });
  }

  const stream = createDownloadStream(result, { ipAddress, userAgent });
  return new Response(stream, {
    headers: {
      ...noStoreHeaders,
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(result.filename)}"`,
    },
  });
}
