"use client";

import "./showcase.css";
import { useEffect, useState, type ReactNode } from "react";
import {
  // Primitives
  Button,
  Input,
  Textarea,
  Label,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Card,
  Separator,
  Badge,
  Avatar,
  AvatarFallback,
  Skeleton,
  Progress,
  ToggleGroup,
  ToggleGroupItem,
  // Overlays
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  // Marketplace composites
  TrackBadge,
  LifecycleBadge,
  SpecRow,
  DensityToggle,
  ViewportToggle,
  type ViewportName,
} from "@mr/tools-ui";

type Theme = "light" | "dark";

export function Showcase() {
  const [theme, setTheme] = useState<Theme>("light");
  const [density, setDensity] = useState<2 | 3 | 4>(3);
  const [viewport, setViewport] = useState<ViewportName>("desktop");
  const [progress, setProgress] = useState(45);

  useEffect(() => {
    document.documentElement.dataset.mrTheme = theme;
  }, [theme]);

  return (
    <div className="dsx-shell">
      <header className="dsx-header">
        <div>
          <div className="dsx-eyebrow">@mr/tools-ui</div>
          <h1 className="dsx-h1">Marketplace Design System</h1>
          <p className="dsx-lede">
            Shadcn-pattern primitives on Radix UI + cva. Plain CSS classes in
            the <code>mr-*</code> namespace. Light + dark themes via
            <code> [data-mr-theme]</code>.
          </p>
        </div>
        <div className="dsx-header__theme">
          <ToggleGroup
            type="single"
            value={theme}
            onValueChange={(v) => v && setTheme(v as Theme)}
            aria-label="Theme"
          >
            <ToggleGroupItem value="light" aria-label="Light theme">Light</ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label="Dark theme">Dark</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </header>

      <nav className="dsx-nav" aria-label="Sections">
        <a href="#foundations">Foundations</a>
        <a href="#primitives">Primitives</a>
        <a href="#overlays">Overlays</a>
        <a href="#composites">Composites</a>
      </nav>

      {/* ───────── FOUNDATIONS ───────── */}
      <Section id="foundations" title="Foundations" lede="Tokens that everything reads from. Two themes; warm-neutral palette; small radii; mono-uppercase labels.">
        <Subsection title="Surfaces" code="--mr-bg · --mr-surface · --mr-surface-muted · --mr-surface-elevated · --mr-surface-inverse">
          <div className="dsx-swatches">
            {["bg", "surface", "surface-muted", "surface-elevated", "surface-inverse"].map((s) => (
              <Swatch key={s} label={s} cssVar={`--mr-${s}`} />
            ))}
          </div>
        </Subsection>

        <Subsection title="Foreground" code="--mr-fg · --mr-fg-muted · --mr-fg-subtle · --mr-fg-disabled · --mr-fg-inverse">
          <div className="dsx-swatches">
            {["fg", "fg-muted", "fg-subtle", "fg-disabled", "fg-inverse"].map((s) => (
              <Swatch key={s} label={s} cssVar={`--mr-${s}`} />
            ))}
          </div>
        </Subsection>

        <Subsection title="Accents + state" code="--mr-accent · --mr-danger · --mr-success · --mr-warning">
          <div className="dsx-swatches">
            {["accent", "danger", "success", "warning"].map((s) => (
              <Swatch key={s} label={s} cssVar={`--mr-${s}`} />
            ))}
          </div>
        </Subsection>

        <Subsection title="Track + lifecycle" code="--mr-track-* · --mr-lifecycle-*">
          <div className="dsx-swatches">
            {["track-stable", "track-experimental", "track-legacy"].map((s) => (
              <Swatch key={s} label={s} cssVar={`--mr-${s}`} />
            ))}
            {["local", "draft", "submitted", "inreview", "approved", "promoted", "deprecated", "archived"].map((s) => (
              <Swatch key={s} label={`lifecycle-${s}`} cssVar={`--mr-lifecycle-${s}`} />
            ))}
          </div>
        </Subsection>

        <Subsection title="Typography roles" code="--mr-text-{display,heading,body,label,button}-{lg,md,sm}">
          <div className="dsx-type-stack">
            <TypeSample role="display-lg" sample="Display large" />
            <TypeSample role="display-md" sample="Display medium" />
            <TypeSample role="display-sm" sample="Display small" />
            <TypeSample role="heading-lg" sample="Heading large" />
            <TypeSample role="heading-md" sample="Heading medium" />
            <TypeSample role="heading-sm" sample="Heading small" />
            <TypeSample role="body-lg" sample="Body large — long-form prose at 16px, neutral leading." />
            <TypeSample role="body-md" sample="Body medium — chrome default at 14px, the workhorse." />
            <TypeSample role="body-sm" sample="Body small — secondary copy at 13px." />
            <TypeSample role="label-lg" sample="LABEL LARGE" />
            <TypeSample role="label-md" sample="LABEL MEDIUM" />
            <TypeSample role="label-sm" sample="LABEL SMALL" />
            <TypeSample role="button-lg" sample="BUTTON LARGE" />
            <TypeSample role="button-md" sample="BUTTON MEDIUM" />
            <TypeSample role="button-sm" sample="BUTTON SMALL" />
            <TypeSample role="mono-label" sample="MONO LABEL · 10PX · 0.06EM" />
          </div>
        </Subsection>

        <Subsection title="Spacing" code="--mr-space-{1,1_5,2,2_5,3,4,5,6,8,10,12,16,20,24}">
          <div className="dsx-spacing">
            {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24].map((n) => (
              <div key={n} className="dsx-spacing__row">
                <span className="dsx-spacing__label">space-{n}</span>
                <div className="dsx-spacing__bar" style={{ width: `var(--mr-space-${n})` }} />
                <span className="dsx-spacing__value">{n === 1 ? "4px" : `${n * 4}px`}</span>
              </div>
            ))}
          </div>
        </Subsection>

        <Subsection title="Radii" code="--mr-radius-{none,1,2,3,card,panel,pill}">
          <div className="dsx-radii">
            {[
              { name: "1", v: "3px" },
              { name: "2", v: "6px" },
              { name: "3", v: "10px" },
              { name: "card", v: "10px" },
              { name: "panel", v: "14px" },
              { name: "pill", v: "9999px" },
            ].map((r) => (
              <div key={r.name} className="dsx-radii__item">
                <div
                  className="dsx-radii__box"
                  style={{ borderRadius: `var(--mr-radius-${r.name})` }}
                />
                <span className="dsx-radii__label">radius-{r.name}</span>
                <span className="dsx-radii__value">{r.v}</span>
              </div>
            ))}
          </div>
        </Subsection>
      </Section>

      {/* ───────── PRIMITIVES ───────── */}
      <Section id="primitives" title="Primitives" lede="Foundational components — Radix-backed where appropriate, cva for variants, plain CSS classes for styling.">
        <Subsection title="Button" code="import { Button } from '@mr/tools-ui'">
          <div className="dsx-row">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="tertiary">Tertiary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div className="dsx-row">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="dsx-row">
            <Button shape="rect">Rect</Button>
            <Button shape="pill" variant="primary">Pill</Button>
            <Button shape="circle" variant="primary" aria-label="Add">+</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Subsection>

        <Subsection title="Input + Textarea" code="import { Input, Textarea } from '@mr/tools-ui'">
          <div className="dsx-stack" style={{ maxWidth: 360 }}>
            <Input placeholder="Default input" />
            <Input size="sm" placeholder="Small input" />
            <Input size="lg" placeholder="Large input" />
            <Input state="error" placeholder="Error state" />
            <Textarea placeholder="Textarea — defaults to 96px min-height, vertical resize." />
          </div>
        </Subsection>

        <Subsection title="Field" code="import { Field, FieldLabel, FieldDescription, FieldError } from '@mr/tools-ui'">
          <Field style={{ maxWidth: 360 }}>
            <FieldLabel htmlFor="dsx-email">Work email</FieldLabel>
            <Input id="dsx-email" type="email" placeholder="you@studio.com" />
            <FieldDescription>We&apos;ll use this for project notifications.</FieldDescription>
          </Field>
          <Field style={{ maxWidth: 360, marginTop: 16 }}>
            <FieldLabel htmlFor="dsx-pw">Password</FieldLabel>
            <Input id="dsx-pw" type="password" state="error" defaultValue="short" />
            <FieldError>Minimum 12 characters.</FieldError>
          </Field>
        </Subsection>

        <Subsection title="Label" code="import { Label } from '@mr/tools-ui'">
          <div className="dsx-row">
            <Label size="sm">Small label</Label>
            <Label size="md">Medium label</Label>
            <Label size="lg">Large label</Label>
          </div>
        </Subsection>

        <Subsection title="Select" code="import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@mr/tools-ui'">
          <Select defaultValue="medium">
            <SelectTrigger style={{ maxWidth: 240 }}>
              <SelectValue placeholder="Pick density" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="static">Static</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="experience">Experience</SelectItem>
            </SelectContent>
          </Select>
        </Subsection>

        <Subsection title="Checkbox" code="import { Checkbox } from '@mr/tools-ui'">
          <div className="dsx-row">
            <label className="dsx-checkbox-row">
              <Checkbox defaultChecked /> <span>Default checked</span>
            </label>
            <label className="dsx-checkbox-row">
              <Checkbox /> <span>Unchecked</span>
            </label>
            <label className="dsx-checkbox-row">
              <Checkbox disabled defaultChecked /> <span>Disabled</span>
            </label>
          </div>
        </Subsection>

        <Subsection title="ToggleGroup" code="import { ToggleGroup, ToggleGroupItem } from '@mr/tools-ui'">
          <ToggleGroup type="single" defaultValue="medium" aria-label="Density">
            <ToggleGroupItem value="low">Low</ToggleGroupItem>
            <ToggleGroupItem value="medium">Medium</ToggleGroupItem>
            <ToggleGroupItem value="high">High</ToggleGroupItem>
          </ToggleGroup>
        </Subsection>

        <Subsection title="Card" code="import { Card } from '@mr/tools-ui'">
          <div className="dsx-row">
            <Card style={{ padding: 16, width: 220 }}>
              <strong>Default surface</strong>
              <p style={{ color: "var(--mr-fg-muted)", fontSize: 13, marginTop: 4 }}>
                Hairline border, white surface.
              </p>
            </Card>
            <Card variant="muted" style={{ padding: 16, width: 220 }}>
              <strong>Muted surface</strong>
              <p style={{ color: "var(--mr-fg-muted)", fontSize: 13, marginTop: 4 }}>
                For tinted-panel use cases.
              </p>
            </Card>
            <Card interactive style={{ padding: 16, width: 220 }}>
              <strong>Interactive</strong>
              <p style={{ color: "var(--mr-fg-muted)", fontSize: 13, marginTop: 4 }}>
                Hover deepens the border.
              </p>
            </Card>
          </div>
        </Subsection>

        <Subsection title="Badge" code="import { Badge, TrackBadge, LifecycleBadge } from '@mr/tools-ui'">
          <div className="dsx-row">
            <Badge>Neutral</Badge>
            <Badge dotColor="var(--mr-accent)">Custom dot</Badge>
            <TrackBadge track="stable" />
            <TrackBadge track="experimental" />
            <TrackBadge track="legacy" />
          </div>
          <div className="dsx-row">
            <LifecycleBadge lifecycle="Local" />
            <LifecycleBadge lifecycle="Draft" />
            <LifecycleBadge lifecycle="Submitted" />
            <LifecycleBadge lifecycle="InReview" />
            <LifecycleBadge lifecycle="Approved" />
            <LifecycleBadge lifecycle="Promoted" />
            <LifecycleBadge lifecycle="Deprecated" />
            <LifecycleBadge lifecycle="Archived" />
          </div>
        </Subsection>

        <Subsection title="Avatar" code="import { Avatar, AvatarFallback } from '@mr/tools-ui'">
          <div className="dsx-row">
            <Avatar size="sm"><AvatarFallback>MT</AvatarFallback></Avatar>
            <Avatar size="md"><AvatarFallback>MT</AvatarFallback></Avatar>
            <Avatar size="lg"><AvatarFallback>MT</AvatarFallback></Avatar>
          </div>
        </Subsection>

        <Subsection title="Separator" code="import { Separator } from '@mr/tools-ui'">
          <div style={{ maxWidth: 360 }}>
            <span style={{ fontSize: 13 }}>Above</span>
            <Separator style={{ margin: "12px 0" }} />
            <span style={{ fontSize: 13 }}>Below</span>
          </div>
        </Subsection>

        <Subsection title="Progress" code="import { Progress } from '@mr/tools-ui'">
          <div className="dsx-stack" style={{ maxWidth: 360 }}>
            <Progress value={progress} />
            <Progress value={progress} tone="accent" />
            <Progress value={progress} tone="success" />
            <div className="dsx-row">
              <Button size="sm" onClick={() => setProgress((p) => Math.max(0, p - 10))}>-10</Button>
              <Button size="sm" onClick={() => setProgress((p) => Math.min(100, p + 10))}>+10</Button>
              <span style={{ alignSelf: "center", fontSize: 13, color: "var(--mr-fg-muted)" }}>{progress}%</span>
            </div>
          </div>
        </Subsection>

        <Subsection title="Skeleton" code="import { Skeleton } from '@mr/tools-ui'">
          <div className="dsx-stack" style={{ maxWidth: 360 }}>
            <Skeleton style={{ height: 14, width: "60%" }} />
            <Skeleton style={{ height: 14, width: "90%" }} />
            <Skeleton style={{ height: 80, width: "100%" }} />
          </div>
        </Subsection>
      </Section>

      {/* ───────── OVERLAYS ───────── */}
      <Section id="overlays" title="Overlays" lede="Floating surfaces — Dialog, Sheet, Popover, DropdownMenu, Tabs.">
        <Subsection title="Dialog" code="import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from '@mr/tools-ui'">
          <Dialog>
            <DialogTrigger asChild><Button>Open dialog</Button></DialogTrigger>
            <DialogContent>
              <DialogTitle>Confirm action</DialogTitle>
              <DialogDescription>
                Modal surface built on Radix Dialog. Backdrop blur + hairline panel.
              </DialogDescription>
              <div className="dsx-row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
                <Button variant="ghost">Cancel</Button>
                <Button variant="primary">Confirm</Button>
              </div>
            </DialogContent>
          </Dialog>
        </Subsection>

        <Subsection title="Sheet (slide-in drawer)" code="import { Sheet, SheetTrigger, SheetContent, SheetTitle } from '@mr/tools-ui'">
          <div className="dsx-row">
            <Sheet>
              <SheetTrigger asChild><Button>Open right sheet</Button></SheetTrigger>
              <SheetContent side="right">
                <SheetTitle>Right sheet</SheetTitle>
                <SheetDescription>
                  Slides in from the right. 420px wide max. Use for transient drawers.
                </SheetDescription>
              </SheetContent>
            </Sheet>
            <Sheet>
              <SheetTrigger asChild><Button>Open left sheet</Button></SheetTrigger>
              <SheetContent side="left">
                <SheetTitle>Left sheet</SheetTitle>
                <SheetDescription>Slides in from the left.</SheetDescription>
              </SheetContent>
            </Sheet>
          </div>
        </Subsection>

        <Subsection title="Popover" code="import { Popover, PopoverTrigger, PopoverContent } from '@mr/tools-ui'">
          <Popover>
            <PopoverTrigger asChild><Button>Open popover</Button></PopoverTrigger>
            <PopoverContent align="start">
              <div style={{ padding: 8 }}>
                <strong style={{ fontSize: 14 }}>Anchored to the trigger.</strong>
                <p style={{ fontSize: 13, color: "var(--mr-fg-muted)", marginTop: 4 }}>
                  Use for inline filter pickers, contextual actions, mini-forms.
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </Subsection>

        <Subsection title="DropdownMenu" code="import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@mr/tools-ui'">
          <div className="dsx-row">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button>Light tone</Button></DropdownMenuTrigger>
              <DropdownMenuContent tone="light">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button>Dark material tone</Button></DropdownMenuTrigger>
              <DropdownMenuContent tone="dark">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Subsection>

        <Subsection title="Tabs" code="import { Tabs, TabsList, TabsTrigger, TabsContent } from '@mr/tools-ui'">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="specs">Specs</TabsTrigger>
              <TabsTrigger value="changes">Changes</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <p style={{ fontSize: 13, color: "var(--mr-fg-muted)" }}>
                Overview content. Underline marks the active tab.
              </p>
            </TabsContent>
            <TabsContent value="specs">
              <p style={{ fontSize: 13, color: "var(--mr-fg-muted)" }}>
                Specs tab. Switch via click or keyboard.
              </p>
            </TabsContent>
            <TabsContent value="changes">
              <p style={{ fontSize: 13, color: "var(--mr-fg-muted)" }}>
                Changes tab.
              </p>
            </TabsContent>
          </Tabs>
        </Subsection>
      </Section>

      {/* ───────── COMPOSITES ───────── */}
      <Section id="composites" title="Marketplace composites" lede="Domain-shaped components that compose primitives. SectionCard / FilterPill etc. ship via @mr/tools-ui.">
        <Subsection title="SpecRow" code="import { SpecRow } from '@mr/tools-ui'">
          <dl style={{ maxWidth: 480 }}>
            <SpecRow label="Category" value="Editorial" />
            <SpecRow label="Version" value="v0.0.1" />
            <SpecRow label="Track" value={<TrackBadge track="experimental" />} />
            <SpecRow label="Lifecycle" value={<LifecycleBadge lifecycle="Submitted" />} />
            <SpecRow label="Motion" value="low · medium" />
          </dl>
        </Subsection>

        <Subsection title="DensityToggle" code="import { DensityToggle } from '@mr/tools-ui'">
          <DensityToggle value={density} onChange={(n) => setDensity(n as 2 | 3 | 4)} />
          <p style={{ fontSize: 13, color: "var(--mr-fg-muted)", marginTop: 8 }}>
            Current: {density}-column grid.
          </p>
        </Subsection>

        <Subsection title="ViewportToggle" code="import { ViewportToggle } from '@mr/tools-ui'">
          <ViewportToggle value={viewport} onChange={setViewport} />
          <p style={{ fontSize: 13, color: "var(--mr-fg-muted)", marginTop: 8 }}>
            Current: {viewport}.
          </p>
        </Subsection>

        <Subsection title="TopBar / SectionCard / FilterPill / ProfileMenu / NotificationsMenu" code="See /sections — the gallery composes all of these.">
          <p style={{ fontSize: 13, color: "var(--mr-fg-muted)" }}>
            The gallery surface at <a href="/" style={{ color: "var(--mr-fg)" }}>/</a> demonstrates these composites end-to-end.
          </p>
        </Subsection>
      </Section>

      <footer className="dsx-footer">
        <span>@mr/tools-ui</span>
        <span>23 components live</span>
        <span>vendored at <code>lib/tools-ui/</code></span>
      </footer>
    </div>
  );
}

