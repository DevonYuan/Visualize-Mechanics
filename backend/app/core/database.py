"""Database module for storing the NIM API key in SQLite."""
import os
import sqlite3
import sys
from pathlib import Path
from typing import Optional


def get_data_dir() -> Path:
    """Get the OS-specific data directory for the application.

    Windows: %APPDATA%/Visualize Mechanics
    macOS: ~/Library/Application Support/Visualize Mechanics
    Linux: ~/.config/visualize-mechanics (or XDG_CONFIG_HOME if set)
    """
    if sys.platform == "win32":
        # Windows: %APPDATA%
        base = os.getenv("APPDATA")
        if not base:
            base = os.path.expanduser("~\\AppData\\Roaming")
        return Path(base) / "Visualize Mechanics"
    elif sys.platform == "darwin":
        # macOS: ~/Library/Application Support
        return Path.home() / "Library" / "Application Support" / "Visualize Mechanics"
    else:
        # Linux/Unix: XDG_CONFIG_HOME or ~/.config
        base = os.getenv("XDG_CONFIG_HOME")
        if not base:
            base = os.path.expanduser("~/.config")
        return Path(base) / "visualize-mechanics"


def get_db_path() -> Path:
    """Get the path to the SQLite database file in the OS-specific data directory."""
    data_dir = get_data_dir()
    # Ensure the directory exists
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "visualize.db"


def init_db(db_path: Optional[Path] = None) -> None:
    """Initialize the database and create the table if it doesn't exist."""
    if db_path is None:
        db_path = get_db_path()

    # Ensure the directory exists
    db_path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        conn.commit()


def get_nim_api_key(db_path: Optional[Path] = None) -> Optional[str]:
    """Get the NIM API key from the database."""
    if db_path is None:
        db_path = get_db_path()

    if not db_path.exists():
        return None

    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?", ("nim_api_key",))
        row = cursor.fetchone()
        return row[0] if row else None


def set_nim_api_key(api_key: str, db_path: Optional[Path] = None) -> None:
    """Set the NIM API key in the database."""
    if db_path is None:
        db_path = get_db_path()

    init_db(db_path)

    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
            ("nim_api_key", api_key),
        )
        conn.commit()


def delete_nim_api_key(db_path: Optional[Path] = None) -> None:
    """Delete the NIM API key from the database."""
    if db_path is None:
        db_path = get_db_path()

    if not db_path.exists():
        return

    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM settings WHERE key = ?", ("nim_api_key",))
        conn.commit()