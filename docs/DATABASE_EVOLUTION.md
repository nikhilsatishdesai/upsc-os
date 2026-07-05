# DATABASE_EVOLUTION.md — Storage migration paths (design only)

> Nothing here is implemented. Current storage: two zustand-persist stores in
> localStorage (see DATA_MODEL.md). This document describes how storage should
> evolve WITHOUT rewriting the app.

## 0. The invariant that makes every path cheap

All reads/writes already flow through **two choke points** (the stores) and all
data is **serializable JSON keyed by topic id / entity id** with explicit
versioning and battle-tested sanitizers (`migrate` chain, backup v1–v5
importers). Therefore any migration is: (1) implement a storage adapter,
(2) one-time import using the EXISTING sanitizers, (3) keep ids unchanged.
Never change entity shapes as part of a storage move — one change at a time.

## 1. Step 1 (client-side): IndexedDB — recommended before any server

**Why**: localStorage's ~5 MB cap and synchronous whole-store writes are the
current ceilings (notes/PYQs grow). **How**: zustand persist accepts custom
storage — swap `createJSONStorage(() => localStorage)` for an IndexedDB-backed
adapter (e.g. `idb-keyval`), which is async; zustand handles async storage.
Migration: on boot, if IDB empty and localStorage keys exist → copy, verify,
keep localStorage as read-only fallback for one release. Backup format
unchanged. Effort: small. This also unlocks storing embeddings later.

## 2. SQLite (desktop/offline-rich future, e.g. Tauri or wasm-sqlite)

**Model**: mostly document-style to preserve shapes — tables
`topics(id TEXT PK, state JSON)`, `tasks(id PK, date, status, topic_id, doc JSON)`
(promote the columns queries need: date, status, topicId, kind),
`knowledge_<entity>(id PK, topic_id, doc JSON)`, `events(id, topic_id, at, type, label)`,
`snapshots(date PK, doc)`, `meta(key, value)` for settings/versions.
**Migration path**: exportStateToJSON → one importer that walks the backup file
(reuse sanitizers) → INSERTs. Store actions swap map-mutations for row writes
behind the same action signatures. **Wins**: real indexes for search/timeline,
no size ceiling. **Costs**: async everywhere (same cost as IDB), packaging.

## 3. PostgreSQL / Supabase (the "Bridge" phase — accounts + sync)

Supabase = Postgres + auth + row-level security; it is the roadmap's chosen
target, so design for it:

- **Schema**: same promoted-column + JSONB pattern as SQLite, plus
  `user_id UUID` on every row and RLS policy `user_id = auth.uid()` on every
  table. Keep client-generated ids (they're UUID-ish already via `makeId`) —
  offline-first creation must not wait for the server.
- **Sync model (recommended): per-entity last-write-wins with updatedAt**, not
  operational transforms — entities are small and single-user. Client keeps a
  local outbox (IndexedDB) of dirty entity ids; a sync worker pushes/pulls.
  Conflicts (same entity changed on two devices): newer `updatedAt` wins;
  counters (`studiedMinutes`, streaks) merge by max/sum rules documented per
  field. Tasks are append-mostly (completed history immutable) which makes this
  tractable.
- **Migration path**: sign-in → "Upload this device's data" runs the backup
  exporter → server importer (same sanitizers, compiled to an edge function)
  → local stores become the offline cache. The app MUST keep working fully
  offline; the server is a replica, not the master, until the user has ≥2
  devices.
- **Search upgrade**: `pg_trgm` for fuzzy, later `pgvector` for AI search.

## 4. Firebase (documented alternative — not preferred)

Firestore maps naturally (collections per entity, doc per id, `users/{uid}/…`)
and gives offline cache for free, but: weaker relational/reporting queries for
future PYQ analytics, vendor lock-in for the planned pgvector work, and rules
language instead of RLS. If chosen anyway: one collection per entity type,
same LWW strategy, keep the JSON doc shape identical to the backup format.

## 5. Ordering & non-negotiables

1. IndexedDB first (pure client win, zero product change).
2. Supabase only WITH the Bridge phase (auth is out of scope until then).
3. The backup JSON (v5+) remains the lingua franca — every storage target must
   import/export it losslessly; it doubles as the escape hatch from any vendor.
4. Never run a storage migration and a schema change in the same release.
5. Sanitizers stay the single validation path for anything entering a store,
   local or remote.
