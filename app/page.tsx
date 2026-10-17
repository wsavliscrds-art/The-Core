import Core from "./core";
import { serverDb } from "./lib/server-db";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Page() {
  const db = await serverDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  return (
    <Core
      name={
        user.user_metadata?.name || user.email?.split("@")[0] || "Meu espaço"
      }
    />
  );
}
