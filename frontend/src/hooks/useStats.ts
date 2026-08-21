import { useCallback, useEffect, useState } from "react";
import { api, type GameStatus } from "../api/client.js";
import { STATUS_ORDER } from "../lib/labels.js";

export type Counts = Record<GameStatus, number> & { total: number };

/**
 * Contagens do backlog inteiro, não só da página carregada.
 *
 * Usa `total` do envelope com `limit=1`: o backend já conta respeitando o
 * filtro, então não é preciso baixar os registros para somá-los no cliente.
 */
export function useStats() {
  const [counts, setCounts] = useState<Counts | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const [geral, ...porStatus] = await Promise.all([
        api.list({ limit: 1 }),
        ...STATUS_ORDER.map((status) => api.list({ status, limit: 1 })),
      ]);
      const contagem = { total: geral.total } as Counts;
      STATUS_ORDER.forEach((status, i) => {
        contagem[status] = porStatus[i]?.total ?? 0;
      });
      setCounts(contagem);
    } catch {
      // Números de resumo não valem uma tela de erro: a lista já reporta falhas.
      setCounts(null);
    }
  }, []);

  useEffect(() => void recarregar(), [recarregar]);

  return { counts, recarregar };
}
