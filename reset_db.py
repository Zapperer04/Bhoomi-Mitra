from app import app, db
import os

def reset_database():
    with app.app_context():
        print("⚠ WARNING: This will permanently delete all data in the database.")
        
        # 1. Drop all tables
        print("[1/2] Dropping all tables...")
        db.drop_all()
        
        # 2. Recreate all tables (includes current models and schema)
        print("[2/2] Recreating tables with latest schema...")
        db.create_all()
        
        # 3. Optional: Clear local SQLite file if it exists (redundant but safe)
        if "sqlite" in app.config["SQLALCHEMY_DATABASE_URI"]:
            print("  -> SQLite detected. File has been refreshed.")

        print("\n✅ Database has been RESET successfully.")
        print("You can now start app.py for a fresh experience.")

if __name__ == "__main__":
    reset_database()
