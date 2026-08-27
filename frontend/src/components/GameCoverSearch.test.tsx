import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExternalGameResult } from "../api/client.js";
import { GameCoverSearch } from "./GameCoverSearch.js";

type Resposta = { status: number; body?: unknown };
let handler: (url: URL) => Resposta;
const calls: URL[] = [];

beforeEach(() => {
  calls.length = 0;
  handler = () => ({ status: 200, body: [] });
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    calls.push(url);
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { status, body } = handler(url);
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
});

afterEach(() => vi.unstubAllGlobals());

/** GameCoverSearch é controlado; o wrapper faz o papel do form ao redor. */
function Wrapper({ onSelect }: { onSelect: (r: ExternalGameResult) => void }) {
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  return (
    <GameCoverSearch
      id="titulo"
      aria-invalid={false}
      aria-describedby={undefined}
      title={title}
      coverImageUrl={cover}
      onTitleChange={setTitle}
      onSelect={(r) => {
        setTitle(r.name);
        setCover(r.cover_image_url ?? null);
        onSelect(r);
      }}
      onClearCover={() => setCover(null)}
    />
  );
}

const resultado: ExternalGameResult = {
  external_id: 924900,
  name: "The Legend of Zelda",
  released: "1986-02-21",
  cover_image_url: "https://example.com/zelda.jpg",
};

describe("GameCoverSearch", () => {
  it("busca no catálogo externo e lista sugestões com capa", async () => {
    const user = userEvent.setup();
    handler = () => ({ status: 200, body: [resultado] });
    render(<Wrapper onSelect={vi.fn()} />);

    await user.type(screen.getByRole("combobox"), "zelda");

    const opcao = await screen.findByRole("option", { name: /The Legend of Zelda/ });
    expect(opcao.querySelector("img")).toHaveAttribute("src", resultado.cover_image_url);
  });

  it("selecionar uma sugestão preenche título e capa, e fecha a lista", async () => {
    const user = userEvent.setup();
    handler = () => ({ status: 200, body: [resultado] });
    const onSelect = vi.fn();
    render(<Wrapper onSelect={onSelect} />);

    await user.type(screen.getByRole("combobox"), "zelda");
    await user.click(await screen.findByRole("option", { name: /The Legend of Zelda/ }));

    expect(onSelect).toHaveBeenCalledWith(resultado);
    expect(screen.getByRole("combobox")).toHaveValue("The Legend of Zelda");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("não busca com menos de 2 caracteres", async () => {
    const user = userEvent.setup();
    render(<Wrapper onSelect={vi.fn()} />);

    await user.type(screen.getByRole("combobox"), "z");

    await new Promise((r) => setTimeout(r, 400));
    expect(calls).toHaveLength(0);
  });

  it("mostra aviso quando a busca externa está indisponível (503)", async () => {
    const user = userEvent.setup();
    handler = () => ({ status: 503, body: { detail: "RAWG_API_KEY nao configurada" } });
    render(<Wrapper onSelect={vi.fn()} />);

    await user.type(screen.getByRole("combobox"), "zelda");

    expect(await screen.findByText(/Busca de capas indisponível/)).toBeInTheDocument();
  });
});
