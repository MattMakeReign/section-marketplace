/*
 * @mr/tools-ui — public API barrel.
 *
 * Primitives ship at the root. Marketplace-domain composites + section-library
 * helpers ship from /components and /section-library subpaths as they land.
 */

// Primitives
export { Button, buttonVariants, type ButtonProps } from "./primitives/button";
export { Input, inputVariants, type InputProps } from "./primitives/input";
export { Textarea, type TextareaProps } from "./primitives/textarea";
export { Checkbox } from "./primitives/checkbox";
export { Progress, type ProgressProps } from "./primitives/progress";
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "./primitives/select";
export { Label, type LabelProps } from "./primitives/label";
export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "./primitives/field";
export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./primitives/dialog";
export {
  Popover,
  PopoverTrigger,
  PopoverAnchor,
  PopoverPortal,
  PopoverClose,
  PopoverContent,
} from "./primitives/popover";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "./primitives/dropdown-menu";
export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  type AvatarProps,
} from "./primitives/avatar";
export { Separator } from "./primitives/separator";
export { ToggleGroup, ToggleGroupItem } from "./primitives/toggle-group";
export { Card, cardVariants, type CardProps } from "./primitives/card";
export { Badge, badgeVariants, type BadgeProps } from "./primitives/badge";
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "./primitives/tabs";
export {
  Sheet,
  SheetTrigger,
  SheetPortal,
  SheetClose,
  SheetOverlay,
  SheetContent,
  SheetTitle,
  SheetDescription,
  type SheetContentProps,
} from "./primitives/sheet";

// Marketplace-domain composites
export { TopBar, type TopBarComponent } from "./components/top-bar";
export {
  NotificationsMenu,
  type NotificationsMenuItem,
} from "./components/notifications-menu";
export {
  ProfileMenu,
  type ProfileMenuTheme,
  type ProfileMenuActionItem,
} from "./components/profile-menu";
export {
  TrackBadge,
  LifecycleBadge,
  type TrackName,
  type LifecycleName,
} from "./components/badges";
export {
  SectionCard,
  type SectionCardSummary,
} from "./components/section-card";
export {
  FilterPill,
  type FilterOption,
} from "./components/filter-pill";
export { DensityToggle } from "./components/density-toggle";
export { SpecRow } from "./components/spec-row";
export {
  ViewportToggle,
  type ViewportName,
} from "./components/viewport-toggle";

// Helpers
export { cn } from "./lib/cn";
export { cva, type VariantProps } from "./lib/cva";
