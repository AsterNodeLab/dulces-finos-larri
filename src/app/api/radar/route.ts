export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { handle, json } from "@/lib/api";
import { getRadar } from "@/lib/research/radar";

export const GET = handle(async (req: Request) => {
  const force = new URL(req.url).searchParams.get("force") === "1";
  return json(await getRadar(force));
});
