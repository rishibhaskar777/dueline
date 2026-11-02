import { Search } from "lucide-react";

interface ClientSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
}

export function ClientSearchBox({ value, onChange }: ClientSearchBoxProps) {
  return (
    <label className="flex h-11 w-full items-center gap-2 rounded-full border border-search-edge bg-search px-4 backdrop-blur-[16px] focus-within:border-field-focus focus-within:ring-4 focus-within:ring-focus-halo md:w-[330px]">
      <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <input
        type="search"
        aria-label="Search clients"
        autoComplete="off"
        placeholder="Client name or email"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
}
