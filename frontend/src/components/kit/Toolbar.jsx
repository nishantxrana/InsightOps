import { useMemo } from "react";
import { Check, ChevronsUpDown, Rows, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDensity } from "@/hooks/useDensity";

/**
 * @param {{ children: React.ReactNode, className?: string }} props
 */
export function Toolbar({ children, className }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * @param {{
 *   value: string,
 *   onChange: (v: string) => void,
 *   placeholder?: string,
 *   className?: string,
 * }} props
 */
export function SearchField({ value, onChange, placeholder = "Search…", className }) {
  return (
    <div className={cn("relative min-w-[12rem] flex-1 sm:max-w-xs", className)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
        aria-label={placeholder}
      />
    </div>
  );
}

/**
 * @param {{
 *   label: string,
 *   options: Array<{ value: string, label: string, count?: number }>,
 *   value: string | string[],
 *   onChange: (v: string | string[]) => void,
 *   multiple?: boolean,
 *   className?: string,
 * }} props
 */
export function FacetFilter({ label, options = [], value, onChange, multiple = false, className }) {
  const selected = useMemo(() => {
    if (multiple) return Array.isArray(value) ? value : value ? [value] : [];
    return value ? [value] : [];
  }, [value, multiple]);

  const activeCount = selected.length;

  const toggle = (optValue) => {
    if (multiple) {
      const next = selected.includes(optValue)
        ? selected.filter((v) => v !== optValue)
        : [...selected, optValue];
      onChange(next);
    } else {
      onChange(selected[0] === optValue ? "" : optValue);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("gap-1.5", className)}
          aria-label={`${label} filter`}
        >
          {label}
          {activeCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-control bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {activeCount}
            </span>
          ) : (
            <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden="true" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <ul className="max-h-64 overflow-auto" role="listbox" aria-multiselectable={multiple}>
          {options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={checked}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    checked && "bg-accent"
                  )}
                  onClick={() => toggle(opt.value)}
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-sm border border-border",
                      checked && "border-primary bg-primary text-primary-foreground"
                    )}
                    aria-hidden="true"
                  >
                    {checked ? <Check className="size-3" /> : null}
                  </span>
                  <span className="flex-1 truncate">{opt.label}</span>
                  {typeof opt.count === "number" ? (
                    <span className="tabular-nums text-xs text-muted-foreground">{opt.count}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/**
 * @param {{
 *   options: Array<{ value: string, label: string, count?: number }>,
 *   value: string,
 *   onChange: (v: string) => void,
 *   className?: string,
 * }} props
 */
export function SegmentedFilter({ options = [], value, onChange, className }) {
  return (
    <div
      className={cn(
        "inline-flex h-9 items-center rounded-control border border-border bg-muted p-0.5",
        className
      )}
      role="tablist"
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-[calc(var(--radius-control)-2px)] px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
            {typeof opt.count === "number" ? (
              <span className="tabular-nums text-muted-foreground">{opt.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * @param {{
 *   value: string,
 *   onChange: (v: string) => void,
 *   options?: Array<{ value: string, label: string }>,
 *   className?: string,
 * }} props
 */
export function SortSelect({
  value,
  onChange,
  options = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
  ],
  className,
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className={cn("w-[140px]", className)} aria-label="Sort">
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Toggle compact / default / comfortable density. */
export function DensityToggle({ className }) {
  const { density, cycle } = useDensity();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={cycle}
      aria-label={`Density: ${density}. Click to change.`}
      title={`Density: ${density}`}
    >
      <Rows className="size-3.5" aria-hidden="true" />
      <span className="capitalize">{density}</span>
    </Button>
  );
}

/**
 * @param {{ shown: number, total: number, noun?: string, className?: string }} props
 */
export function ResultCount({ shown, total, noun = "results", className }) {
  return (
    <p className={cn("text-xs text-muted-foreground tabular-nums", className)}>
      {shown} of {total} {noun}
    </p>
  );
}

/**
 * @param {{
 *   chips: Array<{ id: string, label: string }>,
 *   onClear: (id?: string) => void,
 *   className?: string,
 * }} props
 */
export function ActiveFilters({ chips = [], onClear, className }) {
  if (!chips.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className="inline-flex h-6 items-center gap-1 rounded-control border border-border bg-muted px-2 text-xs text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onClick={() => onClear(chip.id)}
          aria-label={`Remove filter ${chip.label}`}
        >
          {chip.label}
          <X className="size-3" aria-hidden="true" />
        </button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={() => onClear()}
      >
        Clear all
      </Button>
    </div>
  );
}
