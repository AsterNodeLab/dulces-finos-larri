export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { handle, json } from "@/lib/api";
import { TEMPLATE_LIST } from "@/shared/templates";
import { SCRIPT_TEMPLATES } from "@/content/script-templates";
import { BRANDS } from "@/shared/brands";

export const GET = handle(async () => json({ templates: TEMPLATE_LIST, scriptFormats: SCRIPT_TEMPLATES, brands: BRANDS }));
