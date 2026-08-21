import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.js";
import type { Game } from "./api/client.js";

function game(overrides: Partial<Game> = {}): Game {
  return {
    id: 1,
    title: "God of War",
    platform: "pc",
    status: "finished",
    rating: null,
    hours_played: 0,
    created_at: "2026-08-21T17:44:59.872628Z",
    updated_at: "2026-08-21T17:45:02.613121Z",
    ...overrides,
  };
}

function page(items: Game[], total = items.length) {
  return { items, total, skip: 0, limit: 12 };
}

/** Stub no limite da rede: exercita App -> client -> HTTP -> mapeamento de erro. */
type Resposta = { status: number; body?: unknown };
type Handler = (url: URL, init?: RequestInit) => Resposta;

let handler: Handler;
const calls: { method: string; url: URL; body: unknown }[] = [];

/** Só as requisições de listagem da grade (as do resumo usam limit=1). */
function chamadasDeLista() {
  return calls.filter((c) => c.method === "GET" && c.url.searchParams.get("limit") !== "1");
}

beforeEach(() => {
  calls.length = 0;
  handler = () => ({ status: 200, body: page([]) });
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    calls.push({
      method: init?.method ?? "GET",
      url,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { status, body } = handler(url, init);
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
});

afterEach(() => vi.unstubAllGlobals());

const resumo = () => within(screen.getByRole("region", { name: "Resumo do backlog" }));
const filtros = () => within(screen.getByRole("region", { name: "Filtros" }));
const dialogo = () => within(screen.getByRole("dialog"));

describe("listagem", () => {
  it("mostra os jogos em cards", async () => {
    handler = () => ({ status: 200, body: page([game(), game({ id: 2, title: "Celeste" })]) });

    render(<App />);

    expect(await screen.findByText("God of War")).toBeInTheDocument();
    expect(screen.getByText("Celeste")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("mostra o status e a plataforma no card", async () => {
    handler = () => ({ status: 200, body: page([game({ status: "playing", platform: "nintendo" })]) });

    render(<App />);
    const card = within(await screen.findByRole("article"));

    expect(card.getByText("Jogando", { selector: ".badge" })).toBeInTheDocument();
    expect(card.getByText("Nintendo")).toBeInTheDocument();
  });

  it("formata horas e nota ausente", async () => {
    handler = () => ({ status: 200, body: page([game({ hours_played: 12.5, rating: null })]) });

    render(<App />);
    const card = within(await screen.findByRole("article"));

    expect(card.getByText("12h30")).toBeInTheDocument();
    expect(card.getByText("sem nota")).toBeInTheDocument();
  });

  it("mostra estado vazio quando o backlog não tem nada", async () => {
    render(<App />);

    expect(await screen.findByText(/backlog está vazio/i)).toBeInTheDocument();
  });

  it("diferencia backlog vazio de filtro sem resultado", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/backlog está vazio/i);

    await user.type(screen.getByRole("searchbox"), "zelda");

    expect(await screen.findByText(/Nenhum jogo com esses filtros/i)).toBeInTheDocument();
  });

  it("mostra erro quando a API está fora do ar", async () => {
    handler = () => {
      throw new TypeError("fetch failed");
    };

    render(<App />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/Não foi possível falar com a API/);
  });
});

describe("filtros", () => {
  it("manda a busca com debounce", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/backlog está vazio/i);
    calls.length = 0;

    await user.type(screen.getByRole("searchbox"), "god of war");

    await waitFor(() => {
      expect(chamadasDeLista().at(-1)?.url.searchParams.get("search")).toBe("god of war");
    });
    expect(chamadasDeLista().length).toBeLessThan(10);
  });

  it("filtra por status ao clicar no resumo", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/backlog está vazio/i);

    await user.click(resumo().getByRole("button", { name: /Jogando/ }));

    await waitFor(() => {
      expect(chamadasDeLista().at(-1)?.url.searchParams.get("status")).toBe("playing");
    });
  });

  it("filtra por plataforma", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/backlog está vazio/i);

    await user.selectOptions(filtros().getByLabelText("Plataforma"), "xbox");

    await waitFor(() => {
      expect(chamadasDeLista().at(-1)?.url.searchParams.get("platform")).toBe("xbox");
    });
  });

  it("inverte a ordenação", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/backlog está vazio/i);

    await user.selectOptions(filtros().getByLabelText("Ordenar por"), "title");
    await user.click(filtros().getByRole("button", { name: /Ordem/ }));

    await waitFor(() => {
      const ultima = chamadasDeLista().at(-1)?.url.searchParams;
      expect(ultima?.get("sort")).toBe("title");
      expect(ultima?.get("order")).toBe("asc");
    });
  });
});

