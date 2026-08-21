import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  ConflictError,
  ValidationFailedError,
  api,
  type Game,
  type GameStatus,
  type Platform,
} from "../api/client.js";
import { PLATFORM_LABEL, PLATFORM_ORDER, STATUS_LABEL, STATUS_ORDER } from "../lib/labels.js";
import { Field } from "./Field.js";
import { Rating } from "./Rating.js";

interface GameFormDialogProps {
  /** null = criar; um Game = editar. */
  game: Game | null;
  aberto: boolean;
  onFechar: () => void;
  onSalvo: (game: Game, criado: boolean) => void;
}

interface FormState {
  title: string;
  platform: Platform;
  status: GameStatus;
  rating: number | null;
  hours_played: string;
}

function estadoInicial(game: Game | null): FormState {
  return {
    title: game?.title ?? "",
    platform: game?.platform ?? "pc",
    status: game?.status ?? "backlog",
    rating: game?.rating ?? null,
    hours_played: game ? String(game.hours_played) : "0",
  };
}

export function GameFormDialog({ game, aberto, onFechar, onSalvo }: GameFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<FormState>(() => estadoInicial(game));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [errosDeCampo, setErrosDeCampo] = useState<Record<string, string>>({});

  // Reabrir o diálogo tem de recomeçar do estado do jogo, não do rascunho anterior.
  useEffect(() => {
    if (aberto) {
      setForm(estadoInicial(game));
      setErro(null);
      setErrosDeCampo({});
    }
  }, [aberto, game]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // showModal dá foco preso, Esc e backdrop de graça — sem lib de modal.
    if (aberto && !dialog.open) dialog.showModal();
    if (!aberto && dialog.open) dialog.close();
  }, [aberto]);

  function atualizar<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function submeter(event: React.FormEvent) {
    event.preventDefault();
    setSalvando(true);
    setErro(null);
    setErrosDeCampo({});

    const horas = Number(form.hours_played);
    if (!Number.isFinite(horas) || horas < 0) {
      setErrosDeCampo({ hours_played: "Informe um número de horas válido." });
      setSalvando(false);
      return;
    }

    const payload = {
      title: form.title.trim(),
      platform: form.platform,
      status: form.status,
      rating: form.rating,
      hours_played: horas,
    };

    try {
      const salvo = game
        ? await api.update(game.id, payload)
        : await api.create(payload);
      onSalvo(salvo, game === null);
      onFechar();
    } catch (error) {
      if (error instanceof ConflictError) {
        setErrosDeCampo({
          title: `Você já tem "${payload.title}" em ${PLATFORM_LABEL[payload.platform]}.`,
        });
      } else if (error instanceof ValidationFailedError) {
        setErrosDeCampo(error.fieldErrors);
      } else {
        setErro(error instanceof ApiError ? error.message : String(error));
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="dialogo" onCancel={onFechar} onClose={onFechar}>
      <form onSubmit={submeter} className="dialogo__form">
        <h2>{game ? "Editar jogo" : "Novo jogo"}</h2>

        <Field label="Título" erro={errosDeCampo.title}>
          {(aria) => (
            <input
              {...aria}
              value={form.title}
              onChange={(e) => atualizar("title", e.target.value)}
              placeholder="Ex.: Hollow Knight"
              maxLength={120}
              required
              autoFocus
            />
          )}
        </Field>

        <div className="dialogo__linha">
          <Field label="Plataforma">
            {(aria) => (
              <select
                {...aria}
                value={form.platform}
                onChange={(e) => atualizar("platform", e.target.value as Platform)}
              >
                {PLATFORM_ORDER.map((p) => (
                  <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Status">
            {(aria) => (
              <select
                {...aria}
                value={form.status}
                onChange={(e) => atualizar("status", e.target.value as GameStatus)}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Horas" erro={errosDeCampo.hours_played} className="campo campo--curto">
            {(aria) => (
              <input
                {...aria}
                type="number"
                min={0}
                step="0.5"
                value={form.hours_played}
                onChange={(e) => atualizar("hours_played", e.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="campo">
          <span className="campo__rotulo">Nota</span>
          <Rating value={form.rating} onChange={(v) => atualizar("rating", v)} />
          {errosDeCampo.rating && <small className="campo__erro">{errosDeCampo.rating}</small>}
        </div>

        {erro && <p className="alerta" role="alert">{erro}</p>}

        <footer className="dialogo__acoes">
          <button type="button" className="botao botao--sutil" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="botao botao--primario" disabled={salvando}>
            {salvando ? "Salvando…" : game ? "Salvar" : "Adicionar"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
