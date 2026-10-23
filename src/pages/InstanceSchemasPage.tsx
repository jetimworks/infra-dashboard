import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ChevronRight,
  Database,
  FolderTree,
  RefreshCw,
  Table2,
} from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Card, CardHeader, CardTitle } from "../components/ui/Card"
import { Badge, type BadgeTone } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"
import { LoadingBlock, LoadingPage } from "../components/ui/LoadingState"
import { ErrorState } from "../components/ui/ErrorState"
import { EmptyState } from "../components/ui/EmptyState"
import { useInstance, useInstanceDbSchemas } from "../queries/instances"
import { normalizeError } from "../api/errors"
import { formatBytes } from "../lib/utils"
import { pageVariants, reducedVariants } from "../lib/motion"
import {
  dbErrorGuidance,
  parseDbErrorCode,
  readRemoteDbConfig,
} from "../lib/remote-db"
import type { DbRelation, DbRelationKind } from "../api/types"

/**
 * Mirrors maxTables in infra-backend/internal/services/rdb/catalog.go:90 — a
 * global budget across every schema in the response, not a per-schema one.
 * Quoted in the banner so "this list is incomplete" reads as a known,
 * deliberate limit rather than a bug.
 */
const MAX_RELATIONS = 5000

/**
 * Tone per relation kind. `table` is the default and stays neutral; the rest
 * are what an operator is scanning for when they open this page, so they get
 * a colour that separates "this holds data" from "this is a query".
 *
 * Lookup is by exact label and falls through to neutral, because the backend
 * passes an unrecognised `relkind` code straight through
 * (catalog.go:231-246) — a new PostgreSQL relkind must render as an ordinary
 * row, never as an unstyled hole or a thrown lookup.
 */
const KIND_TONE: Record<string, BadgeTone> = {
  table: "neutral",
  partitioned_table: "primary",
  view: "info",
  materialized_view: "success",
  foreign_table: "info",
}

/** "table" and "view" are already words; the rest read better split up. */
function kindLabel(kind: DbRelationKind): string {
  return kind.replace(/_/g, " ")
}

/**
 * The kinds whose size_bytes is an actual measurement.
 *
 * The catalog query guards pg_total_relation_size behind
 * `CASE WHEN relkind IN ('r','p','m') ... ELSE 0 END`
 * (infra-backend/internal/services/rdb/catalog.go:112) because the function
 * raises on some relkind values. So a view or a foreign table arrives with a
 * hard-coded 0 that measures nothing — rendering "0 B" would assert a view
 * occupies no disk at all, which is false and, for a view, meaningless.
 */
const SIZE_IS_MEASURED = new Set<DbRelationKind>([
  "table",
  "partitioned_table",
  "materialized_view",
])

