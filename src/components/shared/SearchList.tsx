"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { filterByQuery, type Searchable } from "@/lib/search";
import { cn } from "@/lib/utils";

export interface SearchOption extends Searchable {
  id: string;
  hint?: string;
}

interface SearchListProps {
  label: string;
  placeholder: string;
  options: SearchOption[];
  emptyText: string;
  onChoose: (id: string) => void;
}

// A search box over a list, used inside a dialog. The arrow keys move through the matches and Enter
// chooses one; the focus stays in the box, as in a combobox.
export function SearchList({ label, placeholder, options, emptyText, onChoose }: SearchListProps) {
  const base = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const found = filterByQuery(options, query);
  const current = Math.min(active, Math.max(found.length - 1, 0));

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((found.length + current + step) % Math.max(found.length, 1));
    } else if (event.key === "Enter" && found[current]) {
      event.preventDefault();
      onChoose(found[current].id);
    }
  }

  return (
    <div className="grid gap-2">
      <Input
        role="combobox"
        aria-label={label}
        aria-expanded
        aria-controls={`${base}-list`}
        aria-activedescendant={found[current] ? `${base}-${found[current].id}` : undefined}
        placeholder={placeholder}
        autoComplete="off"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      <ul
        id={`${base}-list`}
        role="listbox"
        aria-label={label}
        className="max-h-72 overflow-y-auto"
      >
        {found.map((option, index) => (
          <li
            key={option.id}
            id={`${base}-${option.id}`}
            role="option"
            aria-selected={index === current}
            onClick={() => onChoose(option.id)}
            onMouseMove={() => setActive(index)}
            className={cn(
              "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm",
              index === current && "bg-muted",
            )}
          >
            <span>{option.label}</span>
            {option.hint && (
              <span className="text-muted-foreground tabular-nums">{option.hint}</span>
            )}
          </li>
        ))}
      </ul>
      {found.length === 0 && <p className="px-1 text-sm text-muted-foreground">{emptyText}</p>}
    </div>
  );
}
