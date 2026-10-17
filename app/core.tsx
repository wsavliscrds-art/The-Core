"use client";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  CheckSquare,
  Target,
  Plane,
  BookOpen,
  Settings,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Check,
  Search,
  X,
  Trash2,
  Flame,
  CalendarDays,
  ChevronRight,
  Download,
  Database,
  GitBranch,
  Compass,
  Sun,
  Menu,
} from "lucide-react";
import { Item, today, streak, longestStreak } from "./model";

const tabs = [
  ["Visão geral", LayoutDashboard],
  ["Tarefas", CheckSquare],
  ["Hábitos", Target],
  ["Viagens", Plane],
  ["Notas", BookOpen],
] as const;
const labels = {
  task: "tarefa",
  habit: "hábito",
  trip: "viagem",
  note: "nota",
};
const fmt = (d: string) =>
  d
    ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      })
    : "Sem data";
export default function Core() {
  const name = "Weslley";
  const [tab, setTab] = useState("Visão geral"),
    [items, setItems] = useState<Item[]>([]),
    [mode, setMode] = useState("loading"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("Todas"),
    [edit, setEdit] = useState<Item | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [mobile, setMobile] = useState(false),
    [date, setDate] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    setDate(today());
    const timer = setInterval(() => setDate(today()), 60000);
    fetch("/api/items")
      .then(async (r) => {
        const data = await r.json();
        if (r.ok) {
          setItems(data.items);
          setMode("blob");
        } else {
          setMode("error");
          setMessage(data.error || "Entre na sua conta para continuar.");
        }
      })
      .catch(() => {
        setMode("error");
        setMessage(
          "Não foi possível carregar seus dados. Recarregue para tentar novamente.",
        );
      });
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (edit) dialog.current?.showModal();
    else dialog.current?.close();
  }, [edit]);
  const tasks = items.filter((i) => i.kind === "task"),
    habits = items.filter((i) => i.kind === "habit"),
    trips = items
      .filter((i) => i.kind === "trip")
      .sort((a, b) => a.date.localeCompare(b.date)),
    pending = tasks.filter((i) => !i.done),
    done = tasks.filter((i) => i.completedAt === date && i.done),
    checked = habits.filter((i) => i.checkins.includes(date)),
    progress = tasks.length
      ? Math.round((tasks.filter((i) => i.done).length / tasks.length) * 100)
      : 0;
  function go(t: string) {
    setTab(t);
    setQuery("");
    setFilter("Todas");
    setMobile(false);
  }
  function create(kind: Item["kind"] = "task") {
    if (mode !== "blob") {
      setMessage("Aguarde a conexão com o armazenamento.");
      return;
    }
    setEdit({
      id: crypto.randomUUID(),
      kind,
      title: "",
      date: today(),
      time: "",
      priority: "Média",
      done: false,
      details: "",
      checks: [],
      checkins: [],
    });
  }
  async function save(item: Item, remove = false) {
    if (busy) return;
    setBusy(true);
    try {
      if (mode !== "blob") throw Error("Aguarde a conexão com seus dados.");
        const r = await fetch("/api/items" + (remove ? "?id=" + item.id : ""), {
          method: remove ? "DELETE" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: remove ? undefined : JSON.stringify(item),
        });
      const result = await r.json();
      if (!r.ok) throw Error(result.error || "Não foi possível salvar.");
      setItems(result.items);
      setEdit(null);
      setMessage(remove ? "Item excluído." : "Tudo salvo.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function toggle(i: Item) {
    save(
      i.kind === "habit"
        ? {
            ...i,
            checkins: i.checkins.includes(date)
              ? i.checkins.filter((d) => d !== date)
              : [...i.checkins, date],
          }
        : { ...i, done: !i.done, completedAt: !i.done ? date : undefined },
    );
  }
  function row(i: Item) {
    const completed = i.kind === "habit" ? i.checkins.includes(date) : i.done;
    return (
      <div className="item" key={i.id}>
        <button
          disabled={busy}
          className={"check " + (completed ? "checked" : "")}
          aria-label={
            completed ? "Desmarcar " + i.title : "Concluir " + i.title
          }
          onClick={() => toggle(i)}
        >
          {completed && <Check size={13} />}
        </button>
        <button className="item-title" onClick={() => setEdit(i)}>
          <strong className={completed ? "strike" : ""}>{i.title}</strong>
          <span>
            {i.kind === "habit" ? "Todos os dias" : i.time || fmt(i.date)}
          </span>
        </button>
        {i.kind === "habit" ? (
          <span className="streak">
            <Flame size={14} />
            {streak(i.checkins)} dias
          </span>
        ) : (
          <span className={"tag " + i.priority}>{i.priority}</span>
        )}
      </div>
    );
  }
  function empty(kind: Item["kind"], text: string) {
    return (
      <div className="empty">
        <Compass size={28} />
        <strong>{text}</strong>
        <p>Comece com algo pequeno. O próximo passo é seu.</p>
        <button className="subtle" onClick={() => create(kind)}>
          <Plus size={15} />
          Adicionar {labels[kind]}
        </button>
      </div>
    );
  }
  const dayTasks = pending
    .filter((i) => !i.date || i.date <= date)
    .sort((a, b) => a.time.localeCompare(b.time));
  const selected =
    tab === "Tarefas"
      ? "task"
      : tab === "Hábitos"
        ? "habit"
        : tab === "Viagens"
          ? "trip"
          : "note";
  const visible = items.filter(
    (i) =>
      i.kind === selected &&
      i.title.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "Todas" || (filter === "Pendentes" ? !i.done : i.done)),
  );
  const upcoming = trips.find((i) => i.date >= date);
  return (
    <div className="shell">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a className="brand" href="/">
          <span className="brand-mark">
            C<span />
          </span>
          <div>
            The Core OS<small>MENOS RUÍDO. MAIS DIREÇÃO.</small>
          </div>
        </a>
        <div className="workspace">
          <span className="avatar">W</span>
          <div>
            Meu espaço<small>{name} · Pessoal</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <p className="nav-caption">WORKSPACE</p>
        <nav>
          {tabs.map(([name, Icon]) => (
            <button
              className={tab === name ? "active" : ""}
              key={name}
              onClick={() => go(name)}
            >
              <Icon size={18} />
              {name}
              {name === "Tarefas" && pending.length > 0 && (
                <span className="count">{pending.length}</span>
              )}
              {name === "Visão geral" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="quote">
            <span>UM DIA DE CADA VEZ</span>
            <p>
              Consistência transforma
              <br />
              intenção em resultado.
            </p>
            <div className="quote-line" />
          </div>
          <button
            className={tab === "Configurações" ? "active settings" : "settings"}
            onClick={() => go("Configurações")}
          >
            <Settings size={18} />
            Configurações
          </button>
          <div className="sync">
            <span
              className={"status-dot " + (mode === "blob" ? "green" : "")}
            />
            {mode === "blob"
              ? "Sincronizado com Vercel Blob"
              : mode === "local"
                ? "Armazenamento neste navegador"
                : mode === "loading"
                  ? "Conectando…"
                  : "Conexão indisponível"}
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <button
            className="mobile-menu icon"
            aria-label="Abrir menu"
            onClick={() => setMobile(!mobile)}
          >
            <Menu size={20} />
          </button>
          <span>
            Meu espaço <ChevronRight size={13} /> <b>{tab}</b>
          </span>
          <div>
            <span className="top-date">
              <CalendarDays size={15} />
              {date &&
                new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
            </span>
            <span className="avatar small">W</span>
          </div>
        </header>
        <main>
          <section className="page-heading">
            <div>
              <div className="eyebrow">
                <span />{" "}
                {tab === "Visão geral"
                  ? "SEU CENTRO DE COMANDO"
                  : "CADA PASSO CONTA"}
              </div>
              <h1>
                {tab === "Visão geral" ? (
                  <>
                    Seu dia, no <em>controle.</em>
                  </>
                ) : (
                  tab
                )}
              </h1>
              <p>
                {tab === "Visão geral"
                  ? "Olá, " +
                    name.split(" ")[0] +
                    ". Abra espaço para o que realmente importa."
                  : tab === "Tarefas"
                    ? "Organize suas demandas e transforme planos em ação."
                    : tab === "Hábitos"
                      ? "Pequenas escolhas, repetidas todos os dias."
                      : tab === "Viagens"
                        ? "Planeje o caminho. Aproveite a jornada."
                        : tab === "Notas"
                          ? "Um lugar para suas ideias, registros e descobertas."
                          : "Seu espaço, suas conexões."}
              </p>
            </div>
            <button
              className="primary"
              disabled={mode === "loading" || mode === "error"}
              onClick={() =>
                create(
                  tab === "Visão geral" || tab === "Configurações"
                    ? "task"
                    : selected,
                )
              }
            >
              <Plus size={17} />{" "}
              {tab === "Visão geral" || tab === "Configurações"
                ? "Nova tarefa"
                : "Adicionar " + labels[selected]}
            </button>
          </section>
          {mode === "local" && (
            <div className="notice">
              Modo local: seus registros ficam neste navegador até a
              configuração do Vercel Blob.
            </div>
          )}
          {mode === "error" && (
            <div className="notice error">
              Não foi possível acessar o armazenamento da Vercel.{" "}
              <button onClick={() => location.reload()}>
                Tentar novamente
              </button>
            </div>
          )}
          {tab === "Visão geral" ? (
            <>
              <section className="stats">
                {[
                  [
                    CheckSquare,
                    "Tarefas pendentes",
                    pending.length,
                    "Para tirar do papel",
                    "blue",
                  ],
                  [
                    Check,
                    "Concluídas hoje",
                    done.length,
                    "Um passo à frente",
                    "green",
                  ],
                  [
                    Target,
                    "Hábitos ativos",
                    habits.length,
                    `${checked.length} realizados hoje`,
                    "purple",
                  ],
                  [
                    Flame,
                    "Maior sequência",
                    Math.max(
                      0,
                      ...habits.map((i) => longestStreak(i.checkins)),
                    ),
                    "Dias de consistência",
                    "orange",
                  ],
                ].map(([Icon, title, value, caption, color]: any) => (
                  <div className="stat" key={title}>
                    <div>
                      <span>{title}</span>
                      <Icon size={19} className={color} />
                    </div>
                    <strong>
                      {value}
                      <small>
                        {title === "Maior sequência" ? " dias" : ""}
                      </small>
                    </strong>
                    <p>{caption}</p>
                  </div>
                ))}
              </section>
              <div className="dashboard-grid">
                <div className="left-col">
                  <section className="panel focus">
                    <div className="panel-head">
                      <div>
                        <span className="section-kicker">FOCO NO PRESENTE</span>
                        <h2>O que move seu dia</h2>
                      </div>
                      <button
                        className="text-link"
                        onClick={() => go("Tarefas")}
                      >
                        Todas as tarefas <ArrowUpRight size={15} />
                      </button>
                    </div>
                    <div className="tabs">
                      <span className="selected">
                        Para hoje <b>{dayTasks.length}</b>
                      </span>
                      <span>{done.length} concluídas</span>
                    </div>
                    {dayTasks.length
                      ? dayTasks.slice(0, 5).map(row)
                      : empty("task", "Seu dia começa com uma intenção.")}
                    <button className="add-line" onClick={() => create("task")}>
                      <Plus size={16} />
                      Adicionar uma demanda
                    </button>
                  </section>
                  <section className="panel habit-panel">
                    <div className="panel-head">
                      <div>
                        <span className="section-kicker">
                          CONSTRUA CONSTÂNCIA
                        </span>
                        <h2>Seus rituais diários</h2>
                      </div>
                      <span className="pill">
                        {checked.length}/{habits.length} hoje
                      </span>
                    </div>
                    {habits.length
                      ? habits.slice(0, 4).map(row)
                      : empty("habit", "Uma pequena ação. Todos os dias.")}
                    <button
                      className="text-link panel-footer"
                      onClick={() => go("Hábitos")}
                    >
                      Ver meus hábitos <ArrowRight size={15} />
                    </button>
                  </section>
                </div>
                <div className="right-col">
                  <section className="daily-card">
                    <div className="daily-top">
                      <Sun size={20} />
                      <span>SEU RITMO</span>
                      <span>HOJE</span>
                    </div>
                    <div
                      className="ring"
                      style={{
                        background: `conic-gradient(#c7ed87 ${progress}%,#353b2b 0)`,
                      }}
                    >
                      <div>
                        <strong>
                          {progress}
                          <small>%</small>
                        </strong>
                        <span>das tarefas concluídas</span>
                      </div>
                    </div>
                    <h3>
                      {progress === 100
                        ? "Você fez acontecer."
                        : "Um passo de cada vez."}
                    </h3>
                    <p>
                      {progress === 100
                        ? "Reserve um momento para reconhecer seu progresso."
                        : "Não precisa fazer tudo. Comece pelo que faz a diferença."}
                    </p>
                    <div className="daily-bottom">
                      <span>
                        {tasks.filter((i) => i.done).length} concluídas
                      </span>
                      <span>{pending.length} em aberto</span>
                    </div>
                  </section>
                  <section className="panel travel">
                    <div className="panel-head">
                      <h2>Próxima parada</h2>
                      <Plane size={18} />
                    </div>
                    <div className="travel-art">
                      <div className="orbit one" />
                      <div className="orbit two" />
                      <Plane size={38} />
                      <span>EXPLORE O QUE VEM A SEGUIR</span>
                    </div>
                    {upcoming ? (
                      <>
                        <h3>{upcoming.title}</h3>
                        <p>
                          <CalendarDays size={14} />
                          {fmt(upcoming.date)}
                        </p>
                        <button
                          className="subtle full"
                          onClick={() => setEdit(upcoming)}
                        >
                          Abrir planejamento <ArrowUpRight size={15} />
                        </button>
                      </>
                    ) : (
                      <>
                        <h3>Sua próxima história</h3>
                        <p>Do checklist ao destino, tudo aqui.</p>
                        <button
                          className="subtle full"
                          onClick={() => create("trip")}
                        >
                          Planejar uma viagem <ArrowUpRight size={15} />
                        </button>
                      </>
                    )}
                  </section>
                </div>
              </div>
            </>
          ) : tab === "Configurações" ? (
            <section className="panel config">
              <h2>Conexões e dados</h2>
              <div className="connection">
                <Database />
                <div>
                  <h3>Vercel Blob</h3>
                  <p>
                    {mode === "blob"
                      ? "Conectado. Seus registros ficam no armazenamento privado deste espaço pessoal."
                      : "Aguardando configuração segura do banco de dados."}
                  </p>
                </div>
                <span className="pill">
                  {mode === "blob" ? "Conectado" : "Pendente"}
                </span>
              </div>
              <div className="connection">
                <GitBranch />
                <div>
                  <h3>GitHub</h3>
                  <p>Código-fonte: wsavliscrds-art/The-Core.</p>
                </div>
                <a
                  className="pill"
                  href="https://github.com/wsavliscrds-art/The-Core"
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir repositório ↗
                </a>
              </div>
              <button
                className="subtle"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(
                    new Blob([JSON.stringify(items, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  a.download = "the-core-os-" + date + ".json";
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
              >
                <Download size={16} />
                Exportar meus dados
              </button>
            </section>
          ) : (
            <>
              <div className="list-toolbar">
                <div className="search">
                  <Search size={17} />
                  <input
                    aria-label="Buscar"
                    placeholder={"Buscar " + tab.toLowerCase() + "…"}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                {tab === "Tarefas" && (
                  <div className="filters">
                    {["Todas", "Pendentes", "Concluídas"].map((f) => (
                      <button
                        className={filter === f ? "selected" : ""}
                        key={f}
                        onClick={() => setFilter(f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
                <span>{visible.length} registros</span>
              </div>
              <section
                className={
                  selected === "trip" || selected === "note"
                    ? "cards"
                    : "panel list"
                }
              >
                {visible.length
                  ? visible.map((i) =>
                      selected === "task" || selected === "habit" ? (
                        row(i)
                      ) : (
                        <button
                          className={"panel content-card " + selected}
                          key={i.id}
                          onClick={() => setEdit(i)}
                        >
                          {selected === "trip" ? (
                            <Plane size={24} />
                          ) : (
                            <BookOpen size={24} />
                          )}
                          <span>{fmt(i.date)}</span>
                          <h2>{i.title}</h2>
                          <p>
                            {i.details ||
                              "Adicione os detalhes do seu planejamento."}
                          </p>
                          {selected === "trip" && (
                            <small>
                              {i.checks.length} itens concluídos no checklist
                            </small>
                          )}
                          <ArrowUpRight size={18} />
                        </button>
                      ),
                    )
                  : empty(
                      selected,
                      query
                        ? "Nenhum resultado para essa busca."
                        : "Tudo pronto para seu primeiro registro.",
                    )}
              </section>
            </>
          )}
          <footer>
            <span className="footer-brand">THE CORE OS</span>
            <span>Organize o essencial. Viva o resto.</span>
            <span>
              Seu espaço pessoal <span className="tiny-dot" />
            </span>
          </footer>
        </main>
      </div>
      {message && (
        <div className="toast" role="status">
          {message}
          <button aria-label="Fechar aviso" onClick={() => setMessage("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <dialog
        aria-label="Editar registro"
        ref={dialog}
        onCancel={() => setEdit(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setEdit(null);
        }}
      >
        {edit && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save(edit);
            }}
          >
            <div className="modal-head">
              <div>
                <span className="section-kicker">SEU PRÓXIMO PASSO</span>
                <h2>
                  {items.some((i) => i.id === edit.id) ? "Editar" : "Adicionar"}{" "}
                  {labels[edit.kind]}
                </h2>
              </div>
              <button
                type="button"
                className="icon"
                aria-label="Fechar"
                onClick={() => setEdit(null)}
              >
                <X />
              </button>
            </div>
            <label>
              {edit.kind === "trip" ? "Destino / nome da viagem" : "Título"}
              <input
                autoFocus
                required
                maxLength={160}
                placeholder={
                  edit.kind === "trip"
                    ? "Ex.: Uma semana em São Paulo"
                    : "O que você quer fazer?"
                }
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
            </label>
            <div className="form-grid">
              <label>
                {edit.kind === "trip" ? "Data de partida" : "Data"}
                <input
                  type="date"
                  value={edit.date}
                  onChange={(e) => setEdit({ ...edit, date: e.target.value })}
                />
              </label>
              {edit.kind === "task" ? (
                <label>
                  Horário
                  <input
                    type="time"
                    value={edit.time}
                    onChange={(e) => setEdit({ ...edit, time: e.target.value })}
                  />
                </label>
              ) : null}
              <label>
                Prioridade
                <select
                  value={edit.priority}
                  onChange={(e) =>
                    setEdit({ ...edit, priority: e.target.value })
                  }
                >
                  <option>Alta</option>
                  <option>Média</option>
                  <option>Baixa</option>
                </select>
              </label>
            </div>
            <label>
              {edit.kind === "trip" ? "Roteiro e detalhes" : "Anotações"}
              <textarea
                rows={4}
                maxLength={10000}
                placeholder={
                  edit.kind === "trip"
                    ? "Hospedagem, compromissos, roteiro por dia…"
                    : "Adicione contexto, ideias ou próximos passos…"
                }
                value={edit.details}
                onChange={(e) => setEdit({ ...edit, details: e.target.value })}
              />
            </label>
            {edit.kind === "habit" && (
              <p className="hint">
                Este hábito se repete diariamente. Faça seu check-in na lista de
                hábitos.
              </p>
            )}
            {edit.kind === "trip" && (
              <div className="checklist">
                <h3>Antes de partir</h3>
                {[
                  "Documentos e identificação",
                  "Passagens e transporte",
                  "Hospedagem confirmada",
                  "Mala e itens essenciais",
                  "Agenda e compromissos",
                ].map((c) => (
                  <label key={c}>
                    <input
                      type="checkbox"
                      checked={edit.checks.includes(c)}
                      onChange={(e) =>
                        setEdit({
                          ...edit,
                          checks: e.target.checked
                            ? [...edit.checks, c]
                            : edit.checks.filter((v) => v !== c),
                        })
                      }
                    />
                    {c}
                  </label>
                ))}
              </div>
            )}
            <div className="modal-actions">
              {items.some((i) => i.id === edit.id) && (
                <button
                  type="button"
                  className="danger"
                  disabled={busy}
                  onClick={() => {
                    if (confirm("Excluir este registro?")) save(edit, true);
                  }}
                >
                  <Trash2 size={16} />
                  Excluir
                </button>
              )}
              <button
                type="button"
                className="subtle"
                onClick={() => setEdit(null)}
              >
                Cancelar
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "Salvando…" : "Salvar " + labels[edit.kind]}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
