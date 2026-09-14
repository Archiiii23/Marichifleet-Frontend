import React, { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, Navigation, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchMapboxPlaces, MapboxPlaceSuggestion } from "@/services/mapbox";
import { cn } from "@/lib/utils";

interface CityAutocompleteProps {
  value: string;
  onChange: (cityName: string, coords?: [number, number]) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  required?: boolean;
  onSelectCoords?: (coords: [number, number]) => void;
}

export const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Search city or hub...",
  className,
  autoFocus,
  required,
  onSelectCoords,
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<MapboxPlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep query in sync if external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Debounced Mapbox Suggestions
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchMapboxPlaces(query, "in", controller.signal);
        setSuggestions(results);
        setIsOpen(results.length > 0);
      } catch (e) {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (s: MapboxPlaceSuggestion) => {
    setQuery(s.text);
    onChange(s.text, s.center);
    onSelectCoords?.(s.center);
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    if (!isOpen && val.length >= 2) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          required={required}
          className={cn("pr-8", className)}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
          {loading ? (
            <Loader2 className="size-3.5 animate-spin text-primary" />
          ) : (
            <MapPin className="size-3.5 opacity-60" />
          )}
        </div>
      </div>

      {/* Mapbox Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border/80 bg-popover/95 p-1 text-popover-foreground shadow-lg backdrop-blur-md animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase border-b border-border/50 mb-1">
            <span className="flex items-center gap-1">
              <Navigation className="size-2.5 text-primary" />
              <span>Mapbox Places</span>
            </span>
            <span>India</span>
          </div>

          <ul className="max-h-56 overflow-y-auto space-y-0.5">
            {suggestions.map((s) => {
              const isSelected = s.text.toLowerCase() === query.toLowerCase();
              return (
                <li
                  key={s.id}
                  onClick={() => handleSelect(s)}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-sm cursor-pointer text-xs transition-colors",
                    isSelected
                      ? "bg-primary/15 text-primary font-medium"
                      : "hover:bg-muted/80 text-foreground"
                  )}
                >
                  <MapPin className="size-3 text-primary/70 shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium truncate">{s.text}</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {s.placeName}
                    </span>
                  </div>
                  {isSelected && <Check className="size-3 text-primary ml-auto shrink-0" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
