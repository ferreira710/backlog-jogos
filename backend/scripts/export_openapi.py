"""Exporta o OpenAPI da app para backend/openapi.json, sem precisar subir servidor."""

import json
from pathlib import Path

from app.main import app

OUTPUT = Path(__file__).resolve().parent.parent / "openapi.json"


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n")
    print(f"OpenAPI escrito em {OUTPUT}")


if __name__ == "__main__":
    main()