export function InstanceSchemasPage() {
  const { id } = useParams<{ id: string }>()
  const reduceMotion = useReducedMotion()

  const instanceQ = useInstance(id)
  // Undefined until the user picks from the list, so the first request asks for
  // exactly the database this instance is configured with. Sending the
  // configured name as an override on the first load would be equivalent, but
  // this way the "what did we dial" question has exactly one answer.
  const [override, setOverride] = useState<string | undefined>(undefined)
  const schemasQ = useInstanceDbSchemas(id, override)
  const response = schemasQ.data

  if (instanceQ.isLoading) return <LoadingPage label="Loading…" />
  if (instanceQ.isError || !instanceQ.data) {
    return (
      <ErrorState
        title="We couldn't load this database"
        error={instanceQ.error as Error}
        onRetry={() => instanceQ.refetch()}
      />
    )
  }

  const instance = instanceQ.data

  // Gate on the TYPE, never on config.db_name. A local RDS also carries a
  // database name, so a presence check would let it past this guard and then
  // 400 on an endpoint that only speaks for REMOTE_RDS.
  if (instance.type !== "REMOTE_RDS") {
    return (
      <div className="space-y-6">
        <Breadcrumb id={instance.id} name={instance.name} />
        <Card>
          <EmptyState
            icon={Database}
            title="Only remote databases can be browsed"
            description="This page reads the catalog of a database we connect to directly over TCP. A database container lives inside a server on this platform — reach it through that server instead."
            action={{
              label: "Back to overview",
              onClick: () => window.history.back(),
              variant: "outline",
            }}
          />
        </Card>
      </div>
    )
  }

  const configured = readRemoteDbConfig(instance.config).database
  const selected = response?.database ?? override ?? configured
  // Read straight off the response rather than cached across renders: switching
  // database changes the query key, and the brief window where the new key has
  // no data yet is already covered by the loading state below. Preserving the
  // old list would mean the select could offer a database whose catalog isn't
  // the one on screen.
  const databases = response?.databases ?? []
  const schemas = response?.schemas ?? []
  const relationCount = schemas.reduce(
    (total, schema) => total + schema.tables.length,
    0
  )

  return (
    <motion.div
      className="space-y-6"
      initial="initial"
      animate="enter"
      variants={reduceMotion ? reducedVariants : pageVariants}
    >
      <Breadcrumb id={instance.id} name={instance.name} />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[1.5rem] font-bold leading-tight text-fg tracking-tight xs:text-[1.625rem] sm:text-[1.75rem]">
            Schema
          </h1>
          <p className="mt-1 text-[0.9375rem] text-fg-muted">
            The schemas and relations{" "}
            <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.8125rem]">
              {selected || "your database"}
            </code>{" "}
            exposes. Read-only — we query the catalog, we don't change anything.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={RefreshCw}
          onClick={() => schemasQ.refetch()}
          isLoading={schemasQ.isFetching}
        >
          Refresh
        </Button>
      </header>

      {databases.length > 1 ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Database</CardTitle>
              <p className="mt-1 text-sm text-fg-muted">
                This server hosts {databases.length} databases. Switching
                reconnects and reads that database's catalog instead.
              </p>
            </div>
            <div className="w-full sm:w-64">
              <label htmlFor="schema-database" className="sr-only">
                Database to browse
              </label>
              <select
                id="schema-database"
                value={selected}
                onChange={(event) => setOverride(event.target.value)}
                className="h-11 w-full rounded-md border border-border/60 bg-surface px-3.5 text-[0.9375rem] text-fg focus:border-primary/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {/*
                  The list is datallowconn AND NOT datistemplate, so the
                  database we are actually connected to is normally in it. It
                  isn't always: a template database is connectable but excluded
                  from the list, and without this the <select> would render
                  with a value matching no option and silently display blank.
                */}
                {selected && !databases.includes(selected) ? (
                  <option value={selected}>{selected}</option>
                ) : null}
                {databases.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      {response?.truncated ? (
        <div
          role="status"
          className="rounded-md border border-warning-soft bg-warning-soft/50 p-4 text-sm text-fg"
        >
          <span className="font-medium text-warning-fg">
            Showing the first {MAX_RELATIONS.toLocaleString()} relations.
          </span>{" "}
          <span className="text-fg-muted">
            This database has more than that, and the list is cut off rather
            than paged — run{" "}
            <code className="font-mono text-[0.8125rem]">ANALYZE</code> or
            narrow your query if you were looking for something further down.
          </span>
        </div>
      ) : null}

      {schemasQ.isLoading ? (
        <Card>
          <LoadingBlock label="Reading the catalog…" className="py-6" />
        </Card>
      ) : schemasQ.isError ? (
        <BrowseError
          message={normalizeError(schemasQ.error).message}
          onRetry={() => schemasQ.refetch()}
        />
      ) : relationCount === 0 ? (
        <Card>
          <EmptyState
            icon={Table2}
            tone="info"
            title="No user tables in this database yet"
            description="Every schema we can see is either empty or belongs to PostgreSQL itself — nothing here for us to list."
            className="py-6"
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            {relationCount.toLocaleString()}{" "}
            {relationCount === 1 ? "relation" : "relations"} across{" "}
            {schemas.length} {schemas.length === 1 ? "schema" : "schemas"}.
          </p>
          {schemas.map((schema) => (
            <SchemaCard key={schema.name} name={schema.name} tables={schema.tables} />
          ))}
        </div>
      )}
    </motion.div>
  )
}

/**
 * A 400 / 502 / 504 from this endpoint is the backend telling us something
 * specific, and it says so in a machine-readable prefix. So the panel shows the
 * backend's own message verbatim, then adds the operator-facing remediation
 * for that error code — rather than replacing the message with our own wording,
 * which would throw away the detail that distinguishes a TLS failure from a
 * refused port.
 */
