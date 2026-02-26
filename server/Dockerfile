# ---- Builder stage ----
# Installs dependencies and pre-downloads the sentence-transformers model
# so the runtime image can start without network access to model registries.

FROM python:3.12-slim AS builder

# Install uv from the official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

# Copy dependency manifests first for optimal layer caching.
# The build context is the repo root, so paths are relative to that.
COPY server/pyproject.toml server/uv.lock ./

# Install third-party dependencies into a virtual environment WITHOUT
# building the project itself.  This layer is cached as long as the
# lock file does not change.
RUN uv sync --frozen --no-dev --no-install-project

# Copy the server source code so uv can build and install the project
# package into the venv (makes `python -m awos_recruitment_mcp` work).
COPY server/src/ /app/src/

# Now install the project itself (fast -- deps are already cached).
# --no-editable ensures the package is installed as a proper wheel
# rather than a .pth editable link, so the source tree is not needed
# in the runtime stage.
RUN uv sync --frozen --no-dev --no-editable

# Pre-download the sentence-transformers model so the runtime image
# starts faster and does not require internet access for model weights.
ENV HF_HOME=/app/.cache
RUN .venv/bin/python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# ---- Runtime stage ----
# Minimal image with only the venv, cached model, source code, and registry.

FROM python:3.12-slim AS runtime

# Create a non-root user for running the server.
RUN groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid 1000 --create-home appuser

WORKDIR /app

# Copy the virtual environment from the builder stage.
# The project package is installed inside the venv, so no separate
# source copy is needed for the server code.
COPY --from=builder /app/.venv /app/.venv

# Copy the pre-downloaded model cache from the builder stage.
# chown to the non-root user so HuggingFace can write negative-lookup
# cache entries without permission errors at runtime.
COPY --from=builder --chown=1000:1000 /app/.cache /app/.cache

# Copy the registry (read-only capability catalog).
COPY registry/ /app/registry/

# Point HuggingFace cache at the pre-downloaded models.
ENV HF_HOME=/app/.cache

# Tell the server where to find the registry inside the container.
ENV AWOS_REGISTRY_PATH=/app/registry

# Put the venv's bin directory first on PATH so `python` resolves
# to the venv interpreter with all installed packages.
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

# Drop privileges -- run as the non-root user.
USER appuser

ENTRYPOINT ["python", "-m", "awos_recruitment_mcp"]
