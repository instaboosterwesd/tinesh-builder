import { createServerFn } from "@tanstack/react-start";
import { checkPassword, int, str, uuid } from "@/lib/server-helpers";

export type CategoryCard = { id: string; name: string; image: string; link: string; button: string };
export type Category = { id: string; name: string; image: string; order: number; all_templates: boolean; template_ids: string[]; cards: CategoryCard[] };

type Row = Omit<Category, "id"> & { created_at?: string };

async function adb() {
  return import("@/integrations/firebase/admin.server");
}

function normalize(id: string, r: Partial<Row>): Category {
  return {
    id,
    name: r.name ?? "",
    image: r.image ?? "",
    all_templates: r.all_templates === true,
    order: r.order ?? 0,
    template_ids: Array.isArray(r.template_ids) ? r.template_ids : [],
    cards: Array.isArray(r.cards) ? r.cards : [],
  };
}

async function readAll(): Promise<Category[]> {
  const db = await adb();
  const rec = await db.dbGet<Record<string, Partial<Row>>>("categories");
  return Object.entries(rec ?? {})
    .map(([id, r]) => normalize(id, r))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

/** Public: categories for the home page. */
export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await readAll();
  } catch (e) {
    console.error("listCategories failed:", e instanceof Error ? e.message : e);
    return [] as Category[];
  }
});

export const adminListCategories = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    checkPassword(data?.password);
    return readAll();
  });

function httpsUrl(v: unknown, label: string) {
  const s = str(v, label, 1000);
  if (!/^https?:\/\/\S+$/i.test(s)) throw new Error(`${label} must start with https://`);
  return s;
}

export const adminSaveCategory = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => {
    const ids = Array.isArray(d?.["template_ids"]) ? (d["template_ids"] as unknown[]).slice(0, 500).map((x) => uuid(x)) : [];
    const cards = Array.isArray(d?.["cards"]) ? (d["cards"] as Record<string, unknown>[]).slice(0, 200) : [];
    return {
      password: d?.["password"] as string,
      id: d?.["id"] ? uuid(d["id"]) : null,
      fields: {
        name: str(d?.["name"], "Category name", 80),
        image: d?.["image"] ? httpsUrl(d["image"], "Category photo") : "",
        all_templates: d?.["all_templates"] === true,
        order: int(d?.["order"] ?? 0, "order", 0, 10_000),
        template_ids: ids,
        cards: cards.map((c) => ({
          id: typeof c["id"] === "string" && /^[\w-]{1,40}$/.test(c["id"]) ? c["id"] : crypto.randomUUID(),
          name: str(c["name"], "Card name", 100),
          image: httpsUrl(c["image"], "Card image"),
          link: httpsUrl(c["link"], "Card link"),
          button: str(c["button"], "Button name", 30, false) || "Buy Now",
        })),
      },
    };
  })
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const db = await adb();
    const id = data.id ?? crypto.randomUUID();
    if (data.id) await db.dbUpdate(`categories/${id}`, data.fields);
    else await db.dbSet(`categories/${id}`, { ...data.fields, created_at: new Date().toISOString() });
    return { id };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string; id: string }) => ({ password: d?.password, id: uuid(d?.id) }))
  .handler(async ({ data }) => {
    checkPassword(data.password);
    const db = await adb();
    await db.dbRemove(`categories/${data.id}`);
    return { ok: true };
  });
