import type { GameStatus } from "../api/client.js";
import { STATUS_LABEL } from "../lib/labels.js";

export function StatusBadge({ status }: { status: GameStatus }) {
  return (
    <span className={`badge badge--${status}`}>{STATUS_LABEL[status]}</span>
  );
}
