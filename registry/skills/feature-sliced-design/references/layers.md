# FSD Layers Reference

## Layer Hierarchy

```
app        (highest)  — Providers, routing, global init
pages                 — Application routes
widgets               — Composite UI blocks
features              — User interactions
entities              — Business domain objects
shared     (lowest)   — Infrastructure code
```

---

## App (`src/app/`)

**Purpose**: Composition root — providers, routing, global styles, entry point.

- Single entry point for the application
- Wraps in providers (theme, auth, query client)
- Defines route configuration
- Not a "slice" — it's the shell that assembles everything

**Can Import**: all layers | **Cannot Import**: —

---

## Pages (`src/pages/`)

**Purpose**: Route-level entry points that compose widgets, features, and entities into views.

- One page = one route
- Orchestrates lower layers into a complete screen
- Contains page-specific UI, hooks, state

**Can Import**: widgets, features, entities, shared | **Cannot Import**: app, other pages

> See `examples/slice-examples.md` for directory tree and public API.

---

## Widgets (`src/widgets/`)

**Purpose**: Composite UI blocks that combine features and entities, reused across pages.

- Self-contained UI sections with business meaning
- Combine multiple entities and/or features
- Should represent a meaningful unit, not just a visual grouping

**Can Import**: features, entities, shared | **Cannot Import**: app, pages, other widgets

**When to create**: UI block used in 2+ pages, combines multiple entities/features, too complex for a single entity.

> See `examples/slice-examples.md` for directory tree and public API.

---

## Features (`src/features/`)

**Purpose**: User interactions — things a user *does* in the app.

- Encapsulates a single user action or interaction flow
- Contains UI + logic + API calls for that action
- Examples: auth, search, comment, like, filter, share

**Can Import**: entities, shared | **Cannot Import**: app, pages, widgets, other features

**When to create**: it represents a user action (not a data entity), it has its own UI + logic + possibly API.

---

## Entities (`src/entities/`)

**Purpose**: Business domain objects with UI, data access, and logic.

- Core concepts: User, Customer, Project, Order
- Domain-specific UI components (cards, avatars, badges)
- API hooks for CRUD operations
- Reusable across features, widgets, and pages

**Can Import**: shared | **Cannot Import**: app, pages, widgets, features, other entities

> See `examples/slice-examples.md` for directory tree and public API.

---

## Shared (`src/shared/`)

**Purpose**: Reusable infrastructure with no business logic.

- API client and request utilities
- Generic helpers (date formatting, classname merge, debounce)
- Shared hooks (useDebounce, useLocalStorage)
- Extended UI components wrapping a library

**Can Import**: — | **Cannot Import**: all other layers

**What does NOT belong**: business logic, domain types, entity-specific API hooks, feature-specific utilities.

---

## Cross-Entity Communication

Entities cannot import each other. To combine entity data, compose in a higher layer:

- **Entity** exports its own components and hooks via public API
- **Widget/page/feature** imports from multiple entities and passes composed data down as props
- Use IDs or shared types from `shared/` to reference across entity boundaries

---

## Detecting Violations

Any of these patterns is a violation:

- Same-layer import: entity → entity, widget → widget, feature → feature
- Upward import: entity → feature, feature → widget, widget → page
- Direct internal import: `@/entities/customer/ui/customer-card` instead of `@/entities/customer`

**Fixing**: move shared logic to a lower layer, or compose in a higher layer.

---

## Decision Tree

```
App-level setup (providers, routing, global styles)?
├── Yes → app
└── No
    Route/URL endpoint?
    ├── Yes → pages
    └── No
        User action or interaction flow?
        ├── Yes → features
        └── No
            Reused across multiple pages?
            ├── Yes
            │   Business entity? → entities
            │   Composite UI? → widgets
            └── No
                Page-specific? → keep in that page
                Generic infra? → shared
                Domain logic? → entities
                User action? → features
```
