import { getReceiptByToken } from "@/lib/redemption/service";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const receipt = await getReceiptByToken(token);

  if (!receipt) {
    return Response.json({ error: "Receipt not found." }, { status: 404 });
  }

  if (receipt.kind === "TEXT") {
    return Response.json({ kind: "TEXT" });
  }

  return Response.json({ kind: "FILE", downloaded: receipt.downloaded });
}
