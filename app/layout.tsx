import "./globals.css";
export const metadata = {
  title: "The Core OS · Seu dia, no controle",
  description: "Seu espaço para organizar tarefas, hábitos e viagens.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
