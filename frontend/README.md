# frontend

Vite + React + TypeScript. Consome a API do `backend/` pelo client tipado em
`src/api/`.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest
npm run typecheck
npm run build
```

## Estrutura

```
src/
  App.tsx              orquestra a tela
  api/                 client tipado (schema.d.ts é gerado)
  components/          Field, GameCard, GameFormDialog, Filters,
                       Pagination, Rating, Stats, StatusBadge,
                       ConfirmDialog, Toaster
  hooks/
    useGames.ts        listagem: filtros, busca, paginação
    useStats.ts        contagens do backlog inteiro
  lib/labels.ts        rótulos pt-BR e formatação
```

O resumo do topo usa `total` do envelope com `limit=1`, uma requisição por
status — assim os números refletem o backlog inteiro, não só a página
carregada.

## Configuração

`VITE_API_URL` aponta para a API (default `http://localhost:8000`). Copie
`.env.example` para `.env.local` para mudar.

No Docker isso é **build arg**, não variável de runtime: o bundle é estático e a
URL é gravada nele. E precisa ser o endereço que o **browser** alcança — a porta
publicada no host, nunca o nome do service do compose, que só resolve dentro da
rede do Docker.

## Client da API

`src/api/schema.d.ts` é gerado — não edite. Depois de mexer no backend:

```bash
../scripts/sync_client.sh
```

Erros HTTP viram exceções tipadas (`ConflictError`, `NotFoundError`,
`ValidationFailedError`, `ApiError`), então o `catch` separa caso de negócio de
bug. `AbortError` passa direto, para cancelamento de requisição não virar erro
na tela.

## Nota sobre dependências

O gerador `openapi-typescript` não está em `devDependencies`: ele declara peer
`typescript@^5.x` e o template do Vite traz o 6. Como é ferramenta de codegen
sob demanda — e o arquivo gerado é versionado — ele roda via `npx` com versão
fixa, em vez de degradar o TypeScript do app.
