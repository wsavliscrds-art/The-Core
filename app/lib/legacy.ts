import { get } from "@vercel/blob";
import pg from "pg";
import { itemSchema } from "./schema";
// Only an explicitly configured, verified email may receive the old personal workspace.
export async function importLegacy(user: {
  id: string;
  email?: string;
  email_confirmed_at?: string;
}) {
  const owner = process.env.CORE_LEGACY_OWNER_EMAIL;
  if (
    !owner ||
    !user.email_confirmed_at ||
    user.email?.toLowerCase() !== owner.toLowerCase() ||
    !process.env.BLOB_READ_WRITE_TOKEN
  )
    return;
  const client = new pg.Client({
    connectionString: process.env.POSTGRES_URL,
    connectionTimeoutMillis: 15000,
  });
  try {
    await client.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(715022)");
    const existing = await client.query(
      "SELECT name FROM public.core_migrations WHERE name='blob-v1'",
    );
    if (!existing.rowCount) {
      const blob = await get("core-os/workspace-v1.json", {
        access: "private",
        useCache: false,
      });
      if (blob && blob.statusCode !== 200)
        throw new Error("Legacy unavailable");
      const items = blob
        ? itemSchema
            .array()
            .max(1000)
            .parse(await new Response(blob.stream).json())
        : [];
      for (const i of items)
        await client.query(
          "INSERT INTO public.core_items(user_id,id,kind,title,due_date,data) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id,id) DO NOTHING",
          [user.id, i.id, i.kind, i.title, i.date || null, JSON.stringify(i)],
        );
      await client.query(
        "INSERT INTO public.core_migrations(name,owner_id) VALUES('blob-v1',$1)",
        [user.id],
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await client.end();
  }
}
