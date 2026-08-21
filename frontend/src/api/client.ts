import { createGamesClient } from "./index.js";

export const api = createGamesClient({
  baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
});

export type { Game, GameCreate, GameStatus, Platform } from "./index.js";
export { ApiError, ConflictError, NotFoundError, ValidationFailedError } from "./index.js";
