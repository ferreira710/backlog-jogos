import { useCallback, useRef, useState } from "react";

export interface Toast {
  id: number;
  texto: string;
  tipo: "ok" | "erro";
}

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const proximoId = useRef(0);

  const mostrar = useCallback((texto: string, tipo: Toast["tipo"] = "ok") => {
    const id = proximoId.current++;
    setToasts((atual) => [...atual, { id, texto, tipo }]);
    setTimeout(() => setToasts((atual) => atual.filter((t) => t.id !== id)), 4000);
  }, []);

  return { toasts, mostrar };
}

export function Toaster({ toasts }: { toasts: Toast[] }) {
  return (
    // aria-live: leitores de tela anunciam sem roubar o foco do usuário.
    <div className="toaster" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tipo}`} role="status">
          {toast.texto}
        </div>
      ))}
    </div>
  );
}
