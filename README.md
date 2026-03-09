# Schema ERD Viewer

A Databricks App that visualizes Unity Catalog schemas as interactive Entity-Relationship Diagrams (ERDs). Select any catalog and schema to see tables, views, materialized views, columns, primary keys, foreign keys, and relationships rendered as a navigable graph.

## Features

- **Full ERD visualization** — tables rendered as nodes with columns, data types, nullability, PK/FK indicators, and relationship arrows
- **Column-level relationship arrows** — FK arrows connect directly to the specific source/target columns, not just the table
- **Hover highlighting** — hover over any relationship to highlight it and dim all others, making it easy to trace connections in complex schemas
- **Type differentiation** — tables (blue), views (green), and materialized views (purple) are visually distinct
- **Unity Catalog tags** — any tags set on tables (e.g. `update_frequency`) are displayed in the node header. Set tags with `ALTER TABLE ... SET TAGS ('update_frequency' = 'daily')`
- **Auto-layout** — Dagre graph layout engine automatically positions nodes to minimize overlap, with connected tables laid out as a graph and disconnected objects arranged in a grid
- **Scales to complex schemas** — minimap navigation, pan/zoom (down to 5% zoom), fit-to-view, and horizontal/vertical layout toggle
- **Dual-mode auth** — works locally with Databricks CLI profiles and in Databricks Apps with auto-injected service principal credentials

## Architecture

```
schema-erd-viewer/
├── app.yaml                 # Databricks Apps config
├── app.py                   # FastAPI entry point
├── requirements.txt         # Python dependencies
├── server/
│   ├── config.py            # Dual-mode auth (local CLI / Databricks Apps SP)
│   └── routes/
│       └── schema.py        # API: catalogs, schemas, ERD data via Statement Execution API
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main app with catalog/schema selectors
│   │   ├── components/
│   │   │   ├── ERDCanvas.tsx    # React Flow canvas with hover highlighting
│   │   │   ├── TableNode.tsx    # Custom node: columns, PKs, FKs, tags, per-column handles
│   │   │   └── SchemaSelector.tsx
│   │   ├── hooks/
│   │   │   └── useSchemaData.ts # Data fetching hooks
│   │   └── lib/
│   │       └── layout.ts       # Dagre auto-layout engine
│   └── dist/                # Built frontend (served by FastAPI)
└── .gitignore
```

**Backend**: FastAPI queries Unity Catalog `information_schema` via the Statement Execution API to retrieve tables, columns, constraints, and tags.

