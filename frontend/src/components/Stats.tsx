import type { GameStatus } from "../api/client.js";
import type { Counts } from "../hooks/useStats.js";
import { STATUS_LABEL, STATUS_ORDER } from "../lib/labels.js";

interface StatsProps {
  counts: Counts | null;
  ativo: GameStatus | null;
  onSelecionar: (status: GameStatus | null) => void;
}

export function Stats({ counts, ativo, onSelecionar }: StatsProps) {
  return (
    <section className="stats" aria-label="Resumo do backlog">
      <button
        type="button"
        className={`stat${ativo === null ? " is-ativo" : ""}`}
        aria-pressed={ativo === null}
        onClick={() => onSelecionar(null)}
      >
        <span className="stat__valor">{counts?.total ?? "–"}</span>
        <span className="stat__rotulo">Todos</span>
      </button>

      {STATUS_ORDER.map((status) => (
        <button
          key={status}
          type="button"
          className={`stat stat--${status}${ativo === status ? " is-ativo" : ""}`}
          aria-pressed={ativo === status}
          onClick={() => onSelecionar(ativo === status ? null : status)}
        >
          <span className="stat__valor">{counts?.[status] ?? "–"}</span>
          <span className="stat__rotulo">{STATUS_LABEL[status]}</span>
        </button>
      ))}
    </section>
  );
}
