# The Core OS

App em português para tarefas, rotinas, hábitos, viagens e notas, publicado na Vercel.

## O que inclui
- Agenda diária com tarefas, hábitos e compromissos de viagem.
- Rotinas diárias, dias úteis, fins de semana e dias específicos, com conclusões por data.
- Viagens com partida/retorno, hospedagem, reservas, bagagem e roteiro por dia.
- Resumo dos últimos sete dias e pendências.
- Lembretes locais configuráveis enquanto o app estiver aberto. O navegador pode suspender abas em segundo plano; não são alertas push agendados no servidor.
- Instalação na tela inicial (PWA), navegação móvel, aviso offline sem armazenar dados pessoais em cache.
- Login e cadastro por e-mail/senha com Supabase Auth; dados isolados por usuário com RLS no PostgreSQL.
- Exportação JSON e proteção contra sobrescrever uma edição concorrente.

## Infraestrutura
Next.js 16.3.8, React, Supabase (PostgreSQL + Auth), integração Marketplace da Vercel. Projeto Vercel: `thecore_oss`; banco: `thecore-db`. O Blob anterior continua preservado para migração.

Vercel Authentication permanece ativada em todos os deployments durante a validação do novo login. O login do app também é obrigatório e a API nunca usa a chave de serviço para ler dados comuns.

## Configuração
Veja `.env.example`. A conexão Supabase injeta as variáveis na Vercel. `npm run build` executa a migração idempotente de `database/schema.sql` antes de compilar. Localmente, configure `.env.local`; para migrar localmente, use `node --env-file=.env.local scripts/migrate.mjs`.

No Supabase Auth, Site URL: `https://thecoreoss.vercel.app`; Redirect URL: `https://thecoreoss.vercel.app/auth/confirm`. Confirmação de e-mail permanece ativa. A entrega de e-mail depende das cotas e configuração SMTP do Supabase.

## Migração dos dados anteriores
Configure `CORE_LEGACY_OWNER_EMAIL` com o e-mail do proprietário. Apenas após login com esse e-mail confirmado os registros do Blob são importados em uma transação. A migração é idempotente, não sobrescreve registros existentes e mantém o Blob original. Sem a variável, nada é atribuído automaticamente a uma conta.

## Desenvolvimento e verificação
Node.js 24 recomendado.

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run dev
```

Horários usam America/Sao_Paulo. Limite: 1.000 registros por conta. O app requer internet para carregar e salvar; não enfileira edições offline. O código não contém senhas ou tokens privados.
