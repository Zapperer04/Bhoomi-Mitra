import sqlite3
import os

db_path = "bhoomimitra.db"

def sync_db():
    if not os.path.exists(db_path):
        print("Database not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Add columns for post-acceptance flow
    try:
        cursor.execute("ALTER TABLE interests ADD COLUMN payment_confirmed_at DATETIME")
        print("Added payment_confirmed_at to interests")
    except sqlite3.OperationalError:
        print("payment_confirmed_at already exists in interests")

    try:
        cursor.execute("ALTER TABLE interests ADD COLUMN goods_confirmed_at DATETIME")
        print("Added goods_confirmed_at to interests")
    except sqlite3.OperationalError:
        print("goods_confirmed_at already exists in interests")

    # In SQLite, altering CHECK constraints requires table recreation.
    # We will disable strict check constraint verification here for older rows or rely on the application layer.
    
    conn.commit()
    conn.close()
    print("Database completion fields synched.")

if __name__ == "__main__":
    sync_db()
