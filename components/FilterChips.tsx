"use client";

export default function FilterChips<T extends string>({
  value,
  options,
  onChange,
  testIdPrefix,
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="chip-group">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`chip-button${value === option ? " chip-button-active" : ""}`}
          data-testid={`${testIdPrefix}-${option}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
