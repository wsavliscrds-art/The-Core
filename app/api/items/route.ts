import { get, put, BlobPreconditionFailedError } from "@vercel/blob";
import { z } from "zod";
const schema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["task", "habit", "trip", "note"]),
  title: z.string().trim().min(1).max(160),
  date: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  time: z.string().regex(/^(\d{2}:\d{2})?$/),
  priority: z.enum(["Alta", "Média", "Baixa"]),
  done: z.boolean(),
  completedAt: z.string().max(10).optional(),
  details: z.string().max(10000),
  checks: z.array(z.string().max(200)).max(100),
  checkins: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).max(10000),
});
const path = "core-os/workspace-v1.json";
const reply = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
function guard(req: Request, write = false) {
  if (
    process.env.CORE_PRIVATE_WORKSPACE !== "true" ||
    !process.env.BLOB_READ_WRITE_TOKEN
  )
    return reply(
      { error: "Conecte o armazenamento privado no projeto Vercel." },
      503,
    );
  const url = new URL(req.url);
  // Vercel Authentication is configured for ALL deployments on this project.
  // Custom domains are deliberately unsupported by this personal workspace.
  if (process.env.VERCEL === "1" && !url.hostname.endsWith(".vercel.app"))
    return reply(
      { error: "Abra este app pelo endereço privado da Vercel." },
      403,
    );
  if (write && req.headers.get("origin") !== url.origin)
    return reply({ error: "Origem inválida." }, 403);
  return null;
}
async function read() {
  const result = await get(path, { access: "private", useCache: false });
  if (!result)
    return { items: [] as z.infer<typeof schema>[], etag: undefined };
  if (result.statusCode !== 200) throw Error("Unexpected storage response");
  return {
    items: z
      .array(schema)
      .max(1000)
      .parse(await new Response(result.stream).json()),
    etag: result.blob.etag,
  };
}
export async function GET(req: Request) {
  const error = guard(req);
  if (error) return error;
  try {
    const data = await read();
    return reply({ items: data.items, mode: "blob" });
  } catch {
    return reply(
      { error: "Não foi possível carregar os registros. Tente novamente." },
      502,
    );
  }
}
async function mutate(req: Request, remove: boolean) {
  const error = guard(req, true);
  if (error) return error;
  try {
    const item = remove ? null : schema.parse(await req.json());
    const id = remove
      ? z.string().uuid().parse(new URL(req.url).searchParams.get("id"))
      : item!.id;
    const data = await read();
    const items = remove
      ? data.items.filter((i) => i.id !== id)
      : data.items.some((i) => i.id === id)
        ? data.items.map((i) => (i.id === id ? item! : i))
        : [item!, ...data.items];
    if (items.length > 1000)
      return reply(
        {
          error:
            "Limite de 1.000 registros atingido. Exporte e organize seus dados.",
        },
        400,
      );
    await put(path, JSON.stringify(items), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: Boolean(data.etag),
      ...(data.etag ? { ifMatch: data.etag } : {}),
      cacheControlMaxAge: 60,
    });
    return reply({ ok: true, items });
  } catch (e) {
    if (e instanceof z.ZodError)
      return reply({ error: "Verifique os campos informados." }, 400);
    if (e instanceof BlobPreconditionFailedError)
      return reply(
        {
          error:
            "Outro dispositivo alterou os registros. Recarregue e tente novamente.",
        },
        409,
      );
    return reply(
      {
        error:
          "Não foi possível salvar. Seus registros anteriores foram preservados.",
      },
      502,
    );
  }
}
export async function PUT(req: Request) {
  return mutate(req, false);
}
export async function DELETE(req: Request) {
  return mutate(req, true);
}

