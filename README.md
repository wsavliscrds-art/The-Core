# The Core OS

App pessoal para tarefas, hábitos, viagens e notas, com interface escura responsiva em português.

## Stack

Next.js, React, CSS e **Vercel Blob privado**. Hospedado no projeto `thecore_oss`. Código: [wsavliscrds-art/The-Core](https://github.com/wsavliscrds-art/The-Core).

## Funcionalidades

- Dashboard com tarefas pendentes, conclusões do dia, hábitos e recorde de sequência.
- Tarefas com prioridades, datas, horários, filtros, busca e conclusão.
- Hábitos diários com check-in e sequência de dias.
- Viagens com partida, roteiro em texto e checklist.
- Notas e exportação JSON.
- Persistência na nuvem com controle de concorrência por ETag.

## Armazenamento e acesso

O armazenamento privado `thecore-data` está conectado ao projeto Vercel. O SDK lê `BLOB_READ_WRITE_TOKEN` exclusivamente no servidor. Cada alteração atualiza um documento JSON privado; alterações concorrentes são recusadas quando o ETag não coincide.

Este é um **espaço pessoal único**, protegido por **Vercel Authentication**, não um SaaS com contas separadas. Visitantes autorizados na Vercel compartilham os mesmos registros. A proteção existente do projeto cobre todos os endereços `vercel.app`; as APIs recusam domínios personalizados para evitar a exceção de proteção desses domínios. Não desative Deployment Protection. Para tornar o app público, implemente autenticação própria antes.

Variáveis:

- `BLOB_READ_WRITE_TOKEN`: criada pela conexão do armazenamento.
- `CORE_PRIVATE_WORKSPACE=true`: confirma o modo de espaço privado protegido pela Vercel.

Não há banco Neon, SQL ou migrações em uso nesta versão. Blob armazena documentos JSON, e não tabelas relacionais. Limite desta versão: 1.000 registros por espaço.

## Desenvolvimento

Node.js 24 recomendado.

```sh
npm ci
# Vincule a Vercel e configure .env.local com as variáveis acima.
npm run dev
```

## Verificação

```sh
npm test
npm run typecheck
npm run build
```

O build usa webpack para compatibilidade com ambientes Windows que restringem junctions do Turbopack.

## Limites

Sem alertas push, envio de e-mails ou lembretes em segundo plano. Horários organizam a agenda visual. Hábitos são diários, no fuso de São Paulo. Roteiros são texto livre e o checklist tem cinco itens padrão. Atualize a página ao alternar entre dispositivos; o app avisa quando detecta alteração concorrente durante a gravação.

Referência: [Vercel Blob SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk).
