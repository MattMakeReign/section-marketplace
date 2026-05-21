/**
 * section-contract.ts — types that define how marketplace sections are
 * consumed by host projects.
 *
 * Two contracts:
 *
 * 1. **Page sections** (`kind: "page"` in canonical-categories) — prop-less
 *    React components. Self-contained. Composed by `app/(site)/<route>/page.tsx`
 *    in any order the designer chooses. No props from this file apply to them.
 *
 * 2. **Persistence sections** (`kind: "persistence"`) — global chrome that
 *    persists across every page. Installed once per project into
 *    `globals.config.ts`. Receive props from the project layout so they can
 *    adapt to the project's pages list, the current route, and the designer's
 *    configured settings.
 *
 * Persistence sections come in two flavours, navigation and footer, with
 * slightly different prop shapes — defined below.
 *
 * Settings are declared by each section in a small custom mini-spec
 * (`SettingsSchema`) rather than JSON Schema — keeps the runtime tiny and the
 * Configure-form renderer simple.
 */

/* ── Shared types ─────────────────────────────────────────────────── */

/**
 * A page in the project's navigation. Mirrors the shape exposed by the
 * Pages panel (`agent.listPages()`) and `nav.config.ts` (`NavItem`), kept
 * minimal so a nav section doesn't need to know about anything beyond what
 * it renders.
 */
export type NavPage = {
  label: string;
  /** Optional — sub-menu parents may have no href, only children. */
  href?: string;
  /** External targets get `target="_blank"` + `rel="noopener noreferrer"`. */
  external?: boolean;
  /** Sub-menu items. Two-deep max — the visual tree caps at depth 2. */
  children?: NavPage[];
};

/* ── Nav section contract ─────────────────────────────────────────── */

/**
 * Props a nav section receives from the host layout.
 *
 * `pages` is whichever source the designer chose via the `useCuratedNav`
 * setting — either the auto Pages-panel list or the curated `nav.config.ts`
 * tree. The section itself never knows which; it just renders.
 */
export type NavSectionProps = {
  pages: NavPage[];
  currentPath: string;
  settings: Record<string, unknown>;
};

/* ── Footer section contract ──────────────────────────────────────── */

/**
 * Props a footer section receives from the host layout. Flat pages list
 * (footers don't render sub-menus in V1) plus settings.
 */
export type FooterSectionProps = {
  pages: Array<{ label: string; href: string }>;
  settings: Record<string, unknown>;
};

/* ── Settings mini-spec ───────────────────────────────────────────── */

/**
 * The data types a settings field can hold. Kept small and concrete so the
 * Configure-form renderer can switch on `type` exhaustively.
 *
 * - `string` — single-line text.
 * - `boolean` — a toggle.
 * - `enum` — one of `options`. Renders as a segmented control.
 * - `href` — same as string but validated as a URL or local path.
 * - `number` — integer or float.
 */
export type SettingsFieldType = "string" | "boolean" | "enum" | "href" | "number";

export type SettingsField = {
  /** Stable id used as the key in the settings object. */
  key: string;
  /** Designer-facing label in the Configure form. */
  label: string;
  type: SettingsFieldType;
  /** Default value used when a section is first installed. */
  default: unknown;
  /** Enum options. Ignored for other types. */
  options?: string[];
  /** Short helper text under the field. */
  hint?: string;
};

/**
 * The full settings schema a persistence section declares. Lives alongside
 * the section's source as `settings.schema.json` so the marketplace can ship
 * it without bundling code.
 */
export type SettingsSchema = SettingsField[];

/* ── Slot identifier ──────────────────────────────────────────────── */

/**
 * Which slot a persistence section fills. Marketplace listings + the picker
 * filter against this.
 */
export type GlobalSlot = "nav" | "footer";
