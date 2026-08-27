import { ApiError, toApiError } from "./errors.js";
import type { components, operations } from "./schema.js";

export type Game = components["schemas"]["GameRead"];
export type GameCreate = components["schemas"]["GameCreate"];
export type GameUpdate = components["schemas"]["GameUpdate"];
export type GamePage = components["schemas"]["GamePage"];
export type GameStatus = components["schemas"]["GameStatus"];
export type Platform = components["schemas"]["Platform"];
export type SortField = components["schemas"]["SortField"];
export type SortOrder = components["schemas"]["SortOrder"];
export type ExternalGameResult = components["schemas"]["ExternalGameResult"];

/** Derivado do spec: se o backend ganhar um filtro novo, ele aparece aqui. */
export type ListGamesParams = NonNullable<
  operations["list_games_games_get"]["parameters"]["query"]
>;

export type HealthStatus = { status: string; database: string };

export {
  ApiError,
  ConflictError,
  NotFoundError,
  ValidationFailedError,
} from "./errors.js";

export interface ClientOptions {
  /** Ex.: import.meta.env.VITE_API_URL ?? "http://localhost:8000" */
  baseUrl: string;
  /** Injetável para testes; por padrão usa o fetch global. */
  fetch?: typeof globalThis.fetch;
}

/** Só aceita AbortSignal — o resto do RequestInit é controlado pelo client. */
export interface RequestOptions {
  signal?: AbortSignal;
}

function buildQuery(params: Record<string, unknown> | undefined): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    // undefined e null significam "não filtrar"; string vazia idem.
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function createGamesClient({ baseUrl, fetch: fetchImpl }: ClientOptions) {
  // Resolvido a cada chamada, nao na construcao: capturar globalThis.fetch aqui
  // congelaria o client contra qualquer instrumentacao posterior (MSW, testes).
  const doFetch: typeof globalThis.fetch = (...args) =>
    (fetchImpl ?? globalThis.fetch)(...args);
  const root = baseUrl.replace(/\/+$/, "");

  async function request<T>(
    method: string,
    path: string,
    { body, query, signal }: { body?: unknown; query?: Record<string, unknown>; signal?: AbortSignal } = {},
  ): Promise<T> {
    let response: Response;
    try {
      response = await doFetch(`${root}${path}${buildQuery(query)}`, {
        method,
        signal,
        headers: body === undefined ? undefined : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (cause) {
      // AbortError precisa passar direto: react-query e useEffect dependem dele.
      if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
      throw new ApiError(0, cause, "Não foi possível falar com a API");
    }

    if (response.status === 204) return undefined as T;

    const payload = await response.json().catch(() => undefined);

    if (!response.ok) {
      const detail =
        payload && typeof payload === "object" && "detail" in payload
          ? (payload as { detail: unknown }).detail
          : payload;
      throw toApiError(response.status, detail);
    }

    return payload as T;
  }

  return {
    /** `GET /health` — lança ApiError com status 503 se o banco estiver fora. */
    health: (options: RequestOptions = {}) =>
      request<HealthStatus>("GET", "/health", options),

    /** `GET /games` — devolve o envelope `{ items, total, skip, limit }`. */
    list: (params: ListGamesParams = {}, options: RequestOptions = {}) =>
      request<GamePage>("GET", "/games", { query: params, ...options }),

    /** `GET /games/{id}` — lança NotFoundError se não existir. */
    get: (id: number, options: RequestOptions = {}) =>
      request<Game>("GET", `/games/${id}`, options),

    /** `POST /games` — lança ConflictError se já existe na plataforma. */
    create: (payload: GameCreate, options: RequestOptions = {}) =>
      request<Game>("POST", "/games", { body: payload, ...options }),

    /** `PATCH /games/{id}` — parcial; omita campos para não alterá-los. */
    update: (id: number, payload: GameUpdate, options: RequestOptions = {}) =>
      request<Game>("PATCH", `/games/${id}`, { body: payload, ...options }),

    /** `DELETE /games/{id}` — resolve sem valor; lança NotFoundError se sumiu. */
    remove: (id: number, options: RequestOptions = {}) =>
      request<void>("DELETE", `/games/${id}`, options),

    /** `GET /games/external-search` — catálogo externo (RAWG); 503 se não configurado. */
    searchExternal: (q: string, options: RequestOptions = {}) =>
      request<ExternalGameResult[]>("GET", "/games/external-search", { query: { q }, ...options }),
  };
}

export type GamesClient = ReturnType<typeof createGamesClient>;