**Frontend**: React + [React Flow](https://reactflow.dev/) + [Dagre](https://github.com/dagrejs/dagre) for graph layout + Tailwind CSS.

## Prerequisites

- [Databricks CLI](https://docs.databricks.com/dev-tools/cli/install.html) v0.229.0+
- [uv](https://docs.astral.sh/uv/) (Python package manager) — install with `curl -LsSf https://astral.sh/uv/install.sh | sh`
- A Databricks workspace with:
  - A SQL warehouse
  - Unity Catalog enabled

## Deployment Steps

### 1. Clone the repo

```bash
git clone <repo-url>
cd schema-erd-viewer
```

> **Note:** A pre-built `frontend/dist/` is included so you can deploy immediately without Node.js. If you modify the frontend source, rebuild it with:
> ```bash
> cd frontend && npm install && npm run build && cd ..
> ```

### 2. Authenticate with your Databricks workspace

```bash
databricks auth login --host <your-workspace-url> --profile <profile-name>

# Verify authentication
databricks auth profiles | grep <profile-name>
```

### 3. Configure app.yaml

Edit `app.yaml` and set your SQL warehouse ID:

```yaml
command:
  - "python"
  - "-m"
  - "uvicorn"
  - "app:app"
  - "--host"
  - "0.0.0.0"
  - "--port"
  - "8000"

env:
  - name: DATABRICKS_WAREHOUSE_ID
    value: '<your-warehouse-id>'
```

To find your warehouse ID, go to **SQL Warehouses** in the Databricks UI and copy the ID from the warehouse details page, or run:

```bash
databricks warehouses list --profile <profile-name>
```

### 4. Create the Databricks App

```bash
databricks apps create schema-erd-viewer \
  --description "Interactive ERD visualization for Unity Catalog schemas" \
  --profile <profile-name>
```

Note the `service_principal_client_id` from the output — you'll need it for permissions.

### 5. Grant permissions to the app's service principal

The app runs as a service principal that needs access to your SQL warehouse and Unity Catalog.

**Grant SQL warehouse access:**

```bash
# Replace <sp-client-id> with the service_principal_client_id from step 4
# Replace <warehouse-id> with your warehouse ID
curl -X PATCH "https://<your-workspace-url>/api/2.0/permissions/sql/warehouses/<warehouse-id>" \
  -H "Authorization: Bearer $(databricks auth token --profile <profile-name> | jq -r .access_token)" \
  -H "Content-Type: application/json" \
  -d '{"access_control_list": [{"service_principal_name": "<sp-client-id>", "permission_level": "CAN_USE"}]}'
```

**Grant Unity Catalog access:**

For each catalog you want the app to browse, run these SQL statements (via the Databricks SQL editor or CLI):

```sql
-- Replace <sp-client-id> with the service_principal_client_id from step 4
-- Repeat for each catalog you want accessible
GRANT USE CATALOG ON CATALOG `<catalog-name>` TO `<sp-client-id>`;
GRANT USE SCHEMA ON CATALOG `<catalog-name>` TO `<sp-client-id>`;
GRANT SELECT ON CATALOG `<catalog-name>` TO `<sp-client-id>`;
GRANT BROWSE ON CATALOG `<catalog-name>` TO `<sp-client-id>`;
```

### 6. Upload files and deploy

```bash
# Upload app files to workspace (excludes node_modules, .venv, source files)
databricks sync . /Workspace/Users/<your-email>/schema-erd-viewer \
  --exclude node_modules \
  --exclude .venv \
  --exclude __pycache__ \
  --exclude .git \
  --exclude "frontend/src" \
  --exclude "frontend/public" \
  --exclude "frontend/node_modules" \
  --exclude "frontend/tsconfig.tsbuildinfo" \
  --exclude ".python-version" \
  --exclude "uv.lock" \
  --exclude "pyproject.toml" \
  --profile <profile-name> \
  --full

# Deploy the app
databricks apps deploy schema-erd-viewer \
  --source-code-path /Workspace/Users/<your-email>/schema-erd-viewer \
  --profile <profile-name>
```

### 7. Open the app

```bash
# Get the app URL
databricks apps get schema-erd-viewer --profile <profile-name>
```

Open the URL in your browser. You'll authenticate via Databricks SSO, then select a catalog and schema to visualize.

## Local Development

To run locally for development:

```bash
# Terminal 1: Start the backend
export DATABRICKS_PROFILE=<profile-name>
export DATABRICKS_WAREHOUSE_ID=<warehouse-id>
uv run uvicorn app:app --reload --port 8000

# Terminal 2: Start the frontend dev server (with hot reload)
cd frontend
npm run dev
```

The frontend dev server runs at http://localhost:5173 and proxies API requests to the backend on port 8000.

## Adding Tags

Use Unity Catalog tags to annotate tables with metadata that appears in the ERD:

```sql
ALTER TABLE my_catalog.my_schema.my_table SET TAGS ('update_frequency' = 'daily');
ALTER TABLE my_catalog.my_schema.my_table SET TAGS ('owner' = 'data-team');
```

Tags are displayed in a bar below the table header in each ERD node. The `update_frequency` tag gets a refresh icon; all other tags use a generic tag icon.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| App shows "Internal Server Error" | Check the app logs at `<app-url>/logz`. Common cause: the SP doesn't have warehouse or catalog permissions. |
| No catalogs appear in dropdown | The SP needs `BROWSE` permission on the catalogs. |
| ERD loads but shows 0 relationships | The schema may not have PK/FK constraints defined. Constraints are required for relationship arrows. |
| "wait_timeout" error in logs | The SQL warehouse may be starting up. Wait a moment and retry. |
| Auth token expired locally | Run `databricks auth login --profile <profile-name>` to re-authenticate. |