describe("criação", () => {
  it("cria o jogo pelo diálogo e avisa por toast", async () => {
    const user = userEvent.setup();
    let criado = false;
    handler = (_url, init) => {
      if (init?.method === "POST") {
        criado = true;
        return { status: 201, body: game({ title: "Celeste" }) };
      }
      return { status: 200, body: page(criado ? [game({ title: "Celeste" })] : []) };
    };

    render(<App />);
    await screen.findByText(/backlog está vazio/i);

    await user.click(screen.getByRole("button", { name: "+ Novo jogo" }));
    await user.type(dialogo().getByLabelText("Título"), "Celeste");
    await user.click(dialogo().getByRole("button", { name: "Adicionar" }));

    expect(await screen.findByRole("status")).toHaveTextContent('"Celeste" adicionado.');
    expect(await screen.findByText("Celeste")).toBeInTheDocument();
    const post = calls.find((c) => c.method === "POST");
    expect(post?.body).toMatchObject({ title: "Celeste", platform: "pc", status: "backlog" });
  });

  it("mostra o 409 como erro no campo do título", async () => {
    const user = userEvent.setup();
    handler = (_url, init) =>
      init?.method === "POST"
        ? { status: 409, body: { detail: "'Celeste' ja cadastrado em pc" } }
        : { status: 200, body: page([]) };

    render(<App />);
    await screen.findByText(/backlog está vazio/i);

    await user.click(screen.getByRole("button", { name: "+ Novo jogo" }));
    await user.type(dialogo().getByLabelText("Título"), "Celeste");
    await user.click(dialogo().getByRole("button", { name: "Adicionar" }));

    expect(await dialogo().findByText(/Você já tem "Celeste" em PC/)).toBeInTheDocument();
    // O diálogo continua aberto para o usuário corrigir.
    expect(dialogo().getByLabelText("Título")).toHaveValue("Celeste");
  });

  it("mostra erro de campo vindo do 422", async () => {
    const user = userEvent.setup();
    handler = (_url, init) =>
      init?.method === "POST"
        ? {
            status: 422,
            body: {
              detail: [
                { loc: ["body", "title"], msg: "String should have at least 1 character", type: "x" },
              ],
            },
          }
        : { status: 200, body: page([]) };

    render(<App />);
    await screen.findByText(/backlog está vazio/i);

    await user.click(screen.getByRole("button", { name: "+ Novo jogo" }));
    await user.type(dialogo().getByLabelText("Título"), "x");
    await user.click(dialogo().getByRole("button", { name: "Adicionar" }));

    expect(await dialogo().findByText(/at least 1 character/)).toBeInTheDocument();
  });
});

describe("edição", () => {
  it("abre o diálogo preenchido e envia o PATCH", async () => {
    const user = userEvent.setup();
    handler = (_url, init) =>
      init?.method === "PATCH"
        ? { status: 200, body: game({ title: "God of War Ragnarök", rating: 9 }) }
        : { status: 200, body: page([game({ rating: 7, hours_played: 20 })]) };

    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Editar" }));

    expect(dialogo().getByLabelText("Título")).toHaveValue("God of War");
    expect(dialogo().getByRole("button", { name: "Nota 7" })).toHaveAttribute("aria-pressed", "true");

    await user.clear(dialogo().getByLabelText("Título"));
    await user.type(dialogo().getByLabelText("Título"), "God of War Ragnarök");
    await user.click(dialogo().getByRole("button", { name: "Nota 9" }));
    await user.click(dialogo().getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      const patch = calls.find((c) => c.method === "PATCH");
      expect(patch?.body).toMatchObject({ title: "God of War Ragnarök", rating: 9 });
    });
  });

  it("limpa a nota quando o usuário clica em limpar", async () => {
    const user = userEvent.setup();
    handler = (_url, init) =>
      init?.method === "PATCH"
        ? { status: 200, body: game({ rating: null }) }
        : { status: 200, body: page([game({ rating: 7 })]) };

    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Editar" }));
    await user.click(dialogo().getByRole("button", { name: "limpar" }));
    await user.click(dialogo().getByRole("button", { name: "Salvar" }));

    await waitFor(() => {
      expect(calls.find((c) => c.method === "PATCH")?.body).toMatchObject({ rating: null });
    });
  });
});

