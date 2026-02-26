# Tasks: MCP Deployment on AWS

- [x] **Slice 1: Dockerfile — build and run the server locally in Docker**
  - [x] Create a multi-stage `server/Dockerfile` using `python:3.12-slim` base. Builder stage: install `uv`, sync deps from `pyproject.toml` + `uv.lock`, pre-download the `all-MiniLM-L6-v2` model. Runtime stage: copy venv, cached model, app source, and `registry/` directory. Run as non-root user (UID 1000), expose port 8000, entrypoint `python -m awos_recruitment_mcp`. Set `HF_HOME=/app/.cache` and `AWOS_REGISTRY_PATH=/app/registry`. **[Agent: devops-aws-expert]**
  - [x] Add `.dockerignore` to exclude `node_modules`, `.git`, `__pycache__`, `.venv`, `cli/`, `context/`, `docs/`, `infra/`. **[Agent: devops-aws-expert]**
  - [x] Verify: Build the image with `docker build -t awos-recruitment-mcp -f server/Dockerfile .` and run with `docker run -p 8000:8000 awos-recruitment-mcp`. Confirm `curl http://localhost:8000/health` returns `{"status": "ok", ...}`. **[Agent: devops-aws-expert]**
  - [x] Git commit. **[Agent: general-purpose]**

- [x] **Slice 2: Terraform project setup + VPC + ECR**
  - [x] Scaffold the `infra/` directory with `providers.tf` (AWS provider `~> 5.x`, Terraform `~> 1.9`, S3 backend for state), `variables.tf` (AWS region, project name, domain name, Route 53 zone ID, VPC CIDR), `outputs.tf`, and `terraform.tfvars.example`. **[Agent: devops-aws-expert]**
  - [x] Add `vpc.tf`: VPC (`10.0.0.0/16`), 2 public subnets (`10.0.1.0/24`, `10.0.2.0/24`), 2 private subnets (`10.0.10.0/24`, `10.0.20.0/24`), Internet Gateway, NAT Gateway (single AZ), route tables. **[Agent: devops-aws-expert]**
  - [x] Add `security_groups.tf`: ALB SG (inbound 443 + 80 from `0.0.0.0/0`, outbound 8000 to ECS SG) and ECS SG (inbound 8000 from ALB SG, outbound 443 to `0.0.0.0/0`). **[Agent: devops-aws-expert]**
  - [x] Add `ecr.tf`: ECR repository `awos-recruitment-mcp` with lifecycle policy (keep 10 tagged images, expire untagged after 1 day). **[Agent: devops-aws-expert]**
  - [x] Add `logs.tf`: CloudWatch log group for ECS task logs. **[Agent: devops-aws-expert]**
  - [x] Add `infra/.gitignore` to exclude `terraform.tfvars`, `.terraform/`, `*.tfstate*`. **[Agent: devops-aws-expert]**
  - [x] Verify: Run `terraform validate` and `terraform plan` successfully with a populated `terraform.tfvars`. **[Agent: devops-aws-expert]**
  - [x] Git commit. **[Agent: general-purpose]**

- [x] **Slice 3: ALB + ACM certificate + DNS**
  - [x] Add `acm.tf`: ACM certificate for `recruitment.awos.provectus.pro` with DNS validation via Route 53. **[Agent: devops-aws-expert]**
  - [x] Add `alb.tf`: Application Load Balancer (internet-facing) in public subnets, target group (HTTP port 8000, health check on `/health` with interval 30s, timeout 10s, healthy threshold 2, unhealthy threshold 3, deregistration delay 30s), HTTP listener (redirect to HTTPS), HTTPS listener (forward to target group using ACM cert). **[Agent: devops-aws-expert]**
  - [x] Add `dns.tf`: Route 53 A record (alias) pointing `recruitment.awos.provectus.pro` to the ALB. **[Agent: devops-aws-expert]**
  - [x] Verify: Run `terraform validate` and `terraform plan`. Confirm the plan shows the expected ALB, ACM, and DNS resources. **[Agent: devops-aws-expert]**
  - [x] Git commit. **[Agent: general-purpose]**

- [x] **Slice 4: ECS service + SSM parameters**
  - [x] Add `ssm.tf`: SSM parameters under `/awos-recruitment/prod/` for host, port, version, embedding-model, search-threshold, registry-path with default values. **[Agent: devops-aws-expert]**
  - [x] Add `ecs.tf`: ECS cluster, task execution IAM role (ECR pull, CloudWatch logs, SSM read scoped to `/awos-recruitment/prod/*`), task IAM role (empty), task definition (1 vCPU, 4 GB memory, container port 8000, SSM parameters as `secrets`, CloudWatch log driver), ECS service (desired count 2, min healthy 100%, max 200%, health check grace period 120s, circuit breaker with rollback enabled), attached to ALB target group in private subnets. **[Agent: devops-aws-expert]**
  - [x] Verify: Run `terraform validate` and `terraform plan`. Confirm the plan shows ECS cluster, service, task definition, IAM roles, and SSM parameters. **[Agent: devops-aws-expert]**
  - [x] Git commit. **[Agent: general-purpose]**

- [x] **Slice 5: Deploy to AWS and verify end-to-end**
  - [x] Add a `just deploy` task in the justfile that wraps the manual deployment steps: Docker build, tag with ECR repo URL + git SHA + `latest`, ECR login, push, and `aws ecs update-service --force-new-deployment`. **[Agent: devops-aws-expert]**
  - [x] Run `terraform apply` to provision all infrastructure. **[Agent: devops-aws-expert]**
  - [x] Build and push the Docker image to ECR. Force a new ECS deployment. **[Agent: devops-aws-expert]**
  - [x] Verify: `curl https://recruitment.awos.provectus.pro/health` returns HTTP 200 with `{"status": "ok", ...}`. **[Agent: devops-aws-expert]**
  - [x] Verify: Send an MCP search query to `https://recruitment.awos.provectus.pro` and confirm ranked results are returned from the capability registry. **[Agent: devops-aws-expert]**
  - [x] Update `docs/DEVELOPMENT.md` with the new `just deploy` command. **[Agent: general-purpose]**
  - [x] Git commit. **[Agent: general-purpose]**

---

**Note:** Slices 2–5 involve `terraform apply` against a real AWS account. The implementing agent can write and validate the Terraform code, but actual `terraform apply` and deployment steps require the user to run them manually (AWS credentials, cost implications). The agent will prepare everything and provide the exact commands.
