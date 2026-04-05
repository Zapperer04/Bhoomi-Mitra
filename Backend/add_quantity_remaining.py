"""
add_quantity_remaining.py
─────────────────────────
Run this ONCE to add the quantity_remaining column to your existing database.
SQLite doesn't support ALTER TABLE ADD COLUMN with constraints, so we do it
directly via sqlite3 then backfill via SQLAlchemy.

Usage (from your backend folder with venv active):
    python add_quantity_remaining.py
"""

import os, sys, sqlite3
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "instance", "chatbot.db")

if not os.path.exists(DB_PATH):
    print(f"❌ Database not found at: {DB_PATH}")
    print("   Check the path and try again.")
    sys.exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(crops)")
columns = [row[1] for row in cursor.fetchall()]

if "quantity_remaining" in columns:
    print("✅ quantity_remaining column already exists. Nothing to do.")
    conn.close()
    sys.exit(0)

print("Adding quantity_remaining column to crops table...")
cursor.execute("ALTER TABLE crops ADD COLUMN quantity_remaining INTEGER")
conn.commit()
conn.close()
print("✅ Column added.")

print("Backfilling quantity_remaining for existing crops...")

from app import app
from models import db, Crop, Interest

with app.app_context():
    crops = Crop.query.all()
    updated = 0

    for crop in crops:
        accepted = Interest.query.filter_by(crop_id=crop.id, status="accepted").all()
        sold_qty = sum(i.quantity_requested for i in accepted)
        crop.quantity_remaining = max(0, crop.quantity - sold_qty)

        updated += 1

    db.session.commit()
    print(f"✅ Backfilled {updated} crops.")
