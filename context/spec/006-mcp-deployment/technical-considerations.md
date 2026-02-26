# Technical Specification: MCP Deployment on AWS

- **Functional Specification:** `context/spec/006-mcp-deployment/functional-spec.md`
- **Status:** Completed
- **Author(s):** Poe

---

## 1. High-Level Technical Approach

The MCP server is fully stateless — ChromaDB runs in ephemeral mode (in-memory), the registry is read-only, and there are no writes to disk. This makes containerization straightforward: everything (Python server, sentence-transformers model, registry files) is baked into a single Docker image.

The deployment stack:
- **Docker image** built with a multi-stage Dockerfile using `uv` for dependency management and a pre-downloaded ML model
- **ECS Fargate** runs 2 tasks in private subnets, behind an **ALB** with HTTPS termination in public subnets
- **Terraform** provisions all AWS resources in a flat `infra/` directory with remote state in S3
- **SSM Parameter Store** provides configuration values injected into ECS tasks at startup

No CI/CD pipeline — deployments are manual (`docker build` + `docker push` + `aws ecs update-service`).

---

## 2. Proposed Solution & Implementation Plan (The "How")

### 2.1 Dockerfile

A two-stage build based on `python:3.12-slim`:

| Stage | Purpose |
|-------|---------|
| **Builder** | Install `uv`, sync dependencies from `pyproject.toml` + `uv.lock`, pre-download the `all-MiniLM-L6-v2` model |
| **Runtime** | Copy venv, cached model, app source, and registry. Run as non-root user |

Key details:
- **Base image:** `python:3.12-slim` (Debian-based, required for PyTorch/sentence-transformers binary wheels)
- **Model pre-download:** Run `python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"` in the builder stage. Set `HF_HOME=/app/.cache` so the model is found at runtime without network access
- **Layer ordering:** Copy `pyproject.toml` + `uv.lock` first, then `RUN uv sync`, then copy source — so dependency layers are cached across builds
- **Registry:** `COPY registry/ /app/registry/` — baked into the image
- **Entrypoint:** `["python", "-m", "awos_recruitment_mcp"]`
- **Port:** 8000 (exposed, documented)
- **Non-root user:** UID 1000
- **Expected image size:** ~1.5–2 GB (mostly PyTorch)
- **File path:** `server/Dockerfile`

### 2.2 Terraform Structure

Flat layout in `infra/` at repo root — no nested modules (~20-25 resources total, modules would add overhead without reuse benefit):

```
infra/
├── providers.tf          # AWS provider (~> 5.x), Terraform version (~> 1.9), S3 backend
├── variables.tf          # All input variables with descriptions + defaults
├── outputs.tf            # ECR repo URL, ALB DNS, service name
├── terraform.tfvars.example  # Documented variable template (committed)
├── vpc.tf                # VPC, subnets (2 public + 2 private), IGW, NAT, route tables
├── security_groups.tf    # ALB SG (443/80 inbound), ECS SG (8000 from ALB only)
├── alb.tf                # ALB, target group, HTTP→HTTPS redirect, HTTPS listener
├── acm.tf                # ACM certificate + Route 53 DNS validation
├── dns.tf                # Route 53 A record alias → ALB
├── ecr.tf                # ECR repository + lifecycle policy
├── ecs.tf                # ECS cluster, task definition, service, IAM roles
├── ssm.tf                # SSM parameters (initial seed values)
└── logs.tf               # CloudWatch log group
```

- **State backend:** S3 bucket + DynamoDB table for locking (bootstrapped manually once)
- **`terraform.tfvars`** in `.gitignore` — keeps account IDs and domain names out of version control

### 2.3 Networking (VPC)

A purpose-built VPC (not default VPC) to keep Fargate tasks in private subnets:

| Resource | CIDR / Details |
|----------|---------------|
| VPC | `10.0.0.0/16`, DNS support + hostnames enabled |
| Public subnet AZ-a | `10.0.1.0/24` (ALB) |
| Public subnet AZ-b | `10.0.2.0/24` (ALB) |
| Private subnet AZ-a | `10.0.10.0/24` (Fargate tasks) |
| Private subnet AZ-b | `10.0.20.0/24` (Fargate tasks) |
| Internet Gateway | Attached to VPC |
| NAT Gateway | In one public subnet (single AZ, sufficient for this workload) |

**Security groups:**
- **ALB SG:** Inbound 443 + 80 from `0.0.0.0/0`. Outbound to ECS SG on 8000.
- **ECS SG:** Inbound 8000 from ALB SG only. Outbound 443 to `0.0.0.0/0` (ECR pulls, SSM).

### 2.4 ECS Fargate Service

| Setting | Value | Rationale |
|---------|-------|-----------|
| Task CPU | 1024 (1 vCPU) | Sufficient; model loading is the only CPU-intensive operation |
| Task Memory | 4096 (4 GB) | ~2.5x estimated peak (~1.5 GB for PyTorch + model + ChromaDB + server) |
| Desired count | 2 | Zero-downtime deployments |
| Min healthy % | 100 | Never drop below 2 healthy tasks |
| Max % | 200 | Temporarily run 4 tasks during deployment |
| Health check grace period | 120 seconds | Model loading takes 30–60s; 120s gives safe margin |
| Circuit breaker | Enabled with rollback | Auto-rollback on failed deployments |
| Platform version | LATEST | Currently 1.4.0 for Linux |

