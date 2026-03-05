"""Entry point for `python -m awos_recruitment_mcp`.

Starts the MCP server on the configured host and port using
Streamable HTTP transport (served at /mcp).
"""

from awos_recruitment_mcp.config import Config
from awos_recruitment_mcp.server import mcp

config = Config.from_env()

mcp.run(transport="http", host=config.host, port=config.port, json_response=True, stateless_http=True)
