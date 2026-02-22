"""Pydantic model for validating bundle requests."""

from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, Field


class BundleRequest(BaseModel):
    """Request to bundle one or more capabilities by name.

    Attributes:
        names: List of kebab-case capability names to include in the bundle.
               Must contain between 1 and 20 entries, each matching the
               standard name pattern (lowercase alphanumeric and hyphens,
               1-64 characters).
    """

    names: list[Annotated[str, Field(pattern=r"^[a-z0-9-]{1,64}$")]] = Field(
        ..., min_length=1, max_length=20
    )
