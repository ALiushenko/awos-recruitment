import pytest
from fastmcp import Client
from awos_recruitment_mcp.server import mcp


@pytest.fixture
async def mcp_client():
    async with Client(mcp) as client:
        yield client
