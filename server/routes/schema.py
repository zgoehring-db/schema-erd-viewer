from fastapi import APIRouter, HTTPException
from databricks.sdk.service.sql import StatementState
from server.config import get_workspace_client

router = APIRouter()


def _execute_sql(catalog: str, schema: str, sql: str) -> list[dict]:
    """Execute SQL via Statement Execution API and return rows as dicts."""
    w = get_workspace_client()

    # Find a SQL warehouse to use
    warehouse_id = _get_warehouse_id(w)
    if not warehouse_id:
        raise HTTPException(status_code=500, detail="No SQL warehouse available. Please configure DATABRICKS_WAREHOUSE_ID.")

    response = w.statement_execution.execute_statement(
        warehouse_id=warehouse_id,
        catalog=catalog,
        schema="information_schema",
        statement=sql,
        wait_timeout="50s",
    )

    if response.status.state != StatementState.SUCCEEDED:
        error_msg = response.status.error.message if response.status.error else "Unknown error"
        raise HTTPException(status_code=500, detail=f"SQL execution failed: {error_msg}")

    if not response.result or not response.result.data_array:
        return []

    columns = [col.name for col in response.manifest.schema.columns]
    return [dict(zip(columns, row)) for row in response.result.data_array]


def _get_warehouse_id(w) -> str | None:
    """Get warehouse ID from env or find one automatically."""
    import os
    warehouse_id = os.environ.get("DATABRICKS_WAREHOUSE_ID")
    if warehouse_id:
        return warehouse_id

    # Auto-discover a running SQL warehouse
    warehouses = w.warehouses.list()
    for wh in warehouses:
        if wh.state and wh.state.value in ("RUNNING", "STARTING"):
            return wh.id
    # Fall back to any warehouse
    for wh in w.warehouses.list():
        return wh.id
    return None


@router.get("/catalogs")
def list_catalogs():
    """List all accessible catalogs."""
    w = get_workspace_client()
    catalogs = w.catalogs.list()
    return [{"name": c.name} for c in catalogs if c.name not in ("__databricks_internal", "system")]


@router.get("/catalogs/{catalog}/schemas")
def list_schemas(catalog: str):
    """List all schemas in a catalog."""
    w = get_workspace_client()
    schemas = w.schemas.list(catalog_name=catalog)
    return [{"name": s.name} for s in schemas if s.name != "information_schema"]


@router.get("/catalogs/{catalog}/schemas/{schema}/erd")
def get_erd_data(catalog: str, schema: str):
    """Get complete ERD data for a schema: tables, columns, PKs, FKs."""

    # Get all tables
    tables_sql = f"""
    SELECT table_name, table_type
    FROM {catalog}.information_schema.tables
    WHERE table_schema = '{schema}'
    ORDER BY table_name
    """
    tables = _execute_sql(catalog, schema, tables_sql)

    if not tables:
        return {"tables": [], "relationships": []}

    # Get all columns with types
    columns_sql = f"""
    SELECT table_name, column_name, data_type, ordinal_position, is_nullable
    FROM {catalog}.information_schema.columns
    WHERE table_schema = '{schema}'
    ORDER BY table_name, ordinal_position
    """
    columns = _execute_sql(catalog, schema, columns_sql)

    # Get primary key constraints
    pk_sql = f"""
    SELECT tc.table_name, kcu.column_name
    FROM {catalog}.information_schema.table_constraints tc
    JOIN {catalog}.information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    WHERE tc.table_schema = '{schema}'
      AND tc.constraint_type = 'PRIMARY KEY'
    """
    try:
        pks = _execute_sql(catalog, schema, pk_sql)
    except Exception:
        pks = []

    # Get foreign key constraints
    fk_sql = f"""
    SELECT
      kcu.table_name AS source_table,
      kcu.column_name AS source_column,
      ccu.table_name AS target_table,
      ccu.column_name AS target_column,
      tc.constraint_name
    FROM {catalog}.information_schema.table_constraints tc
    JOIN {catalog}.information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN {catalog}.information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = '{schema}'
      AND tc.constraint_type = 'FOREIGN KEY'
    """
    try:
        fks = _execute_sql(catalog, schema, fk_sql)
    except Exception:
        fks = []

    # Get table tags (e.g. update_frequency) via information_schema.table_tags
    tags_sql = f"""
    SELECT table_name, tag_name, tag_value
    FROM {catalog}.information_schema.table_tags
    WHERE schema_name = '{schema}'
    """
    try:
        tags = _execute_sql(catalog, schema, tags_sql)
    except Exception:
        tags = []

    # Build tags lookup: table_name -> {tag_name: tag_value}
    tags_map: dict[str, dict[str, str]] = {}
    for row in tags:
        tname = row["table_name"]
        if tname not in tags_map:
            tags_map[tname] = {}
        tags_map[tname][row["tag_name"]] = row["tag_value"]

    # Build PK lookup set
    pk_set = {(row["table_name"], row["column_name"]) for row in pks}

    # Build FK lookup set
    fk_set = {(row["source_table"], row["source_column"]) for row in fks}

    # Assemble table data
    table_map = {}
    for t in tables:
        tname = t["table_name"]
        table_tags = tags_map.get(tname, {})
        table_map[tname] = {
            "name": tname,
            "type": t["table_type"],
            "tags": table_tags if table_tags else None,
            "columns": [],
        }

    for col in columns:
        tname = col["table_name"]
        if tname in table_map:
            table_map[tname]["columns"].append({
                "name": col["column_name"],
                "type": col["data_type"],
                "nullable": col["is_nullable"] == "YES",
                "isPK": (tname, col["column_name"]) in pk_set,
                "isFK": (tname, col["column_name"]) in fk_set,
            })

    # Build relationships
    relationships = []
    for fk in fks:
        relationships.append({
            "sourceTable": fk["source_table"],
            "sourceColumn": fk["source_column"],
            "targetTable": fk["target_table"],
            "targetColumn": fk["target_column"],
            "constraintName": fk["constraint_name"],
        })

    return {
        "tables": list(table_map.values()),
        "relationships": relationships,
    }