describe("status", () => {
  it("atualiza otimista e desfaz quando o PATCH falha", async () => {
    const user = userEvent.setup();
    handler = (_url, init) =>
      init?.method === "PATCH"
        ? { status: 500, body: { detail: "boom" } }
        : { status: 200, body: page([game({ status: "backlog" })]) };

    render(<App />);
    const select = within(await screen.findByRole("article")).getByRole("combobox");
    expect(select).toHaveValue("backlog");

    await user.selectOptions(select, "playing");

    // Volta ao valor anterior: a UI não pode mentir sobre o que foi salvo.
    await waitFor(() => expect(select).toHaveValue("backlog"));
    expect(await screen.findByRole("status")).toHaveTextContent("boom");
  });
});

describe("remoção", () => {
  it("pede confirmação antes de remover", async () => {
    const user = userEvent.setup();
    handler = () => ({ status: 200, body: page([game()]) });

    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Remover God of War" }));
    await user.click(dialogo().getByRole("button", { name: "Cancelar" }));

    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
  });

  it("remove ao confirmar", async () => {
    const user = userEvent.setup();
    let removido = false;
    handler = (_url, init) => {
      if (init?.method === "DELETE") {
        removido = true;
        return { status: 204 };
      }
      return { status: 200, body: page(removido ? [] : [game()]) };
    };

    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Remover God of War" }));
    await user.click(dialogo().getByRole("button", { name: "Remover" }));

    expect(await screen.findByRole("status")).toHaveTextContent('"God of War" removido.');
    expect(await screen.findByText(/backlog está vazio/i)).toBeInTheDocument();
  });
});

describe("paginação", () => {
  it("navega entre páginas usando o total do envelope", async () => {
    const user = userEvent.setup();
    const primeira = Array.from({ length: 12 }, (_, i) => game({ id: i + 1, title: `Jogo ${i + 1}` }));
    handler = (url) => {
      const skip = Number(url.searchParams.get("skip") ?? 0);
      return { status: 200, body: { items: skip ? [game({ id: 13, title: "Jogo 13" })] : primeira, total: 13, skip, limit: 12 } };
    };

    render(<App />);
    expect(await screen.findByText("Jogo 1")).toBeInTheDocument();
    expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Próxima/ }));

    expect(await screen.findByText("Jogo 13")).toBeInTheDocument();
    expect(screen.getByText(/Página 2 de 2/)).toBeInTheDocument();
  });

  it("não mostra paginação quando cabe tudo numa página", async () => {
    handler = () => ({ status: 200, body: page([game()]) });

    render(<App />);
    await screen.findByRole("article");

    expect(screen.queryByRole("navigation", { name: "Paginação" })).not.toBeInTheDocument();
  });
});

describe("resumo", () => {
  it("conta o backlog inteiro, não só a página carregada", async () => {
    handler = (url) => {
      if (url.searchParams.get("limit") === "1") {
        const status = url.searchParams.get("status");
        const totais: Record<string, number> = { backlog: 5, playing: 2, finished: 8, abandoned: 1 };
        return { status: 200, body: { items: [], total: status ? totais[status] ?? 0 : 16, skip: 0, limit: 1 } };
      }
      return { status: 200, body: page([game()], 16) };
    };

    render(<App />);
    await screen.findByRole("region", { name: "Resumo do backlog" });
    const r = resumo();

    await waitFor(() => expect(r.getByRole("button", { name: /Zerado/ })).toHaveTextContent("8"));
    expect(r.getByRole("button", { name: /Todos/ })).toHaveTextContent("16");
  });
});
