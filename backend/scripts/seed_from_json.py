#!/usr/bin/env python3
"""CLI: load fixtures/seed.json into the database."""
from __future__ import annotations

import sys
from pathlib import Path

from app.db import SessionLocal
from app.services.seed_data import SEED_PATH, load_seed_from_file


def main() -> None:
    if not SEED_PATH.exists():
        print(f"Missing {SEED_PATH}", file=sys.stderr)
        sys.exit(1)
    db = SessionLocal()
    try:
        load_seed_from_file(db)
        db.commit()
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
