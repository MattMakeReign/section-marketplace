/**
 * lint-adaptation.ts
 *
 * The design-system adaptation lint. Scans the source files of a section
 * (`*.tsx`, `*.ts`, `*.css`) and flags anything that would break the
 * contract — hard-coded colours, hard-coded font sizes / families, chrome
 * token usage, etc.
 *
 * The contract is documented in `CONTRACT.md`. This file is its enforcement.
 *
 * Per-line opt-out: append the marker `mr-marketplace-allow` in a `//` line
 * comment (or a block comment for CSS) on the SAME line as a flagged token.
 * Use sparingly and only when the token genuinely cannot be expressed via
 * project design tokens.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export type LintFinding = {
  file: string; // path relative to the section dir
  line: number;
  column: number;
  rule: string;
  match: string;
  message: string;
};

type Rule = {
  name: string;
  pattern: RegExp;
  message: string;
  appliesTo: (filename: string) => boolean;
};

const ALLOW_MARKER = "mr-marketplace-allow";

const RULES: Rule[] = [
  {
    name: "no-chrome-tokens",
    pattern: /var\(\s*--chrome-/g,
    message:
      "chrome tokens (--chrome-*) are reserved for MakeReign tooling UI; sections must consume content tokens only",
    appliesTo: (f) => /\.(tsx?|css)$/.test(f),
  },
  {
    name: "no-hex-colors",
    // Match standalone hex colour literals: #fff, #ffff, #ffffff, #ffffffff.
    // Negative lookbehind / lookahead avoid matching anchor links (#section)
    // or accidental substrings inside identifiers.
    pattern:
      /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![\w])/g,
    message:
      "hard-coded hex colour; use a design-system token (--surface, --fg, --accent, …) or a token-mapped utility instead",
    appliesTo: (f) => /\.(tsx?|css)$/.test(f),
  },
  {
    name: "no-rgb-or-hsl-colors",
    pattern: /\b(?:rgba?|hsla?)\s*\(/g,
    message:
      "hard-coded rgb()/hsl() colour function; use a design-system token instead",
    appliesTo: (f) => /\.(tsx?|css)$/.test(f),
  },
  {
    name: "no-arbitrary-color-utilities",
    pattern:
      /\b(?:text|bg|border|fill|stroke|ring|shadow|outline|decoration|accent|caret|from|via|to)-\[(?:#|rgb|hsl)/g,
    message:
      "Tailwind arbitrary colour value; use a token-mapped utility (text-fg, bg-accent, border-border, …)",
    appliesTo: (f) => /\.tsx?$/.test(f),
  },
  {
    name: "no-arbitrary-font-size",
    pattern: /\btext-\[\d+(?:\.\d+)?(?:px|rem|em|pt)\]/g,
    message:
      "Tailwind arbitrary font-size; use a role token (text-heading-1, text-body-large, text-button-large, …)",
    appliesTo: (f) => /\.tsx?$/.test(f),
  },
  {
    name: "no-font-family-declaration",
    pattern: /font-family\s*:/g,
    message:
      "sections must not declare font-family; typography is a project-level decision",
    appliesTo: (f) => /\.(css|tsx?)$/.test(f),
  },
  {
    name: "no-arbitrary-font-family-utility",
    pattern: /\bfont-\[/g,
    message:
      "Tailwind arbitrary font-family utility; sections must not declare typography family",
    appliesTo: (f) => /\.tsx?$/.test(f),
  },
];

const SCAN_EXTENSIONS = new Set([".tsx", ".ts", ".css"]);
const SKIP_FILES = new Set(["README.md", "section.json"]);

export function lintSection(sectionDir: string): LintFinding[] {
  const findings: LintFinding[] = [];
  const files = walk(sectionDir);

  for (const filePath of files) {
    const fileName = filePath.slice(sectionDir.length + 1);
    if (SKIP_FILES.has(fileName)) continue;

    const ext = fileName.slice(fileName.lastIndexOf("."));
    if (!SCAN_EXTENSIONS.has(ext)) continue;

    const source = readFileSync(filePath, "utf8");
    const lines = source.split(/\r?\n/);

    for (const rule of RULES) {
      if (!rule.appliesTo(fileName)) continue;

      lines.forEach((line, lineIdx) => {
        if (line.includes(ALLOW_MARKER)) return;

        rule.pattern.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = rule.pattern.exec(line))) {
          findings.push({
            file: fileName,
            line: lineIdx + 1,
            column: m.index + 1,
            rule: rule.name,
            match: m[0],
            message: rule.message,
          });
          if (m.index === rule.pattern.lastIndex) rule.pattern.lastIndex++;
        }
      });
    }
  }

  return findings;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    let stats;
    try {
      stats = statSync(full);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      // Skip nested node_modules / build artefacts.
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}
