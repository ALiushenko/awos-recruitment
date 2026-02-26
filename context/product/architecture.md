# System Architecture Overview: AWOS Recruitment

---

## 1. Application & Technology Stack

- **MCP Server Runtime:** Python with FastMCP
- **MCP Protocol Transport:** Streamable HTTP
- **CLI / Install Package:** TypeScript (npx)

---

## 2. Data & Persistence

- **Vector Store:** ChromaDB (embeddable, Python-native)
- **Metadata Storage:** SQLite
- **Capability Source of Truth:** Git-managed repository, baked into the server at build time

---

## 3. Infrastructure & Deployment

- **Cloud Provider:** AWS
- **Compute:** ECS Fargate — serverless containers running the MCP server as a long-running service
- **Container:** Docker image with the Python server and sentence-transformers model bundled in
- **Infrastructure-as-Code:** Terraform
- **Configuration & Secrets:** AWS SSM Parameter Store for environment-specific config and secrets, injected into ECS task definitions at runtime
- **Registry Sync:** Capability registry is baked into the Docker image; updates are part of the build process

---

## 4. External Services & APIs

- **Embedding Generation:** Local model via sentence-transformers (e.g., all-MiniLM-L6-v2)
- **Usage Telemetry & Analytics:** PostHog — all telemetry events (searches, results, selections, installations) are sent to PostHog for tracking, dashboards, and usage analysis

---

## 5. Observability & Monitoring

- **Logging:** Standard Python logging with structured output
