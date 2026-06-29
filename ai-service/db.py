import logging
import os
from contextlib import contextmanager
from typing import Any, Optional

logger = logging.getLogger('telecom.db')

_pool = None


def _db_config() -> dict[str, Any]:
    return {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', '3306')),
        'user': os.getenv('DB_USER', 'root'),
        'password': os.getenv('DB_PASSWORD', ''),
        'database': os.getenv('DB_NAME', 'telecom_platform'),
        'charset': 'utf8mb4',
        'autocommit': True,
        'connect_timeout': 5,
        'read_timeout': 10,
    }


def is_db_configured() -> bool:
    return bool(os.getenv('DB_HOST') or os.getenv('DB_NAME'))


def _get_pool():
    global _pool
    if _pool is not None:
        return _pool

    import pymysql
    from dbutils.pooled_db import PooledDB

    config = _db_config()
    logger.info(
        'Initializing MySQL pool | host=%s db=%s user=%s',
        config['host'],
        config['database'],
        config['user'],
    )
    _pool = PooledDB(
        creator=pymysql,
        maxconnections=int(os.getenv('DB_POOL_SIZE', '5')),
        mincached=1,
        maxcached=3,
        blocking=True,
        ping=1,
        cursorclass=pymysql.cursors.DictCursor,
        **config,
    )
    return _pool


@contextmanager
def get_connection():
    conn = _get_pool().connection()
    try:
        yield conn
    finally:
        conn.close()


def fetch_one(sql: str) -> Optional[dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql)
            return cursor.fetchone()


def fetch_all(sql: str, max_rows: int = 100) -> list[dict[str, Any]]:
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql)
            return list(cursor.fetchmany(max_rows))


def ping_db() -> bool:
    try:
        row = fetch_one('SELECT 1 AS ok')
        return row is not None and row.get('ok') == 1
    except Exception as exc:
        logger.warning('Database ping failed | error=%s', exc)
        return False
