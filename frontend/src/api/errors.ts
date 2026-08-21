import type { components } from "./schema.js";

type ValidationDetail = components["schemas"]["ValidationError"];

/** Erro base: toda resposta HTTP fora da faixa 2xx vira uma destas. */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, detail: unknown, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

/** 404 — o jogo não existe (ou foi apagado em outra aba). */
export class NotFoundError extends ApiError {
  constructor(detail: unknown) {
    super(404, detail, typeof detail === "string" ? detail : "Jogo não encontrado");
    this.name = "NotFoundError";
  }
}

/** 409 — já existe esse título nessa plataforma. Mostre na UI, não é bug. */
export class ConflictError extends ApiError {
  constructor(detail: unknown) {
    super(409, detail, typeof detail === "string" ? detail : "Jogo já cadastrado");
    this.name = "ConflictError";
  }
}

/** 422 — payload rejeitado pelo backend. `fieldErrors` mapeia campo -> mensagem. */
export class ValidationFailedError extends ApiError {
  readonly errors: ValidationDetail[];

  constructor(detail: unknown) {
    const errors = Array.isArray(detail) ? (detail as ValidationDetail[]) : [];
    super(422, detail, errors[0]?.msg ?? "Dados inválidos");
    this.name = "ValidationFailedError";
    this.errors = errors;
  }

  /** Pronto para preencher mensagens de erro por campo num formulário. */
  get fieldErrors(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const error of this.errors) {
      // loc é ["body", "title"]; o nome do campo é o último segmento.
      const field = error.loc.at(-1);
      if (field !== undefined && !(String(field) in result)) {
        result[String(field)] = error.msg;
      }
    }
    return result;
  }
}

export function toApiError(status: number, detail: unknown): ApiError {
  switch (status) {
    case 404:
      return new NotFoundError(detail);
    case 409:
      return new ConflictError(detail);
    case 422:
      return new ValidationFailedError(detail);
    default:
      return new ApiError(
        status,
        detail,
        typeof detail === "string" ? detail : `Erro HTTP ${status}`,
      );
  }
}
