import re

FORBIDDEN_KEYWORDS = re.compile(
    r'\b('
    r'DROP|DELETE|UPDATE|ALTER|TRUNCATE|INSERT|CREATE|REPLACE|'
    r'GRANT|REVOKE|EXEC|EXECUTE|CALL|LOAD|OUTFILE|INFILE|INTO|MERGE|'
    r'LOCK|UNLOCK|SET\s+GLOBAL|PREPARE|HANDLER|PROCEDURE|FUNCTION'
    r')\b',
    re.IGNORECASE,
)


class SqlValidationError(ValueError):
    pass


def sanitize_generated_sql(raw: str) -> str:
    sql = raw.strip()
    sql = re.sub(r'^```(?:sql|mysql)?\s*', '', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\s*```$', '', sql)
    sql = sql.strip().strip('`').strip('"').strip("'")
    if sql.endswith(';'):
        sql = sql[:-1].strip()
    return sql


def validate_readonly_sql(raw: str, *, max_length: int = 4000) -> str:
    sql = sanitize_generated_sql(raw)
    if not sql:
        raise SqlValidationError('Empty SQL query')
    if len(sql) > max_length:
        raise SqlValidationError('SQL query is too long')
    if ';' in sql:
        raise SqlValidationError('Multiple SQL statements are not allowed')
    if not sql.lstrip().upper().startswith('SELECT'):
        raise SqlValidationError('Only SELECT queries are allowed')
    if FORBIDDEN_KEYWORDS.search(sql):
        raise SqlValidationError('Forbidden SQL keyword detected')
    if not re.search(r'\bLIMIT\b', sql, re.IGNORECASE):
        sql = f'{sql} LIMIT 100'
    return sql
