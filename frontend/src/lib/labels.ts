import type { GameStatus, Platform } from "../api/client.js";

export const STATUS_ORDER: GameStatus[] = ["backlog", "playing", "finished", "abandoned"];
export const PLATFORM_ORDER: Platform[] = ["pc", "playstation", "xbox", "nintendo", "mobile"];

export const STATUS_LABEL: Record<GameStatus, string> = {
  backlog: "Backlog",
  playing: "Jogando",
  finished: "Zerado",
  abandoned: "Abandonado",
};

export const PLATFORM_LABEL: Record<Platform, string> = {
  pc: "PC",
  playstation: "PlayStation",
  xbox: "Xbox",
  nintendo: "Nintendo",
  mobile: "Mobile",
};

export function formatHours(hours: number): string {
  if (hours === 0) return "—";
  // 12.5 -> "12h30"; 12 -> "12h"
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return minutes === 0 ? `${whole}h` : `${whole}h${String(minutes).padStart(2, "0")}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
