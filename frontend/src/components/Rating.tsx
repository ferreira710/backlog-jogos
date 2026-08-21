interface RatingProps {
  value: number | null;
  /** Sem onChange o componente vira somente leitura. */
  onChange?: (value: number | null) => void;
}

/** Nota de 0 a 10, igual ao backend. Clicar de novo no mesmo valor limpa. */
export function Rating({ value, onChange }: RatingProps) {
  const readOnly = onChange === undefined;

  if (readOnly) {
    return value === null ? (
      <span className="rating rating--vazia">sem nota</span>
    ) : (
      <span className="rating">
        <strong>{value}</strong>
        <span className="rating__max">/10</span>
      </span>
    );
  }

  return (
    <div className="rating-input" role="group" aria-label="Nota">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          className={`rating-input__dot${value !== null && n <= value ? " is-on" : ""}`}
          aria-label={`Nota ${n}`}
          aria-pressed={value !== null && n <= value}
          onClick={() => onChange(value === n ? null : n)}
        >
          {n}
        </button>
      ))}
      {value !== null && (
        <button type="button" className="rating-input__limpar" onClick={() => onChange(null)}>
          limpar
        </button>
      )}
    </div>
  );
}
