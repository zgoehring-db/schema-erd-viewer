import os
from databricks.sdk import WorkspaceClient

IS_DATABRICKS_APP = bool(os.environ.get("DATABRICKS_APP_NAME"))


def get_workspace_client() -> WorkspaceClient:
    if IS_DATABRICKS_APP:
        return WorkspaceClient()
    else:
        profile = os.environ.get("DATABRICKS_PROFILE", "DEFAULT")
        return WorkspaceClient(profile=profile)


def get_workspace_host() -> str:
    if IS_DATABRICKS_APP:
        host = os.environ.get("DATABRICKS_HOST", "")
        if host and not host.startswith("http"):
            host = f"https://{host}"
        return host
    client = get_workspace_client()
    return client.config.host


def get_sql_connection_params() -> dict:
    """Get connection parameters for databricks-sql-connector."""
    client = get_workspace_client()
    host = client.config.host.replace("https://", "").replace("http://", "")
    http_path = os.environ.get("DATABRICKS_HTTP_PATH", "")

    if IS_DATABRICKS_APP:
        token = os.environ.get("DATABRICKS_TOKEN")
        if not token:
            token = client.config.authenticate().get("Authorization", "").replace("Bearer ", "")
        return {"server_hostname": host, "http_path": http_path, "access_token": token}
    else:
        token = client.config.authenticate().get("Authorization", "").replace("Bearer ", "")
        return {"server_hostname": host, "http_path": http_path, "access_token": token}
