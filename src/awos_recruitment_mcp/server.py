"""FastMCP server instance for AWOS Recruitment.

This module instantiates the `FastMCP` server with project-level metadata.
Import `mcp` from here whenever you need to register tools, resources,
or prompts.
"""

from fastmcp import FastMCP

from awos_recruitment_mcp.config import Config

config = Config.from_env()

mcp = FastMCP(
    name="AWOS Recruitment",
    version=config.version,
    instructions=(
        "This server provides AI coding assistants with a discovery engine "
        "for skills, agents, and tools. Use the search_capabilities tool to "
        "find capabilities matching a natural language query."
    ),
)
