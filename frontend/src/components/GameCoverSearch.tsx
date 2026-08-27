import { useEffect, useRef, useState } from "react";
import { ApiError, api, type ExternalGameResult } from "../api/client.js";

interface GameCoverSearchProps {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
  title: string;
  coverImageUrl: string | null;
  onTitleChange: (title: string) => void;
  onSelect: (result: ExternalGameResult) => void;
  onClearCover: () => void;
}

/**
 * Campo de título com autocomplete no catálogo externo (RAWG).
 *
 * Digitar é sempre permitido (o jogo pode não existir lá); selecionar uma
 * sugestão só substitui título + capa, nunca bloqueia a digitação livre.
 */
export function GameCoverSearch({
  id,
  title,
  coverImageUrl,
  onTitleChange,
  onSelect,
  onClearCover,
  ...aria
}: GameCoverSearchProps) {
  const [resultados, setResultados] = useState<ExternalGameResult[]>([]);
  const [aberto, setAberto] = useState(false);
  const [indexAtivo, setIndexAtivo] = useState(-1);
  const [indisponivel, setIndisponivel] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce + cancelamento: só a última resposta importa, e a RAWG não
  // precisa de uma requisição por tecla digitada.
  useEffect(() => {
    const termo = title.trim();
    if (termo.length < 2) {
      setResultados([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .searchExternal(termo, { signal: controller.signal })
        .then((items) => {
          setResultados(items);
          setIndisponivel(false);
          setIndexAtivo(-1);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setResultados([]);
          setIndisponivel(error instanceof ApiError && error.status === 503);
        });
    }, 350);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [title]);

  useEffect(() => {
    function aoClicarFora(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function selecionar(resultado: ExternalGameResult) {
    onSelect(resultado);
    setAberto(false);
    setResultados([]);
  }

  function aoTeclar(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!mostrarLista) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIndexAtivo((i) => Math.min(i + 1, resultados.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIndexAtivo((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && indexAtivo >= 0) {
      event.preventDefault();
      const resultado = resultados[indexAtivo];
      if (resultado) selecionar(resultado);
    } else if (event.key === "Escape") {
      setAberto(false);
    }
  }

  const mostrarLista = aberto && resultados.length > 0;
  const listaId = `${id}-lista`;

  return (
    <div className="busca-capa" ref={containerRef}>
      <div className="busca-capa__linha">
        <span className="busca-capa__miniatura-slot">
          {coverImageUrl && <img src={coverImageUrl} alt="" className="busca-capa__miniatura" />}
        </span>
        <input
          {...aria}
          id={id}
          type="text"
          value={title}
          onChange={(e) => {
            onTitleChange(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
          onKeyDown={aoTeclar}
          placeholder="Ex.: Hollow Knight"
          maxLength={120}
          required
          autoFocus
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={mostrarLista}
          aria-controls={listaId}
        />
        {coverImageUrl && (
          <button
            type="button"
            className="botao botao--sutil busca-capa__limpar"
            onClick={onClearCover}
          >
            Remover capa
          </button>
        )}
      </div>

      {mostrarLista && (
        <ul className="busca-capa__lista" role="listbox" id={listaId}>
          {resultados.map((resultado, i) => (
            <li key={resultado.external_id}>
              <button
                type="button"
                role="option"
                aria-selected={i === indexAtivo}
                className={`busca-capa__item${i === indexAtivo ? " is-ativo" : ""}`}
                // Sem isso o blur do input fecha a lista antes do click registrar.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selecionar(resultado)}
              >
                {resultado.cover_image_url ? (
                  <img src={resultado.cover_image_url} alt="" className="busca-capa__miniatura" />
                ) : (
                  <span className="busca-capa__miniatura busca-capa__miniatura--vazia" aria-hidden="true" />
                )}
                <span className="busca-capa__info">
                  <span className="busca-capa__nome">{resultado.name}</span>
                  {resultado.released && (
                    <span className="busca-capa__ano">{resultado.released.slice(0, 4)}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {indisponivel && <p className="busca-capa__aviso">Busca de capas indisponível no momento.</p>}
    </div>
  );
}
