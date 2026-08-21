import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  confirmarRotulo?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function ConfirmDialog({
  aberto,
  titulo,
  mensagem,
  confirmarRotulo = "Confirmar",
  onConfirmar,
  onCancelar,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (aberto && !dialog.open) dialog.showModal();
    if (!aberto && dialog.open) dialog.close();
  }, [aberto]);

  return (
    <dialog ref={dialogRef} className="dialogo dialogo--estreito" onCancel={onCancelar} onClose={onCancelar}>
      <div className="dialogo__form">
        <h2>{titulo}</h2>
        <p>{mensagem}</p>
        <footer className="dialogo__acoes">
          <button type="button" className="botao botao--sutil" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className="botao botao--perigo" onClick={onConfirmar} autoFocus>
            {confirmarRotulo}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
