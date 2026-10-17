import { z } from "zod";
const day = z
  .string()
  .refine(
    (v) =>
      v === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        !isNaN(Date.parse(v + "T12:00:00Z")) &&
        new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v),
    "Data inválida",
  );
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^$/);
export const itemSchema = z
  .object({
    revision: z.string().datetime({ offset: true }).optional(),
    id: z.string().uuid(),
    kind: z.enum(["task", "habit", "trip", "note"]),
    title: z.string().trim().min(1).max(160),
    date: day,
    time,
    priority: z.enum(["Alta", "Média", "Baixa"]),
    done: z.boolean(),
    completedAt: day.optional(),
    details: z.string().max(10000),
    checks: z.array(z.string().max(220)).max(200),
    checkins: z.array(day).max(10000),
    repeat: z
      .enum(["none", "daily", "weekdays", "weekends", "custom"])
      .optional(),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
    reminder: z
      .union([
        z.literal(-1),
        z.literal(0),
        z.literal(10),
        z.literal(30),
        z.literal(60),
      ])
      .optional(),
    endDate: day.optional(),
    lodging: z.string().max(2000).optional(),
    reservations: z.string().max(4000).optional(),
    packing: z.array(z.string().max(200)).max(100).optional(),
    itinerary: z
      .array(
        z.object({
          id: z.string().uuid(),
          title: z.string().trim().min(1).max(160),
          date: day.refine(Boolean),
          time,
          done: z.boolean(),
        }),
      )
      .max(100)
      .optional(),
  })
  .superRefine((i, ctx) => {
    if (i.repeat === "custom" && !i.weekdays?.length)
      ctx.addIssue({ code: "custom", message: "Escolha os dias da semana." });
    if (i.endDate && i.date && i.endDate < i.date)
      ctx.addIssue({ code: "custom", message: "Retorno anterior à partida." });
    if (
      i.itinerary?.some(
        (e) => (i.date && e.date < i.date) || (i.endDate && e.date > i.endDate),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Compromisso fora das datas da viagem.",
      });
  });
