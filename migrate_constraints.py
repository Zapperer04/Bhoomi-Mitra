"""
Migration: add quantity_remaining, accepted_by, and DB constraints.
Run ONCE after deploying the new app.py.

Usage:
    python migrate_constraints.py

Safe to re-run - every step is guarded.
"""

import os, sys

# Import the Flask app so we use its EXACT engine — no path recomputation.
try:
    from app import app, db
except Exception as e:
    print("ERROR importing app: " + str(e))
    sys.exit(1)

import sqlalchemy as sa

db_url = app.config["SQLALCHEMY_DATABASE_URI"]
IS_POSTGRES = db_url.startswith("postgresql://") or db_url.startswith("postgres://")

print("Engine : " + ("PostgreSQL" if IS_POSTGRES else "SQLite"))
print("DB URL : " + db_url[:80])
print()

# Run everything inside Flask's app context so db.engine points to the
# correct, already-resolved file — no second engine, no path mismatch.
with app.app_context():

    # ── Step 0: create tables if they don't exist yet ────────────────────────
    print("[0/5] Running db.create_all()...")
    db.create_all()
    print("  -> Done.")
    print()

    # Use Flask's own engine connection
    conn = db.engine.connect()

    # ── Verify tables ─────────────────────────────────────────────────────────
    if not IS_POSTGRES:
        rows   = conn.execute(sa.text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
        tables = {r[0] for r in rows}
    else:
        rows   = conn.execute(sa.text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
        )).fetchall()
        tables = {r[0] for r in rows}

    REQUIRED = {"users", "crops", "interests", "messages"}
    missing  = REQUIRED - tables
    if missing:
        print("ERROR: Tables still missing: " + str(missing))
        print("Check your models.py and try again.")
        conn.close()
        sys.exit(1)

    print("Tables : " + str(sorted(tables)))
    print()

    # ── Step 1: quantity_remaining column on crops ────────────────────────────
    print("[1/5] Checking quantity_remaining on crops...")
    if IS_POSTGRES:
        r = conn.execute(sa.text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='crops' AND column_name='quantity_remaining'"
        ))
        col_exists = r.fetchone() is not None
    else:
        r = conn.execute(sa.text("PRAGMA table_info(crops)"))
        col_exists = any(row[1] == "quantity_remaining" for row in r.fetchall())

    if not col_exists:
        conn.execute(sa.text("ALTER TABLE crops ADD COLUMN quantity_remaining INTEGER"))
        conn.commit()
        print("  -> Added.")
    else:
        print("  -> Already exists, skipping.")

    # ── Step 2: backfill quantity_remaining ───────────────────────────────────
    print()
    print("[2/5] Backfilling quantity_remaining for NULL rows...")
    r = conn.execute(sa.text(
        "UPDATE crops SET quantity_remaining = quantity WHERE quantity_remaining IS NULL"
    ))
    conn.commit()
    print("  -> Updated " + str(r.rowcount) + " row(s).")

    # ── Step 3: accepted_by column on interests ───────────────────────────────
    print()
    print("[3/5] Checking accepted_by on interests...")
    if IS_POSTGRES:
        r = conn.execute(sa.text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='interests' AND column_name='accepted_by'"
        ))
        col_exists = r.fetchone() is not None
    else:
        r = conn.execute(sa.text("PRAGMA table_info(interests)"))
        col_exists = any(row[1] == "accepted_by" for row in r.fetchall())

    if not col_exists:
        conn.execute(sa.text("ALTER TABLE interests ADD COLUMN accepted_by VARCHAR(20)"))
        conn.commit()
        print("  -> Added.")
    else:
        print("  -> Already exists, skipping.")

    # ── Step 4: recompute crop statuses ──────────────────────────────────────
    print()
    print("[4/5] Recomputing crop statuses...")

    r = conn.execute(sa.text(
        "UPDATE crops SET status='sold' "
        "WHERE quantity_remaining = 0 AND status != 'removed'"
    ))
    print("  -> Sold: " + str(r.rowcount))

    r = conn.execute(sa.text(
        "UPDATE crops SET status='partially_sold' "
        "WHERE quantity_remaining > 0 "
        "  AND quantity_remaining < quantity "
        "  AND status NOT IN ('removed','sold') "
        "  AND id IN (SELECT DISTINCT crop_id FROM interests WHERE status='accepted')"
    ))
    print("  -> Partially sold: " + str(r.rowcount))

    r = conn.execute(sa.text(
        "UPDATE crops SET status='active' "
        "WHERE quantity_remaining = quantity "
        "  AND status NOT IN ('removed','sold','partially_sold')"
    ))
    print("  -> Active: " + str(r.rowcount))

    r = conn.execute(sa.text(
        "UPDATE crops SET status='active' WHERE status='negotiating'"
    ))
    if r.rowcount:
        print("  -> Fixed " + str(r.rowcount) + " crop(s) stuck in negotiating.")

    conn.commit()
    print("  -> Done.")

    # ── Step 5: DB constraints (PostgreSQL only) ──────────────────────────────
    print()
    print("[5/5] Adding DB constraints...")

    if IS_POSTGRES:
        constraints = [
            ("crops", "ck_crop_qty_remaining_nonneg",
             "ALTER TABLE crops ADD CONSTRAINT ck_crop_qty_remaining_nonneg "
             "CHECK (quantity_remaining >= 0)"),

            ("crops", "ck_crop_qty_remaining_max",
             "ALTER TABLE crops ADD CONSTRAINT ck_crop_qty_remaining_max "
             "CHECK (quantity_remaining <= quantity)"),

            ("crops", "ck_crop_status_valid",
             "ALTER TABLE crops ADD CONSTRAINT ck_crop_status_valid "
             "CHECK (status IN ('active','partially_sold','sold','removed'))"),

            ("interests", "ck_interest_accepted_by_valid",
             "ALTER TABLE interests ADD CONSTRAINT ck_interest_accepted_by_valid "
             "CHECK (accepted_by IN ('farmer','contractor','both') OR accepted_by IS NULL)"),

            ("interests", "ck_interest_status_valid",
             "ALTER TABLE interests ADD CONSTRAINT ck_interest_status_valid "
             "CHECK (status IN ('pending','negotiating','accepted','rejected'))"),
        ]

        for table, name, ddl in constraints:
            exists = conn.execute(sa.text(
                "SELECT 1 FROM information_schema.table_constraints "
                "WHERE table_name='" + table + "' AND constraint_name='" + name + "'"
            )).fetchone()
            if exists:
                print("  -> " + name + ": already exists.")
            else:
                try:
                    conn.execute(sa.text(ddl))
                    conn.commit()
                    print("  -> " + name + ": added.")
                except Exception as e:
                    conn.rollback()
                    print("  WARNING " + name + ": " + str(e))

        try:
            conn.execute(sa.text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_interest_crop_contractor_active "
                "ON interests (crop_id, contractor_id) WHERE status != 'rejected'"
            ))
            conn.commit()
            print("  -> Partial unique index added.")
        except Exception as e:
            conn.rollback()
            print("  WARNING unique index: " + str(e))

    else:
        print("  -> SQLite: constraints enforced at app level via models.py.")
        print("     On Render (PostgreSQL) these will be applied as real DB constraints.")

    conn.close()

print()
print("Migration complete.")