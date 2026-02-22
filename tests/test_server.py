import pytest


async def test_server_initializes(mcp_client):
    """Verify the MCP client completes the handshake with the server.

    Successfully entering the async context manager (via the fixture) IS the
    test: it proves the in-process server accepted the connection and completed
    the MCP initialization exchange.
    """
    assert mcp_client.is_connected()


async def test_server_info(mcp_client):
    """Verify the server reports the correct name and version."""
    info = mcp_client.initialize_result
    assert info is not None, "initialize_result should be populated after handshake"

    server_info = info.serverInfo
    assert server_info.name == "AWOS Recruitment", (
        f"Expected server name 'AWOS Recruitment', got '{server_info.name}'"
    )
    assert server_info.version == "0.1.0", (
        f"Expected version '0.1.0', got '{server_info.version}'"
    )
