import os
import psycopg2
from psycopg2 import pool
from contextlib import contextmanager

_pool: pool.ThreadedConnectionPool | None = None


def init_pool() -> None:
    global _pool
    _pool = pool.ThreadedConnectionPool(
        minconn=2,
        maxconn=20,
        dsn=os.environ["DATABASE_URL"],
    )


def close_pool() -> None:
    global _pool
    if _pool:
        _pool.closeall()
        _pool = None


@contextmanager
def get_conn():
    """Yield a psycopg2 connection from the pool; auto-commit or rollback."""
    assert _pool is not None, "Connection pool not initialised"
    conn = _pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)


def fetchall(sql: str, params=None) -> list[dict]:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            cols = [d[0] for d in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]


def fetchone(sql: str, params=None) -> dict | None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            if cur.description is None:
                return None
            cols = [d[0] for d in cur.description]
            row = cur.fetchone()
            return dict(zip(cols, row)) if row else None


def execute(sql: str, params=None) -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)


def executemany(sql: str, params_list: list) -> None:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.executemany(sql, params_list)
