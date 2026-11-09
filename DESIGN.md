# NexusProcure Design System

## Direction
Enterprise procurement operations console. Dense, calm, auditable, and optimized for comparing financial documents rather than marketing presentation.

## Typography
- UI: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- Numbers/code: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
- Page title: 20–24px semibold; operational body: 13px/20px; labels: 12px; table headers: 11px uppercase.
- Monetary values, quantities, dates, IDs: tabular numbers.

## Palette
- Canvas: `#f8fafc`
- Surface: `#ffffff`
- Subtle: `#f1f5f9`
- Border: `#e2e8f0`; strong: `#cbd5e1`
- Text: `#0f172a`; secondary: `#475569`; muted: `#64748b`
- Navigation: `#0f172a`; navigation elevated: `#1e293b`
- Interactive: `#2563eb`; primary action: `#0f172a`
- Success: `#065f46` on `#ecfdf5`
- Warning: `#92400e` on `#fffbeb`
- Danger: `#991b1b` on `#fef2f2`
- Info: `#1e40af` on `#eff6ff`

## Geometry
- 4px badge/kbd; 6px controls; 8px cards and panels.
- Border alone for ordinary surfaces; shadows only for floating overlays.
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 48.

## Shell
- 240px desktop navigation rail, 48px global utility bar, contextual page header.
- Desktop: main operational panel + 300px telemetry rail where relevant.
- Mobile: compact topbar and modal navigation; tables scroll within their own container.

## Components
- `KpiStatCard`: label, value, trend/sparkline, footer context.
- `EnterpriseDataGrid`: toolbar, dense table, numeric alignment, summary footer.
- `CommandPalette`: Ctrl/Cmd+K navigation.
- `InspectorDrawer`: right-side entity inspection overlay.
- `TelemetryAndDssRail`: decision alerts, status distribution, recent audit.
- `ChartCardWithDataMatrix`: SVG trend plus accessible numeric table.
- `Sections`: `SectionPanel`, `FieldList`, `TimelineList`, `MetricRows`, `UtilisationBar`, `EmptyCell`.
- `ActionForm` / `RowAction`: server-action wrapper with pending state, inline error, and optional two-step confirm.
- `PrintButton`: A4 document print trigger.
- `.doc-print`: standalone A4 document layout for PO and GRN.

## Routes
- `(app)` route group carries the 5-zone shell (Zones A-E) for every operational module.
- `login` and `(print)` are standalone layouts; they never inherit the app shell.
- Every module page follows the same order: `PageHeader` (Zona C), `KpiStrip` (Zona A), main panel + telemetry rail (Zona B/D), then a closing rule strip.
- Detail pages reuse the same zones and add document timeline, reference integrity, and downstream documents.

## Motion
150ms color/background transitions, 180ms overlay opacity/transform. No decorative animation, pulsing dots, layout animation, or hover zoom.
