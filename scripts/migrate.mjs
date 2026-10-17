import pg from "pg";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {verifyAuth} from './verify-cloud.mjs';
if (!process.env.POSTGRES_URL) {
  console.log(
    "Database migration skipped locally: POSTGRES_URL is not configured.",
  );
  process.exit(0);
}
const client = new pg.Client({
  connectionString: process.env.POSTGRES_URL,
  connectionTimeoutMillis: 20000,
});
try {
  await client.connect();
  await client.query(
    await fs.readFile(
      new URL("../database/schema.sql", import.meta.url),
      "utf8",
    ),
  );
  // Transactional integration test: all fixtures are rolled back, including users.
  const one = randomUUID(),
    two = randomUUID(),
    item = randomUUID();
  await client.query("BEGIN");
  await client.query("INSERT INTO auth.users(id,email) VALUES($1,$2),($3,$4)", [
    one,
    one + "@example.invalid",
    two,
    two + "@example.invalid",
  ]);
  await client.query(
    "INSERT INTO public.core_items(user_id,id,kind,title,data) VALUES($1,$2,$3,$4,$5)",
    [one, item, "task", "RLS test", "{}"],
  );
  await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [
    two,
  ]);
  await client.query("SET LOCAL ROLE authenticated");
  const hidden = await client.query(
    "SELECT id FROM public.core_items WHERE id=$1",
    [item],
  );
  if (hidden.rowCount !== 0) throw Error("Owner isolation failed");
  await client.query("SAVEPOINT forbidden");
  let denied = false;
  try {
    await client.query(
      "INSERT INTO public.core_items(user_id,id,kind,title,data) VALUES($1,$2,$3,$4,$5)",
      [one, randomUUID(), "task", "Forbidden", "{}"],
    );
  } catch (e) {
    if (e.code === "42501") denied = true;
    else throw e;
  }
  await client.query("ROLLBACK TO SAVEPOINT forbidden");
  if (!denied) throw Error("Cross-user write was not rejected");
  await client.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [
    one,
  ]);
  const updated = await client.query(
    "UPDATE public.core_items SET title=$1 WHERE id=$2 RETURNING id",
    ["Updated", item],
  );
  if (updated.rowCount !== 1) throw Error("Owner update failed");
  const removed = await client.query(
    "DELETE FROM public.core_items WHERE id=$1 RETURNING id",
    [item],
  );
  if (removed.rowCount !== 1) throw Error("Owner delete failed");
  await client.query("ROLLBACK");
  await verifyAuth();
  console.log(
    "Database schema ready. Owner CRUD and cross-user isolation tests passed; fixtures rolled back.",
  );
} catch (e) {
  console.error("Database migration failed:", e.code || e.name);
  process.exitCode = 1;
} finally {
  await client.end();
}
