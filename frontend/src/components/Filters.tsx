import type { Platform } from "../api/client.js";
import type { SortField } from "../api/index.js";
import type { Filters as FiltrosState } from "../hooks/useGames.js";
import { PLATFORM_LABEL, PLATFORM_ORDER, STATUS_LABEL, STATUS_ORDER } from "../lib/labels.js";

const ORDENACOES: { campo: SortField; rotulo: string }[] = [
  { campo: "created_at", rotulo: "Adicionado" },
  { campo: "title", rotulo: "Título" },
  { campo: "rating", rotulo: "Nota" },
  { campo: "hours_played", rotulo: "Horas" },
];

interface FiltersProps {
  filters: FiltrosState;
  onChange: (mudanca: Partial<FiltrosState>) => void;
}

export function Filters({ filters, onChange }: FiltersProps) {
  return (
    <section className="filtros" aria-label="Filtros">
      <input
        type="search"
        className="filtros__busca"
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        placeholder="Buscar por título…"
        aria-label="Buscar por título"
      />

      <div className="chips" role="group" aria-label="Filtrar por status">
        <button
          type="button"
          className={`chip${filters.status === null ? " is-ativo" : ""}`}
          aria-pressed={filters.status === null}
          onClick={() => onChange({ status: null })}
        >
          Todos
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            className={`chip chip--${s}${filters.status === s ? " is-ativo" : ""}`}
            aria-pressed={filters.status === s}
            onClick={() => onChange({ status: filters.status === s ? null : s })}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="filtros__selects">
        <label className="campo campo--inline">
          <span>Plataforma</span>
          <select
            value={filters.platform ?? ""}
            onChange={(e) =>
              onChange({ platform: e.target.value ? (e.target.value as Platform) : null })
            }
          >
            <option value="">Todas</option>
            {PLATFORM_ORDER.map((p) => (
              <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>
            ))}
          </select>
        </label>

        <label className="campo campo--inline">
          <span>Ordenar por</span>
          <select
            value={filters.sort}
            onChange={(e) => onChange({ sort: e.target.value as SortField })}
          >
            {ORDENACOES.map(({ campo, rotulo }) => (
              <option key={campo} value={campo}>{rotulo}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="botao botao--sutil"
          onClick={() => onChange({ order: filters.order === "asc" ? "desc" : "asc" })}
          aria-label={`Ordem ${filters.order === "asc" ? "crescente" : "decrescente"}`}
          title={filters.order === "asc" ? "Crescente" : "Decrescente"}
        >
          {filters.order === "asc" ? "↑" : "↓"}
        </button>
      </div>
    </section>
  );
}
