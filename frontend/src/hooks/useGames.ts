import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  api,
  type Game,
  type GameStatus,
  type Platform,
} from "../api/client.js";
import type { SortField, SortOrder } from "../api/index.js";

export const PAGE_SIZE = 12;

export interface Filters {
  search: string;
  status: GameStatus | null;
  platform: Platform | null;
  sort: SortField;
  order: SortOrder;
}

export const INITIAL_FILTERS: Filters = {
  search: "",
  status: null,
  platform: null,
  sort: "created_at",
  order: "desc",
};

export function useGames() {
  const [filters, setFiltersState] = useState<Filters>(INITIAL_FILTERS);
  const [page, setPage] = useState(0);
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Guarda o pedido mais recente: respostas fora de ordem nao podem
  // sobrescrever um resultado mais novo.
  const requestId = useRef(0);

  const carregar = useCallback(
    async (atuais: Filters, pagina: number, signal?: AbortSignal) => {
      const id = ++requestId.current;
      setLoading(true);
      try {
        const resposta = await api.list(
          {
            search: atuais.search || undefined,
            status: atuais.status ?? undefined,
            platform: atuais.platform ?? undefined,
            sort: atuais.sort,
            order: atuais.order,
            skip: pagina * PAGE_SIZE,
            limit: PAGE_SIZE,
          },
          { signal },
        );
        if (id !== requestId.current) return;
        setGames(resposta.items);
        setTotal(resposta.total);
        setErro(null);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (id !== requestId.current) return;
        setErro(error instanceof ApiError ? error.message : String(error));
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    // Debounce so para a busca digitada; trocar filtro deve responder na hora.
    const atraso = filters.search ? 250 : 0;
    const timer = setTimeout(() => void carregar(filters, page, controller.signal), atraso);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filters, page, carregar]);

  const recarregar = useCallback(
    () => carregar(filters, page),
    [carregar, filters, page],
  );

  const setFiltros = useCallback((mudanca: Partial<Filters>) => {
    setFiltersState((atual) => ({ ...atual, ...mudanca }));
    // Qualquer filtro novo invalida a pagina atual: a pagina 3 pode nao existir.
    setPage(0);
  }, []);

  return {
    games,
    total,
    loading,
    erro,
    filters,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    setFiltros,
    setPage,
    setErro,
    setGames,
    recarregar,
  };
}
