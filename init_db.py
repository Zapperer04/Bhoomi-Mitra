import os
import logging
from app import app, db
from sqlalchemy import text
from models import Crop, Interest, Message, User, Waitlist

# ================= LOGGING SETUP =================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

def init_database():
    with app.app_context():
        logger.info("Initializing database...")
        db.create_all()

        with db.engine.connect() as conn:
            is_postgres = "postgresql" in str(db.engine.url)
            
            def add_col_if_missing(table, column, col_type):
                if is_postgres:
                    check = text(f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND column_name='{column}'")
                else:
                    check = text(f"PRAGMA table_info({table})")
                
                try:
                    res = conn.execute(check)
                    if is_postgres:
                        exists = res.fetchone() is not None
                    else:
                        exists = any(row[1] == column for row in res.fetchall())
                    
                    if not exists:
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
                        conn.commit()
                        logger.info(f"[MIGRATION] Added {column} to {table}")
                except Exception as e:
                    conn.rollback()
                    logger.warning(f"[MIGRATION_SKIP] Could not add {column} to {table}: {str(e)}")

            # Migrations
            ts_type = "TIMESTAMP" if is_postgres else "DATETIME"
            add_col_if_missing("interests", "finalized_at", ts_type)
            add_col_if_missing("crops", "expires_at", ts_type)
            add_col_if_missing("interests", "last_activity_at", ts_type)
            add_col_if_missing("interests", "payment_confirmed_at", ts_type)
            add_col_if_missing("interests", "goods_confirmed_at", ts_type)
            add_col_if_missing("messages", "nonce", "VARCHAR(64)")

            # Indices
            try:
                if is_postgres:
                    conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_nonce ON messages(nonce)"))
                else:
                    conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_nonce ON messages(nonce)"))
                conn.commit()
            except Exception as e:
                try: conn.rollback()
                except: pass
                logger.warning(f"[INIT_INDEX_SKIP] {str(e)}")

        logger.info("Database initialization complete.")

if __name__ == "__main__":
    init_database()
