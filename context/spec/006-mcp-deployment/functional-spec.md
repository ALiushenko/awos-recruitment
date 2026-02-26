# Functional Specification: MCP Deployment on AWS

- **Roadmap Item:** Deploy the MCP server to AWS so it's accessible as a hosted service.
- **Status:** Completed
- **Author:** Poe

---

## 1. Overview and Rationale (The "Why")

The MCP server currently only runs locally. Developers must clone the repository and start the server on their own machine before they can use search and discovery. This creates friction for onboarding new team members, prevents shared access to a single curated registry, and blocks the product's "zero-setup onboarding" success metric.

By deploying the MCP server to AWS, any Claude Code user with the server URL can connect and immediately search, discover, and install capabilities — without running any infrastructure locally. This is a prerequisite for team-wide adoption and for the telemetry features planned in Phase 4.

**Success criteria:**
- The MCP server is reachable at `https://recruitment.awos.provectus.pro` from any internet-connected Claude Code instance.
- A semantic search query against the hosted server returns relevant results from the registry.
- The deployment runs with zero-downtime during updates.

---

## 2. Functional Requirements (The "What")

### 2.1 AWS Infrastructure Provisioning

- The AWS infrastructure required to run the MCP server must be provisioned and managed as code (Terraform).
  - **Acceptance Criteria:**
    - [x] An ECS Fargate cluster is provisioned with a service running two tasks behind an Application Load Balancer.
    - [x] The ALB terminates HTTPS using an ACM certificate for `recruitment.awos.provectus.pro`.
    - [x] A Route 53 DNS record points `recruitment.awos.provectus.pro` to the ALB.
    - [x] All infrastructure is defined in Terraform and can be created or destroyed with `terraform apply` / `terraform destroy`.

### 2.2 Server Deployment

- The MCP server must be packaged as a Docker image, pushed to a container registry, and deployed to ECS Fargate.
  - **Acceptance Criteria:**
    - [x] A Dockerfile builds the Python MCP server with the sentence-transformers model and capability registry baked in.
    - [x] The Docker image is pushed to Amazon ECR.
    - [x] The ECS service runs two Fargate tasks, enabling zero-downtime rolling deployments.
    - [x] The ALB health check confirms each task is healthy before receiving traffic.
    - [x] The server is publicly accessible at `https://recruitment.awos.provectus.pro`.

### 2.3 Environment Configuration

- Environment-specific configuration (secrets, variables) must be managed securely and injected at runtime.
  - **Acceptance Criteria:**
    - [x] Server configuration values (host, port, version, embedding model, search threshold) are stored in AWS SSM Parameter Store.
    - [x] The ECS task definition reads configuration from SSM at startup.
    - [x] No secrets or environment-specific values are hardcoded in the Docker image or Terraform code.

### 2.4 Deployment Verification

- The deployment must be verified as functional after each release.
  - **Acceptance Criteria:**
    - [x] The health endpoint at `https://recruitment.awos.provectus.pro/health` returns HTTP 200.
    - [x] An MCP search query sent to the hosted server returns ranked results from the capability registry.

---

## 3. Scope and Boundaries

### In-Scope

- ECS Fargate cluster, service, and task definitions
- Application Load Balancer with HTTPS termination
- ACM certificate for `recruitment.awos.provectus.pro`
- Route 53 DNS record
- Amazon ECR repository for Docker images
- Dockerfile for the MCP server
- SSM Parameter Store for environment configuration
- Terraform modules for all of the above
- Deployment verification (health check + MCP search)

### Out-of-Scope

- **CI/CD pipeline** — automated build and deploy pipelines are not included; deployments are manual for now.
- **Usage Telemetry** (Phase 4 roadmap item)
- **Analytics & Reporting** (Phase 4 roadmap item)
- **Auto-scaling** — the service runs a fixed two-task count; auto-scaling policies are deferred.
- **WAF / rate limiting** — no web application firewall or request throttling in this phase.
- **Multi-environment setup** — only a single production environment; staging/dev environments are deferred.
- **Monitoring & alerting dashboards** — beyond the ALB health check, no CloudWatch alarms or dashboards are included.
