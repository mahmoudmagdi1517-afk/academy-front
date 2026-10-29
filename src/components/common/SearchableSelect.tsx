import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

interface SearchableSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  "aria-label"?: string;
}

interface SelectOption {
  value: string;
  label: string;
  content: React.ReactNode;
  disabled: boolean;
}

interface MenuPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

const getTextContent = (node: React.ReactNode): string => {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(getTextContent).join("");
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return getTextContent(node.props.children);
  }
  return "";
};

const getOptions = (children: React.ReactNode): SelectOption[] =>
  React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement<{
      value?: string | number;
      disabled?: boolean;
      children?: React.ReactNode;
    }>(child)) {
      return [];
    }

    const label = getTextContent(child.props.children).trim();
    return [{
      value: String(child.props.value ?? ""),
      label,
      content: child.props.children,
      disabled: Boolean(child.props.disabled),
    }];
  });

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  children,
  className = "",
  required = false,
  disabled = false,
  name,
  "aria-label": ariaLabel,
}) => {
  const { t } = useLanguage();
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const options = useMemo(() => getOptions(children), [children]);
  const selectedValue = String(value ?? "");
  const selectedOption = options.find((option) => option.value === selectedValue);
  const filteredOptions = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        120,
        Math.min(320, openAbove ? spaceAbove : spaceBelow),
      );

      setPosition({
        top: openAbove ? Math.max(8, rect.top - maxHeight - 4) : rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
        width: rect.width,
        maxHeight,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    searchRef.current?.focus();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectOption = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setQuery("");
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const options = menuRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="option"]:not(:disabled)',
    );
    if (options?.length) {
      options[event.key === "ArrowDown" ? 0 : options.length - 1].focus();
    }
  };

  const handleOptionKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    const optionButtons = menuRef.current?.querySelectorAll<HTMLButtonElement>(
      '[role="option"]:not(:disabled)',
    );
    if (!optionButtons?.length) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const index = Array.from(optionButtons).indexOf(event.currentTarget);
      const nextIndex =
        (index + (event.key === "ArrowDown" ? 1 : -1) + optionButtons.length) %
        optionButtons.length;
      optionButtons[nextIndex].focus();
    } else if (event.key === "Escape") {
      event.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      setIsOpen(false);
    }
  };

  const widthClasses =
    className.match(/\b(?:w-full|w-\d+\/\d+)\b/g)?.join(" ") ?? "";
  const triggerClasses = className.replace(/\b(?:w-full|w-\d+\/\d+)\b/g, "").trim();

  return (
    <div ref={rootRef} className={`relative min-w-0 ${widthClasses}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        aria-required={required || undefined}
        aria-controls={`searchable-select-${id}`}
        onClick={() => {
          setQuery("");
          setIsOpen((open) => !open);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setQuery("");
            setIsOpen(true);
          }
        }}
        className={`flex w-full items-center justify-between gap-2 text-left rtl:text-right cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${triggerClasses}`}
      >
        <span className="truncate">
          {selectedOption?.content || (
            <span className="text-slate-400">{t("common.selectOption")}</span>
          )}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {name && <input type="hidden" name={name} value={selectedValue} />}
      {required && (
        <input
          type="text"
          value={selectedValue}
          required
          tabIndex={-1}
          aria-hidden="true"
          onChange={() => {}}
          onInvalid={(event) => {
            event.preventDefault();
            setIsOpen(true);
            triggerRef.current?.focus();
          }}
          className="absolute h-px w-px overflow-hidden opacity-0"
          style={{ clipPath: "inset(50%)" }}
        />
      )}
      {isOpen &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[60] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
          >
            <div className="border-b border-slate-100 p-2">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 focus-within:border-indigo-500">
                <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={t("common.search")}
                  aria-label={t("common.search")}
                  aria-controls={`searchable-select-${id}`}
                  aria-expanded="true"
                  className="w-full bg-transparent py-2 text-xs text-slate-700 outline-hidden"
                />
              </div>
            </div>
            <div
              id={`searchable-select-${id}`}
              role="listbox"
              className="overflow-y-auto p-1"
              style={{ maxHeight: position.maxHeight - 58 }}
            >
              {filteredOptions.length ? (
                filteredOptions.map((option, index) => (
                  <button
                    key={`${option.value}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={option.value === selectedValue}
                    disabled={option.disabled}
                    onClick={() => selectOption(option)}
                    onKeyDown={handleOptionKeyDown}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left rtl:text-right text-xs transition hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 ${
                      option.value === selectedValue
                        ? "bg-indigo-50 font-semibold text-indigo-700"
                        : "text-slate-700"
                    }`}
                  >
                    <span className="min-w-0 truncate">{option.content}</span>
                    {option.value === selectedValue && (
                      <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
                    )}
                  </button>
                ))
              ) : (
                <p className="px-3 py-4 text-center text-xs text-slate-400">
                  {t("common.noOptions")}
                </p>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
