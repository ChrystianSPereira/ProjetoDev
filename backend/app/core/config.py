"""Application configuration values loaded from environment."""

import os
from pathlib import Path

from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=ENV_PATH)

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "").strip()
if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY não configurada no ambiente.")
if JWT_SECRET_KEY in {"change-me-in-production", "troque-esta-chave-antes-de-produzir"}:
    raise RuntimeError("JWT_SECRET_KEY insegura. Defina uma chave forte no .env.")

JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")

try:
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
except ValueError as exc:
    raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES deve ser um numero inteiro.") from exc

if ACCESS_TOKEN_EXPIRE_MINUTES <= 0:
    raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES deve ser maior que zero.")

