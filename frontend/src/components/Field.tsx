import { useId } from "react";

interface FieldProps {
  label: string;
  erro?: string | undefined;
  className?: string;
  /** Recebe os ids/aria já ligados ao rótulo e à mensagem de erro. */
  children: (props: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
}

/**
 * Rótulo, controle e erro com as associações corretas.
 *
 * A mensagem de erro fica FORA do <label>: dentro, ela entraria no nome
 * acessível do campo ("Título Você já tem…") e quebraria leitor de tela e
 * qualquer busca por rótulo.
 */
export function Field({ label, erro, className = "campo", children }: FieldProps) {
  const id = useId();
  const erroId = `${id}-erro`;

  return (
    <div className={className}>
      <label htmlFor={id}>{label}</label>
      {children({
        id,
        "aria-invalid": Boolean(erro),
        "aria-describedby": erro ? erroId : undefined,
      })}
      {erro && <small id={erroId} className="campo__erro">{erro}</small>}
    </div>
  );
}
