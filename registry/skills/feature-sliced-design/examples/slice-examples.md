# Slice Example

Every slice — regardless of layer — follows the same structure.

## `src/{layer}/{slice-name}/`

```
{slice-name}/
├── ui/
│   ├── {component-a}.tsx      # One component per file
│   ├── {component-b}.tsx
│   └── index.ts               # Re-exports all components
├── hooks/
│   ├── use-{something}.ts     # One hook per file
│   └── index.ts               # Re-exports all hooks
├── utils/
│   ├── {helper}.ts            # One function per file
│   └── index.ts               # Re-exports all utils
├── types.ts                   # All types, interfaces, enums for this slice
├── config.ts                  # Constants, mappings, defaults
├── index.ts                   # PUBLIC API — the only file others import from
└── CLAUDE.md                  # What this module is for + non-obvious context
```

## How the files work

**`index.ts`** — public API. The only entry point for external consumers. Selectively re-exports from segments:

```typescript
export { CustomerCard, CustomerAvatar } from './ui';
export { useCustomer, useCustomerList } from './hooks';
export type { Customer, CustomerStatus } from './types';
export { CUSTOMER_QUERY_KEYS } from './config';
```

**`ui/index.ts`**, **`hooks/index.ts`**, **`utils/index.ts`** — segment indexes. Re-export everything from their segment so that `index.ts` and sibling files import from `'./ui'`, never from `'./ui/customer-card'`.

**`types.ts`** — all TypeScript types for the slice. Enums, interfaces, form data types.

**`config.ts`** — constants: status color maps, label maps, query key factories, default values.

**`CLAUDE.md`** — 1-3 sentences: what this module is for. Plus a `## Notes` section if there are non-obvious behaviors or gotchas. Nothing else.

## What differs per layer

Nothing structural. The difference is only in **what the slice can import**:

- `entities/customer/` → can only import from `shared/`
- `features/search/` → can import from `entities/` and `shared/`
- `widgets/dashboard-header/` → can import from `features/`, `entities/`, `shared/`
- `pages/settings/` → can import from `widgets/`, `features/`, `entities/`, `shared/`