/* ───────── Helpers ───────── */

function Section({ id, title, lede, children }: { id: string; title: string; lede: string; children: ReactNode }) {
  return (
    <section id={id} className="dsx-section">
      <header className="dsx-section__head">
        <h2 className="dsx-h2">{title}</h2>
        <p className="dsx-lede">{lede}</p>
      </header>
      {children}
    </section>
  );
}

function Subsection({ title, code, children }: { title: string; code: string; children: ReactNode }) {
  return (
    <div className="dsx-sub">
      <div className="dsx-sub__head">
        <h3 className="dsx-h3">{title}</h3>
        <code className="dsx-sub__code">{code}</code>
      </div>
      <div className="dsx-sub__body">{children}</div>
    </div>
  );
}

function Swatch({ label, cssVar }: { label: string; cssVar: string }) {
  return (
    <div className="dsx-swatch">
      <div className="dsx-swatch__chip" style={{ background: `var(${cssVar})` }} />
      <span className="dsx-swatch__label">{label}</span>
      <code className="dsx-swatch__var">{cssVar}</code>
    </div>
  );
}

function TypeSample({ role, sample }: { role: string; sample: string }) {
  return (
    <div className="dsx-type">
      <div
        className="dsx-type__sample"
        style={{
          fontFamily: role.startsWith("display") || role.startsWith("heading")
            ? "var(--mr-font-display)"
            : role.startsWith("mono")
              ? "var(--mr-font-mono)"
              : "var(--mr-font-body)",
          fontSize: `var(--mr-text-${role}-size)`,
          lineHeight: `var(--mr-text-${role}-leading)`,
          letterSpacing: `var(--mr-text-${role}-tracking)`,
          fontWeight: `var(--mr-text-${role}-weight)` as React.CSSProperties["fontWeight"],
          textTransform: role.startsWith("label") || role.startsWith("button") || role === "mono-label" ? "uppercase" : undefined,
          color: "var(--mr-fg)",
        }}
      >
        {sample}
      </div>
      <code className="dsx-type__label">--mr-text-{role}</code>
    </div>
  );
}
