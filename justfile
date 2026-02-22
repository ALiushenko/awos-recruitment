# Start the MCP server
serve:
    cd server && uv run python -m awos_recruitment_mcp

# Run server tests
test *ARGS:
    cd server && uv run pytest {{ARGS}}

# Validate all registry entries against their schemas
validate-registry *ARGS:
    cd server && uv run python -m awos_recruitment_mcp.validate {{ARGS}}

# Build the CLI
build-cli:
    cd cli && npm run build

# Run CLI tests
test-cli *ARGS:
    cd cli && npm test {{ARGS}}
