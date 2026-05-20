/*
 * @mr/tools-ui — public API barrel.
 *
 * Primitives ship at the root. Marketplace-domain composites + section-library
 * helpers ship from /components and /section-library subpaths as they land.
 */

export { Button, buttonVariants, type ButtonProps } from "./primitives/button";
export { Input, inputVariants, type InputProps } from "./primitives/input";
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

export { cn } from "./lib/cn";
export { cva, type VariantProps } from "./lib/cva";
