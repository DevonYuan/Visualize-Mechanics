#!/usr/bin/env python
"""CLI tool to manage the NIM API key in the SQLite database."""
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.core.database import get_nim_api_key, set_nim_api_key, delete_nim_api_key, get_db_path


def main():
    if len(sys.argv) < 2:
        print("Usage: python manage_nim_key.py <command> [args]")
        print("Commands:")
        print("  get     - Get the current NIM API key")
        print("  set <key>  - Set the NIM API key")
        print("  delete  - Delete the NIM API key")
        print("  path    - Show database path")
        sys.exit(1)

    command = sys.argv[1]

    if command == "get":
        key = get_nim_api_key()
        if key:
            print(f"NIM_API_KEY: {key}")
        else:
            print("No NIM API key found in database")
            sys.exit(1)

    elif command == "set":
        if len(sys.argv) < 3:
            print("Usage: python manage_nim_key.py set <key>")
            sys.exit(1)
        key = sys.argv[2]
        set_nim_api_key(key)
        print(f"NIM API key set in database: {get_db_path()}")

    elif command == "delete":
        delete_nim_api_key()
        print("NIM API key deleted from database")

    elif command == "path":
        print(f"Database path: {get_db_path()}")

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()