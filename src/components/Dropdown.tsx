import { useEffect, useId, useRef, useState } from 'react';

export type DropdownOption<V extends string = string> = {
  value: V;
  label: string;
  description?: string;
  disabled?: boolean;
};

type Props<V extends string> = {
  value: V;
  options: DropdownOption<V>[];
  onChange: (value: V) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
};

export function Dropdown<V extends string>({
  value,
  options,
  onChange,
  placeholder,
  ariaLabel,
  className,
  disabled,
  id,
}: Props<V>) {
  const autoId = useId();
  const triggerId = id || autoId;
  const listId = `${triggerId}-listbox`;
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === value)
    )
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.value === value) || null;

  useEffect(() => {
    const idx = options.findIndex((o) => o.value === value);
    if (idx >= 0) setFocusedIndex(idx);
  }, [value, options]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const move = (dir: 1 | -1) => {
    let next = focusedIndex + dir;
    // skip disabled
    for (let i = 0; i < options.length; i++) {
      if (next < 0) next = options.length - 1;
      if (next >= options.length) next = 0;
      if (!options[next]?.disabled) break;
      next += dir;
    }
    setFocusedIndex(next);
    document.getElementById(`${listId}-opt-${next}`)?.scrollIntoView({ block: 'nearest' });
  };

  const commit = (val: V) => {
    if (disabled) return;
    onChange(val);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={rootRef}
      className={`dropdown ${open ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${className || ''}`}
    >
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        className="dropdown-trigger"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) setOpen(true);
            else move(e.key === 'ArrowDown' ? 1 : -1);
          } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!open) setOpen(true);
            else {
              const opt = options[focusedIndex];
              if (opt && !opt.disabled) commit(opt.value);
            }
          } else if (e.key === 'Home') {
            e.preventDefault();
            setFocusedIndex(0);
          } else if (e.key === 'End') {
            e.preventDefault();
            setFocusedIndex(options.length - 1);
          }
        }}
      >
        <span className="dropdown-value">
          {selected ? (
            selected.label
          ) : (
            <span className="dropdown-placeholder">{placeholder || 'Sélectionner…'}</span>
          )}
        </span>
        <span className="dropdown-chevron" aria-hidden>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={triggerId}
          className="dropdown-menu"
          tabIndex={-1}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isFocused = idx === focusedIndex;
            return (
              <li
                key={opt.value}
                id={`${listId}-opt-${idx}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled || undefined}
                data-focused={isFocused || undefined}
                data-selected={isSelected || undefined}
                className={`dropdown-item ${isSelected ? 'is-selected' : ''} ${isFocused ? 'is-focused' : ''} ${opt.disabled ? 'is-disabled' : ''}`}
                onMouseEnter={() => setFocusedIndex(idx)}
                onClick={() => !opt.disabled && commit(opt.value)}
              >
                <span className="dropdown-item-label">{opt.label}</span>
                {opt.description && <span className="dropdown-item-desc">{opt.description}</span>}
                {isSelected && (
                  <span className="dropdown-check" aria-hidden>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