function BrowseError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  const code = parseDbErrorCode(message)
  return (
    <Card>
      <div
        role="alert"
        className="flex items-start gap-3 rounded-md bg-danger-soft p-4 text-sm text-danger-fg ring-1 ring-danger/25 ring-inset"
      >
        <Database className="h-5 w-5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">We couldn't read the catalog</p>
          <p className="mt-1 font-mono text-xs opacity-90">{message}</p>
          {code ? (
            <p className="mt-2 text-sm opacity-90">{dbErrorGuidance(code).text}</p>
          ) : null}
          <div className="mt-3">
            <Button variant="outline" size="sm" leftIcon={RefreshCw} onClick={onRetry}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function SchemaCard({
  name,
  tables,
}: {
  name: string
  tables: DbRelation[]
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-2">
          <FolderTree className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
          <CardTitle>{name}</CardTitle>
          <span className="text-sm text-fg-muted">
            {tables.length} {tables.length === 1 ? "relation" : "relations"}
          </span>
        </div>
      </CardHeader>
      {tables.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-fg-muted">
          No relations in this schema.
        </p>
      ) : (
        // The divide-y list-of-full-width-rows shape used by the nginx log
        // file list: a database with hundreds of relations needs to be scanned,
        // not paginated.
        <ul className="divide-y divide-border/30">
          {tables.map((table) => (
            <RelationRow key={table.name} relation={table} />
          ))}
        </ul>
      )}
    </Card>
  )
}

function RelationRow({ relation }: { relation: DbRelation }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors duration-150 hover:bg-surface-sunken">
      <span className="flex min-w-0 items-center gap-2">
        <Table2 className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
        <span className="truncate font-mono text-[0.8125rem]">{relation.name}</span>
        <Badge tone={KIND_TONE[relation.kind] ?? "neutral"}>
          {kindLabel(relation.kind)}
        </Badge>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-xs text-fg-muted">
        <RelationSize relation={relation} />
        <span aria-hidden>·</span>
        <RowCount rows={relation.estimated_rows} />
      </span>
    </li>
  )
}

/**
 * A zero we know is unmeasured renders as "—", never "0 B". An unknown relkind
 * passes straight through the backend's label function, so it isn't in the
 * measured set either — and an unrecognised kind showing "0 B" is exactly the
 * same lie. Non-zero is always shown: it can only have come from a real
 * pg_total_relation_size call.
 */
function RelationSize({ relation }: { relation: DbRelation }) {
  if (relation.size_bytes > 0 || SIZE_IS_MEASURED.has(relation.kind)) {
    return (
      <span className="tabular-nums">{formatBytes(relation.size_bytes)}</span>
    )
  }
  return (
    <span
      className="tabular-nums"
      title="This relation kind has no meaningful on-disk size — a view is a stored query, not stored data."
    >
      —
    </span>
  )
}

/**
 * `estimated_rows` is pg_class.reltuples — the planner's last estimate, not a
 * count. Two rules follow from that, and both matter more than they look:
 *
 *  1. A non-zero estimate is prefixed with "≈" and never presented as a fact.
 *     The planner is routinely wrong by a wide margin on an un-analysed or
 *     fast-changing table, and a bare "412" reads as authoritative.
 *
 *  2. A zero is NOT rendered as "≈0". The backend clamps PostgreSQL's -1
 *     ("no statistics collected yet") to 0 with GREATEST(reltuples, 0), which
 *     makes a never-analysed table indistinguishable from an empty one. "≈0"
 *     would assert the table is empty; it might hold millions of rows. "—" is
 *     the only honest rendering — it claims nothing.
 */
function RowCount({ rows }: { rows: number }) {
  if (rows <= 0) {
    return (
      <span
        className="tabular-nums"
        title="No row estimate available — PostgreSQL has no statistics for this relation, or it is genuinely empty."
      >
        — rows
      </span>
    )
  }
  return (
    <span className="tabular-nums" title="Estimated by the PostgreSQL planner, not an exact count.">
      ≈{rows.toLocaleString()} rows
    </span>
  )
}

function Breadcrumb({ id, name }: { id: string; name: string }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-fg-muted">
      <Link to="/instances" className="hover:text-fg">
        Infrastructure
      </Link>
      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      <Link to={`/instances/${id}`} className="hover:text-fg">
        {name}
      </Link>
      <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      <span className="font-medium text-fg">Schema</span>
    </nav>
  )
}