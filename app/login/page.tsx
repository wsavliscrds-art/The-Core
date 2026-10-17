"use client";
import { useState } from "react";
import { browserDb } from "../lib/browser-db";
export default function Login() {
  const [signup, setSignup] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <main className="login-page">
      <form
        className="panel login-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          const data = new FormData(e.currentTarget);
          const email = String(data.get("email")),
            password = String(data.get("password"));
          try {
            const db = browserDb();
            const result = signup
              ? await db.auth.signUp({
                  email,
                  password,
                  options: {
                    data: { name: String(data.get("name")) },
                    emailRedirectTo: location.origin + "/auth/confirm",
                  },
                })
              : await db.auth.signInWithPassword({ email, password });
            if (result.error) throw result.error;
            if (result.data.session) location.assign("/");
            else
              setMessage(
                "Conta criada. Confirme seu e-mail e depois entre com sua senha.",
              );
          } catch {
            setMessage(
              signup
                ? "Não foi possível criar a conta. Confira os campos ou tente novamente mais tarde."
                : "Não foi possível entrar. Confira seu e-mail, senha e a confirmação de e-mail.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <span className="section-kicker">THE CORE OS</span>
        <h1>{signup ? "Seu espaço começa aqui." : "Bem-vindo de volta."}</h1>
        <p>Rotinas, planos e viagens em um só lugar.</p>
        {signup && (
          <label>
            Seu nome
            <input name="name" required maxLength={80} autoComplete="name" />
          </label>
        )}
        <label>
          E-mail
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Senha
          <input
            name="password"
            type="password"
            minLength={12}
            maxLength={128}
            required
            autoComplete={signup ? "new-password" : "current-password"}
          />
          <span className="hint">Use pelo menos 12 caracteres.</span>
        </label>
        <button disabled={busy} className="primary full">
          {busy ? "Aguarde…" : signup ? "Criar minha conta" : "Entrar"}
        </button>
        <button
          type="button"
          className="text-link"
          onClick={() => {
            setSignup(!signup);
            setMessage("");
          }}
        >
          {signup ? "Já tenho conta" : "Criar uma conta"}
        </button>
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
      </form>
    </main>
  );
}
