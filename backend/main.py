import logging
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import database as db
from seed.seed_data import seed_if_empty
from routers import gallery, artists, artwork, customers, staff, handles, analytics

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
log = logging.getLogger(__name__)


def apply_schema() -> None:
    """Apply schema.sql against the database (all statements use IF NOT EXISTS)."""
    schema_path = Path(__file__).parent / "schema.sql"
    if not schema_path.exists():
        log.warning("schema.sql not found — skipping schema application.")
        return
    sql = schema_path.read_text()
    with db.get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
    log.info("Schema applied.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting up — initialising connection pool …")
    db.init_pool()
    # Apply schema first (idempotent — uses IF NOT EXISTS throughout)
    apply_schema()
    # Seed in a background thread so the server becomes responsive immediately.
    # On first launch the seed takes 1–3 min; the API returns empty results
    # until it completes, which is acceptable.
    threading.Thread(target=seed_if_empty, daemon=True).start()
    yield
    log.info("Shutting down — closing connection pool …")
    db.close_pool()


app = FastAPI(title="Art Gallery Management System", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routers ───────────────────────────────────────────────────────────────
app.include_router(gallery.router,   prefix="/api")
app.include_router(artists.router,   prefix="/api")
app.include_router(artwork.router,   prefix="/api")
app.include_router(customers.router, prefix="/api")
app.include_router(staff.router,     prefix="/api")
app.include_router(handles.router,   prefix="/api")
app.include_router(analytics.router, prefix="/api")

# ── Static frontend ───────────────────────────────────────────────────────────
app.mount("/", StaticFiles(directory="static", html=True), name="static")
