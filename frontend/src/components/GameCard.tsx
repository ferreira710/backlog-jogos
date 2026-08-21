import type { Game, GameStatus } from "../api/client.js";
import { PLATFORM_LABEL, STATUS_LABEL, STATUS_ORDER, formatHours } from "../lib/labels.js";
import { Rating } from "./Rating.js";
import { StatusBadge } from "./StatusBadge.js";

interface GameCardProps {
  game: Game;
  onStatusChange: (game: Game, status: GameStatus) => void;
  onEdit: (game: Game) => void;
  onDelete: (game: Game) => void;
}

export function GameCard({ game, onStatusChange, onEdit, onDelete }: GameCardProps) {
  return (
    <article className="card" aria-label={game.title}>
      <header className="card__topo">
        <StatusBadge status={game.status} />
        <span className="card__plataforma">{PLATFORM_LABEL[game.platform]}</span>
      </header>

      <h2 className="card__titulo" title={game.title}>{game.title}</h2>

      <dl className="card__meta">
        <div>
          <dt>Nota</dt>
          <dd><Rating value={game.rating} /></dd>
        </div>
        <div>
          <dt>Tempo</dt>
          <dd>{formatHours(game.hours_played)}</dd>
        </div>
      </dl>

      <footer className="card__acoes">
        <label className="sr-only" htmlFor={`status-${game.id}`}>
          Status de {game.title}
        </label>
        <select
          id={`status-${game.id}`}
          value={game.status}
          onChange={(e) => onStatusChange(game, e.target.value as GameStatus)}
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>

        <button type="button" className="botao botao--sutil" onClick={() => onEdit(game)}>
          Editar
        </button>
        <button
          type="button"
          className="botao botao--perigo"
          onClick={() => onDelete(game)}
          aria-label={`Remover ${game.title}`}
        >
          Remover
        </button>
      </footer>
    </article>
  );
}
