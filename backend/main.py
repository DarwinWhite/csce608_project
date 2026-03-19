import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import database as db
from seed.seed_data import seed_if_empty
from routers import gallery, artists, artwork, customers, staff, handles, analytics

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting up — initialising connection pool …")
    db.init_pool()
    seed_if_empty()
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