**IAM roles:**
- **Task execution role:** Permissions for `ecr:GetAuthorizationToken`, `ecr:BatchGetImage`, `logs:PutLogEvents`, `ssm:GetParameters` (scoped to `/awos-recruitment/prod/*`)
- **Task role:** No additional permissions needed (server has no AWS API calls)

### 2.5 ALB & HTTPS

| Setting | Value |
|---------|-------|
| ALB type | Application (internet-facing) |
| HTTP listener (80) | Redirect to HTTPS (443) |
| HTTPS listener (443) | Forward to target group, ACM certificate |
| Target group protocol | HTTP on port 8000 |
| Health check path | `/health` |
| Health check interval | 30 seconds |
| Health check timeout | 10 seconds |
| Healthy threshold | 2 |
| Unhealthy threshold | 3 |
| Deregistration delay | 30 seconds |

**ACM certificate:** DNS-validated via Route 53 for `recruitment.awos.provectus.pro`.
**DNS:** Route 53 A record (alias) pointing to the ALB.

### 2.6 SSM Parameter Store

Naming convention: `/awos-recruitment/prod/{parameter-name}`

| SSM Path | Maps to Env Var | Default |
|----------|----------------|---------|
| `/awos-recruitment/prod/host` | `AWOS_HOST` | `0.0.0.0` |
| `/awos-recruitment/prod/port` | `AWOS_PORT` | `8000` |
| `/awos-recruitment/prod/version` | `AWOS_VERSION` | `0.1.0` |
| `/awos-recruitment/prod/embedding-model` | `AWOS_EMBEDDING_MODEL` | `all-MiniLM-L6-v2` |
| `/awos-recruitment/prod/search-threshold` | `AWOS_SEARCH_THRESHOLD` | `20` |
| `/awos-recruitment/prod/registry-path` | `AWOS_REGISTRY_PATH` | `/app/registry` |

All type `String` (no secrets). Injected via the `secrets` block in the ECS container definition using `valueFrom`.

### 2.7 ECR Repository

- **Repository name:** `awos-recruitment-mcp`
- **Image tagging:** Each push tagged with git short SHA + `latest`
- **Lifecycle policy:** Keep 10 most recent tagged images; expire untagged images after 1 day

### 2.8 Manual Deployment Workflow

Since CI/CD is out of scope, the deployment steps are:

1. `docker build -t awos-recruitment-mcp .` (from `server/`)
2. `docker tag` with ECR repo URL + git SHA + `latest`
3. `aws ecr get-login-password | docker login`
4. `docker push` (both tags)
5. `aws ecs update-service --cluster awos-recruitment --service awos-recruitment-mcp --force-new-deployment`

Consider adding a `just deploy` task to wrap these steps.

---

## 3. Impact and Risk Analysis

**System Dependencies:**
- The existing server code requires no changes — the Dockerfile runs the same `python -m awos_recruitment_mcp` entry point with the same env vars
- The `AWOS_REGISTRY_PATH` default changes from `../registry` (relative) to `/app/registry` (absolute) in the container, configured via SSM

**Potential Risks & Mitigations:**

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Model download fails during Docker build (Hugging Face Hub outage) | Low | The model is cached in the Docker layer; rebuilds from cache succeed. Retry the build if the initial download fails. |
| Task fails health checks during startup (model loading > 120s) | Low | Health check grace period is 120s (2x expected time). Circuit breaker auto-rolls back if tasks never become healthy. |
| Single NAT Gateway AZ failure | Low | Tasks in the other AZ lose outbound internet. Only affects new task launches (image pulls) — running tasks are unaffected. Acceptable for this workload. |
| Image size (~2 GB) causes slow deployments | Medium | Fargate caches layers. Only changed layers are pulled. First deploy is slow (~60s pull), subsequent deploys are faster. |
| `terraform destroy` accidentally run | Low | S3 backend with locking prevents concurrent runs. Add a `prevent_destroy` lifecycle rule on critical resources (ALB, ECS service) as a guardrail. |

**Estimated monthly cost:** ~$175–180 (Fargate ~$110, ALB ~$27, NAT ~$32, misc ~$8).

---

## 4. Testing Strategy

- **Terraform validation:** `terraform validate` and `terraform plan` before every apply to catch configuration errors
- **Docker build test:** Build and run the image locally (`docker run -p 8000:8000`) and verify `curl http://localhost:8000/health` returns 200
- **Post-deployment smoke test:** After `terraform apply` and ECS service update, verify:
  1. `curl https://recruitment.awos.provectus.pro/health` returns `{"status": "ok", "version": "..."}`
  2. An MCP search query against the hosted URL returns results
- **Rollback test:** Push a deliberately broken image to verify the ECS circuit breaker triggers automatic rollback
