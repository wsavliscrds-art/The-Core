import { z } from "zod";
import { serverDb } from "../../lib/server-db";
import { itemSchema } from "../../lib/schema";
import { importLegacy } from "../../lib/legacy";
const reply = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
async function context() {
  const db = await serverDb();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  return { db, user: error ? null : user };
}
async function rows(db: Awaited<ReturnType<typeof serverDb>>, userId: string) {
  const { data, error } = await db
    .from("core_items")
    .select("data,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return itemSchema
    .array()
    .parse(data.map((r) => ({ ...r.data, revision: r.updated_at })));
}
export async function GET() {
  try {
    const { db, user } = await context();
    if (!user) return reply({ error: "Entre na sua conta." }, 401);
    await importLegacy(user);
    return reply({ items: await rows(db, user.id), mode: "database" });
  } catch {
    return reply(
      { error: "Não foi possível carregar seus registros. Tente novamente." },
      502,
    );
  }
}
async function mutate(req: Request, remove = false) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return reply({ error: "Origem inválida." }, 403);
  try {
    const { db, user } = await context();
    if (!user) return reply({ error: "Entre na sua conta." }, 401);
    if (remove) {
      const id = z
        .string()
        .uuid()
        .parse(new URL(req.url).searchParams.get("id"));
      const revision = z
        .string()
        .datetime({ offset: true })
        .parse(new URL(req.url).searchParams.get("revision"));
      const { data, error } = await db
        .from("core_items")
        .delete()
        .eq("user_id", user.id)
        .eq("id", id)
        .eq("updated_at", revision)
        .select("id");
      if (error) throw error;
      if (!data.length)
        return reply(
          {
            error:
              "Este registro mudou em outro dispositivo. Recarregue antes de excluir.",
          },
          409,
        );
    } else {
      const text = await req.text();
      if (text.length > 300000)
        return reply({ error: "Registro muito grande." }, 413);
      const { revision, ...item } = itemSchema.parse(JSON.parse(text));
      const value = {
        user_id: user.id,
        id: item.id,
        kind: item.kind,
        title: item.title,
        due_date: item.date || null,
        data: item,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = revision
        ? await db
            .from("core_items")
            .update(value)
            .eq("user_id", user.id)
            .eq("id", item.id)
            .eq("updated_at", revision)
            .select("id")
        : await db.from("core_items").insert(value).select("id");
      if (error) throw error;
      if (!data.length)
        return reply(
          {
            error:
              "Este registro mudou em outro dispositivo. Recarregue antes de salvar.",
          },
          409,
        );
    }
    return reply({ ok: true, items: await rows(db, user.id) });
  } catch (e) {
    return reply(
      {
        error:
          e instanceof z.ZodError || e instanceof SyntaxError
            ? "Verifique os campos, dias de repetição e datas da viagem."
            : "Não foi possível salvar. Tente novamente.",
      },
      e instanceof z.ZodError || e instanceof SyntaxError ? 400 : 502,
    );
  }
}
export async function PUT(req: Request) {
  return mutate(req);
}
export async function DELETE(req: Request) {
  return mutate(req, true);
}
