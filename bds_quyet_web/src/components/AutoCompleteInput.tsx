import React, { useEffect, useMemo, useRef, useState } from 'react';

export type AutoCompleteOption = {
  label: string;
  value: string;
};

type Props = {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: AutoCompleteOption[];
  disabled?: boolean;
  className?: string;
};

export default function AutoCompleteInput({ placeholder, value, onChange, options, disabled, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase().trim();
    if (!q) return options.slice(0, 20);
    return options.filter(o => o.label.toLowerCase().includes(q)).slice(0, 20);
  }, [options, query]);

  const commit = (v: string) => {
    onChange(v);
    setQuery(v);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative' }}>
      <input
        className="input"
        placeholder={placeholder}
        value={query}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={e => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) setOpen(true);
          if (e.key === 'ArrowDown') setHighlight(h => Math.min(h + 1, filtered.length - 1));
          if (e.key === 'ArrowUp') setHighlight(h => Math.max(h - 1, 0));
          if (e.key === 'Enter') {
            if (highlight >= 0 && filtered[highlight]) commit(filtered[highlight].label);
            else commit(query);
          }
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, background: 'var(--bg, #fff)', border: '1px solid var(--border,#e5e7eb)', borderRadius: 6, maxHeight: 240, overflowY: 'auto' }}>
          {filtered.map((o, idx) => (
            <div
              key={o.value}
              onMouseDown={e => { e.preventDefault(); commit(o.label); }}
              onMouseEnter={() => setHighlight(idx)}
              style={{ padding: '6px 8px', cursor: 'pointer', background: highlight === idx ? 'var(--hover, #f3f4f6)' : 'transparent' }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
