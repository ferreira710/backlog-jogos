interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageCount, total, onChange }: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav className="paginacao" aria-label="Paginação">
      <button
        type="button"
        className="botao botao--sutil"
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
      >
        ← Anterior
      </button>
      <span aria-live="polite">
        Página {page + 1} de {pageCount} · {total} {total === 1 ? "jogo" : "jogos"}
      </span>
      <button
        type="button"
        className="botao botao--sutil"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount - 1}
      >
        Próxima →
      </button>
    </nav>
  );
}
