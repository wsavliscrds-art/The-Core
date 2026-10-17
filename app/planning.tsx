"use client";
import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import {
  Item,
  today,
  scheduled,
  completed,
  weekSummary,
  shiftDate,
} from "./model";

export function Agenda({
  items,
  row,
  save,
  busy,
}: {
  items: Item[];
  row: (i: Item) => ReactNode;
  save: (i: Item) => void;
  busy: boolean;
}) {
  const [day, setDay] = useState(today());
  const events = items.flatMap((trip) =>
    (trip.itinerary || [])
      .filter((e) => e.date === day)
      .map((e) => ({ trip, event: e })),
  );
  const planned = items
    .filter(
      (i) => (i.kind === "task" || i.kind === "habit") && scheduled(i, day),
    )
    .sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Agenda do dia</h2>
        <label className="compact">
          Dia
          <input
            type="date"
            value={day}
            onChange={(e) => e.target.value && setDay(e.target.value)}
          />
        </label>
      </div>
      <p className="hint inset">
        Horários em Brasília. Marque tarefas e hábitos de hoje; consulte outras
        datas pelo calendário.
      </p>
      {planned.length + events.length === 0 && (
        <p className="empty">Nenhum compromisso para esta data.</p>
      )}
      {planned.map((i) =>
        day === today() ? (
          row(i)
        ) : (
          <div className="item" key={i.id}>
            <span>{i.time || "Sem horário"}</span>
            <strong>{i.title}</strong>
            <span>{completed(i, day) ? "Concluído" : "Planejado"}</span>
          </div>
        ),
      )}
      {events
        .sort((a, b) => a.event.time.localeCompare(b.event.time))
        .map(({ trip, event }) => (
          <div className="item" key={event.id}>
            <button
              className={"check " + (event.done ? "checked" : "")}
              aria-label={"Concluir compromisso " + event.title}
              disabled={busy}
              onClick={() =>
                save({
                  ...trip,
                  itinerary: trip.itinerary!.map((e) =>
                    e.id === event.id ? { ...e, done: !e.done } : e,
                  ),
                })
              }
            >
              {event.done ? "✓" : ""}
            </button>
            <div className="item-title">
              <strong>{event.title}</strong>
              <span>
                {event.time || "Sem horário"} · {trip.title}
              </span>
            </div>
          </div>
        ))}
    </section>
  );
}
export function Weekly({ items, date }: { items: Item[]; date: string }) {
  if (!date) return null;
  const days = weekSummary(items, date),
    total = days.reduce((n, d) => n + d.tasks + d.habits, 0),
    max = Math.max(1, ...days.map((d) => d.tasks + d.habits));
  const pending = items.filter(
    (i) =>
      i.kind === "task" && !completed(i, date) && (!i.date || i.date <= date),
  );
  return (
    <section className="panel config">
      <span className="section-kicker">SEUS ÚLTIMOS 7 DIAS</span>
      <h2>{total} passos que fizeram a diferença</h2>
      <p className="hint">
        {shiftDate(date, -6)} a {date} · tarefas concluídas e check-ins de
        hábitos.
      </p>
      <div className="week-bars">
        {days.map((d) => (
          <div key={d.day}>
            <div className="bar-space">
              <div
                className="bar"
                style={{
                  height: Math.max(3, ((d.tasks + d.habits) / max) * 130),
                }}
              />
            </div>
            <strong>{d.tasks + d.habits}</strong>
            <span>
              {d.day.slice(8)}/{d.day.slice(5, 7)}
            </span>
            <small>
              {d.tasks} tarefas · {d.habits} hábitos
            </small>
          </div>
        ))}
      </div>
      <h3>Para retomar</h3>
      {pending.length ? (
        <ul>
          {pending.slice(0, 10).map((i) => (
            <li key={i.id}>{i.title}</li>
          ))}
        </ul>
      ) : (
        <p className="hint">Nenhuma tarefa pendente até hoje.</p>
      )}
      <p className="hint">
        {
          items.filter(
            (i) =>
              i.kind === "task" &&
              i.date > date &&
              i.date <= shiftDate(date, 7) &&
              !i.done,
          ).length
        }{" "}
        tarefas com data nos próximos 7 dias.
      </p>
    </section>
  );
}
export function PlanningFields({
  edit,
  setEdit,
}: {
  edit: Item;
  setEdit: Dispatch<SetStateAction<Item | null>>;
}) {
  const patch = (value: Partial<Item>) => setEdit({ ...edit, ...value });
  return (
    <>
      {(edit.kind === "task" || edit.kind === "habit") && (
        <>
          <label>
            Repetição
            <select
              value={edit.repeat || (edit.kind === "habit" ? "daily" : "none")}
              onChange={(e) =>
                patch({ repeat: e.target.value as Item["repeat"], done: false })
              }
            >
              {edit.kind !== "habit" && (
                <option value="none">Não repetir</option>
              )}
              <option value="daily">Todos os dias</option>
              <option value="weekdays">Dias úteis</option>
              <option value="weekends">Fins de semana</option>
              <option value="custom">Dias específicos</option>
            </select>
          </label>
          {edit.repeat === "custom" && (
            <fieldset className="week-select">
              <legend>Dias da semana</legend>
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                (day, n) => (
                  <label key={day}>
                    <input
                      type="checkbox"
                      checked={(edit.weekdays || []).includes(n)}
                      onChange={(e) =>
                        patch({
                          weekdays: e.target.checked
                            ? [...(edit.weekdays || []), n]
                            : (edit.weekdays || []).filter((v) => v !== n),
                        })
                      }
                    />
                    {day}
                  </label>
                ),
              )}
            </fieldset>
          )}
        </>
      )}
      {edit.kind !== "note" && (
        <label>
          Lembrete
          <select
            value={edit.reminder ?? -1}
            onChange={(e) => patch({ reminder: Number(e.target.value) })}
          >
            <option value={-1}>Sem lembrete</option>
            <option value={0}>No horário</option>
            <option value={10}>10 minutos antes</option>
            <option value={30}>30 minutos antes</option>
            <option value={60}>1 hora antes</option>
          </select>
          <span className="hint">
            Defina um horário. Os avisos funcionam enquanto o app estiver
            aberto.
          </span>
        </label>
      )}
      {edit.kind === "trip" && (
        <>
          <label>
            Data de retorno
            <input
              type="date"
              min={edit.date}
              value={edit.endDate || ""}
              onChange={(e) => patch({ endDate: e.target.value })}
            />
          </label>
          <label>
            Hospedagem e endereço
            <textarea
              maxLength={2000}
              value={edit.lodging || ""}
              onChange={(e) => patch({ lodging: e.target.value })}
            />
          </label>
          <label>
            Reservas e transporte
            <textarea
              maxLength={4000}
              value={edit.reservations || ""}
              onChange={(e) => patch({ reservations: e.target.value })}
            />
          </label>
          <label>
            Bagagem personalizada (um item por linha)
            <textarea
              maxLength={10000}
              value={(edit.packing || []).join("\n")}
              onChange={(e) =>
                patch({ packing: e.target.value.split("\n").slice(0, 100) })
              }
            />
          </label>
          <div className="checklist">
            {(edit.packing || []).filter(Boolean).map((p, n) => (
              <label key={n}>
                <input
                  type="checkbox"
                  checked={edit.checks.includes("bag:" + p)}
                  onChange={(e) =>
                    patch({
                      checks: e.target.checked
                        ? [...edit.checks, "bag:" + p]
                        : edit.checks.filter((c) => c !== "bag:" + p),
                    })
                  }
                />
                {p}
              </label>
            ))}
          </div>
          <h3>Roteiro por dia</h3>
          {(edit.itinerary || []).map((event, n) => (
            <div className="itinerary-edit" key={event.id}>
              <label>
                Compromisso {n + 1}
                <input
                  required
                  maxLength={160}
                  value={event.title}
                  onChange={(e) =>
                    patch({
                      itinerary: edit.itinerary!.map((v) =>
                        v.id === event.id ? { ...v, title: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              <div className="form-grid">
                <label>
                  Dia
                  <input
                    required
                    type="date"
                    min={edit.date}
                    max={edit.endDate || undefined}
                    value={event.date}
                    onChange={(e) =>
                      patch({
                        itinerary: edit.itinerary!.map((v) =>
                          v.id === event.id
                            ? { ...v, date: e.target.value }
                            : v,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Hora
                  <input
                    type="time"
                    value={event.time}
                    onChange={(e) =>
                      patch({
                        itinerary: edit.itinerary!.map((v) =>
                          v.id === event.id
                            ? { ...v, time: e.target.value }
                            : v,
                        ),
                      })
                    }
                  />
                </label>
              </div>
              <button
                type="button"
                className="danger"
                onClick={() =>
                  patch({
                    itinerary: edit.itinerary!.filter((v) => v.id !== event.id),
                  })
                }
              >
                Remover compromisso
              </button>
            </div>
          ))}
          <button
            type="button"
            className="subtle"
            disabled={(edit.itinerary || []).length >= 100}
            onClick={() =>
              patch({
                itinerary: [
                  ...(edit.itinerary || []),
                  {
                    id: crypto.randomUUID(),
                    title: "",
                    date: edit.date || today(),
                    time: "",
                    done: false,
                  },
                ],
              })
            }
          >
            + Adicionar compromisso
          </button>
        </>
      )}
    </>
  );
}
export function DeviceSettings({
  items,
  notify,
}: {
  items: Item[];
  notify: (s: string) => void;
}) {
  const [enabled, setEnabled] = useState(false),
    [install, setInstall] = useState<any>(null);
  useEffect(() => {
    setEnabled(localStorage.getItem("core-reminders") === "on");
    const handler = (e: Event) => {
      e.preventDefault();
      setInstall(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      const now = new Date(),
        day = today();
      const candidates = items.flatMap((i) =>
        i.kind === "trip"
          ? [
              {
                id: i.id,
                title: i.title,
                date: i.date,
                time: i.time,
                done: false,
                reminder: i.reminder,
              },
              ...(i.itinerary || []).map((e) => ({
                ...e,
                reminder: i.reminder,
              })),
            ]
          : (i.kind === "task" || i.kind === "habit") && scheduled(i, day)
            ? [
                {
                  ...i,
                  date: day,
                  done: completed(i, day),
                  reminder: i.reminder,
                },
              ]
            : [],
      );
      for (const c of candidates) {
        if (c.done || !c.time || c.reminder === undefined || c.reminder < 0)
          continue;
        const due =
          Date.parse(c.date + "T" + c.time + ":00-03:00") - c.reminder * 60000;
        const key = "core-alert:" + c.id + ":" + c.date + ":" + c.time;
        if (
          now.getTime() >= due &&
          now.getTime() < due + 60000 &&
          !sessionStorage.getItem(key)
        ) {
          sessionStorage.setItem(key, "1");
          notify("Lembrete: " + c.title);
          if ("Notification" in window && Notification.permission === "granted")
            navigator.serviceWorker?.ready
              .then((r) =>
                r.showNotification("The Core OS", {
                  body: c.title,
                  tag: key,
                  icon: "/icon.svg",
                }),
              )
              .catch(() => {});
        }
      }
    };
    tick();
    const timer = setInterval(tick, 15000);
    return () => clearInterval(timer);
  }, [enabled, items, notify]);
  return (
    <section className="device-settings">
      <h3>Lembretes e celular</h3>
      <p className="hint">
        Avisos enquanto o app estiver aberto. Horários em Brasília. Esta
        preferência vale para este dispositivo.
      </p>
      <button
        className="subtle"
        onClick={async () => {
          const next = !enabled;
          if (next && "Notification" in window) {
            try {
              await Notification.requestPermission();
            } catch {}
          }
          setEnabled(next);
          localStorage.setItem("core-reminders", next ? "on" : "off");
        }}
      >
        {enabled ? "Silenciar lembretes" : "Ativar lembretes"}
      </button>
      {install ? (
        <button
          className="primary"
          onClick={async () => {
            await install.prompt();
            setInstall(null);
          }}
        >
          Instalar no celular
        </button>
      ) : (
        <p className="hint">
          Para instalar: abra o menu do navegador → “Adicionar à tela inicial”.
          No iPhone, use Compartilhar no Safari.
        </p>
      )}
    </section>
  );
}
