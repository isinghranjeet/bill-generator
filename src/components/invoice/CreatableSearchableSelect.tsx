import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type CreatableSearchableSelectOption = string;

interface CreatableSearchableSelectProps {
  label?: string;
  value: string;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (next: string) => void;
}

/**
 * Lightweight “creatable + searchable” control.
 * - Filters options as the user types.
 * - Selecting an existing option sets it.
 * - Typing a custom value and clicking “Use …” creates it.
 *
 * This avoids introducing new external deps.
 */
export const CreatableSearchableSelect = ({
  label,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: CreatableSearchableSelectProps) => {
  const [query, setQuery] = useState(value ?? "");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setQuery(value ?? "");
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const exists = useMemo(() => {
    const q = query.trim();
    return options.some((o) => o === q);
  }, [options, query]);

  const useCustom = () => {
    const next = query.trim();
    if (!next) return;
    onChange(next);
    setIsOpen(false);
  };

  return (
    <div className="space-y-1">
      {label ? (
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
      ) : null}

      <div className="relative">
        <Input
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          className="invoice-cell-input"
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay close to allow click selection
            setTimeout(() => setIsOpen(false), 120);
          }}
        />

        {isOpen && !disabled ? (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-sm">
            <div className="max-h-56 overflow-auto">
              {filtered.length ? (
                filtered.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(opt);
                      setQuery(opt);
                      setIsOpen(false);
                    }}
                  >
                    {opt}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No matches
                </div>
              )}
            </div>

            {!exists && query.trim() ? (
              <div className="border-t p-2">
                <Button type="button" variant="outline" className="w-full" onMouseDown={(e)=>e.preventDefault()} onClick={useCustom}>
                  Use “{query.trim()}”
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

