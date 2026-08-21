import { useState } from "react";
import { ApiError, api, type Game, type GameStatus } from "./api/client.js";
import { ConfirmDialog } from "./components/ConfirmDialog.js";
import { Filters } from "./components/Filters.js";
import { GameCard } from "./components/GameCard.js";
import { GameFormDialog } from "./components/GameFormDialog.js";
import { Pagination } from "./components/Pagination.js";
import { Stats } from "./components/Stats.js";
import { Toaster, useToasts } from "./components/Toaster.js";
import { PAGE_SIZE, useGames } from "./hooks/useGames.js";
import { useStats } from "./hooks/useStats.js";
import "./App.css";

export default function App() {
  const {
    games, total, loading, erro, filters, page, pageCount,
    setFiltros, setPage, setErro, setGames, recarregar,
  } = useGames();
  const { counts, recarregar: recarregarStats } = useStats();
  const { toasts, mostrar } = useToasts();

  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Game | null>(null);
  const [paraRemover, setParaRemover] = useState<Game | null>(null);

  const temFiltro = Boolean(filters.search || filters.status || filters.platform);

  function abrirCriacao() {
    setEmEdicao(null);
    setFormAberto(true);
  }

  function abrirEdicao(game: Game) {
    setEmEdicao(game);
    setFormAberto(true);
  }

  async function aoSalvar(game: Game, criado: boolean) {
    mostrar(criado ? `"${game.title}" adicionado.` : `"${game.title}" atualizado.`);
    await Promise.all([recarregar(), recarregarStats()]);
  }

  async function mudarStatus(game: Game, status: GameStatus) {
    const anterior = games;
    // Otimista: a UI responde na hora e volta atrás se o servidor recusar.
    setGames((atual) => atual.map((g) => (g.id === game.id ? { ...g, status } : g)));
    try {
      await api.update(game.id, { status });
      await recarregarStats();
    } catch (error) {
      setGames(anterior);
      mostrar(error instanceof ApiError ? error.message : String(error), "erro");
    }
  }

  async function confirmarRemocao() {
    const game = paraRemover;
    if (!game) return;
    setParaRemover(null);
    try {
      await api.remove(game.id);
      mostrar(`"${game.title}" removido.`);
      await Promise.all([recarregar(), recarregarStats()]);
    } catch (error) {
      mostrar(error instanceof ApiError ? error.message : String(error), "erro");
    }
  }

  return (
    <div className="app">
      <header className="cabecalho">
        <div>
          <h1>Backlog</h1>
          <p className="cabecalho__sub">Seus jogos, do "quero jogar" ao "zerei".</p>
        </div>
        <button type="button" className="botao botao--primario" onClick={abrirCriacao}>
          + Novo jogo
        </button>
      </header>

      <Stats
        counts={counts}
        ativo={filters.status}
        onSelecionar={(status) => setFiltros({ status })}
      />

      <Filters filters={filters} onChange={setFiltros} />

      {erro && (
        <p className="alerta" role="alert">
          {erro}
          <button type="button" className="botao botao--sutil" onClick={() => { setErro(null); void recarregar(); }}>
            Tentar de novo
          </button>
        </p>
      )}

      {loading ? (
        <div className="grade" aria-busy="true" aria-label="Carregando jogos">
          {Array.from({ length: PAGE_SIZE }, (_, i) => (
            <div key={i} className="card card--esqueleto" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="vazio">
          <p className="vazio__titulo">
            {temFiltro ? "Nenhum jogo com esses filtros." : "Seu backlog está vazio."}
          </p>
          {temFiltro ? (
            <button
              type="button"
              className="botao botao--sutil"
              onClick={() => setFiltros({ search: "", status: null, platform: null })}
            >
              Limpar filtros
            </button>
          ) : (
            <button type="button" className="botao botao--primario" onClick={abrirCriacao}>
              Adicionar o primeiro
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grade">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onStatusChange={mudarStatus}
                onEdit={abrirEdicao}
                onDelete={setParaRemover}
              />
            ))}
          </div>
          <Pagination page={page} pageCount={pageCount} total={total} onChange={setPage} />
        </>
      )}

      <GameFormDialog
        game={emEdicao}
        aberto={formAberto}
        onFechar={() => setFormAberto(false)}
        onSalvo={(game, criado) => void aoSalvar(game, criado)}
      />

      <ConfirmDialog
        aberto={paraRemover !== null}
        titulo="Remover jogo"
        mensagem={`"${paraRemover?.title}" sai do seu backlog. Isso não pode ser desfeito.`}
        confirmarRotulo="Remover"
        onConfirmar={() => void confirmarRemocao()}
        onCancelar={() => setParaRemover(null)}
      />

      <Toaster toasts={toasts} />
    </div>
  );
}
