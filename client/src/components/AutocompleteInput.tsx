import { useState, useRef, useEffect, useCallback } from "react";

function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

interface Props {
  pool: string[];
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  onSelect?: (item: string) => void;
  disabled?: boolean;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export default function AutocompleteInput({
  pool,
  value,
  onChange,
  onSubmit,
  onSelect,
  disabled,
  placeholder,
  inputRef: externalRef,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = externalRef ?? internalRef;
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedValue = normalizeForSearch(value);

  const filtered =
    value.trim().length >= 1
      ? pool
          .filter((item) => normalizeForSearch(item).includes(normalizedValue))
          .slice(0, 6)
      : [];

  const showDropdown = open && filtered.length > 0 && !disabled;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIndex] as
        | HTMLElement
        | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(-1);
  }, [normalizedValue]);

  const select = useCallback(
    (item: string) => {
      onChange(item);
      setOpen(false);
      setHighlightIndex(-1);
      if (onSelect) {
        onSelect(item);
      }
    },
    [onChange, onSelect],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showDropdown) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((prev) => (prev + 1) % filtered.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev <= 0 ? filtered.length - 1 : prev - 1,
        );
        return;
      }
      if (e.key === "Enter" && highlightIndex >= 0) {
        e.preventDefault();
        select(filtered[highlightIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setHighlightIndex(-1);
        return;
      }
      if (e.key === "Tab" && highlightIndex >= 0) {
        e.preventDefault();
        select(filtered[highlightIndex]);
        return;
      }
    }
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none font-display font-semibold text-lg"
        maxLength={200}
        autoComplete="off"
      />
      {showDropdown && (
        <ul
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 bg-white border-2 border-purple-200 rounded-xl shadow-lg max-h-52 overflow-y-auto"
        >
          {filtered.map((item, i) => {
            const isHighlighted = i === highlightIndex;
            return (
              <li
                key={item}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(item);
                }}
                onMouseEnter={() => setHighlightIndex(i)}
                className={`px-4 py-2 cursor-pointer font-display text-sm transition-colors
                  ${isHighlighted ? "bg-purple-100 text-purple-800" : "text-gray-700 hover:bg-purple-50"}
                  ${i === 0 ? "rounded-t-lg" : ""}
                  ${i === filtered.length - 1 ? "rounded-b-lg" : ""}
                `}
              >
                {item}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
