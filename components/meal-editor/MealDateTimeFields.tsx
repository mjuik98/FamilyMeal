"use client";

type MealDateTimeFieldsProps = {
  dateTestId?: string;
  dateValue: string;
  disabled?: boolean;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  timeTestId?: string;
  timeValue: string;
};

export function MealDateTimeFields({
  dateTestId,
  dateValue,
  disabled = false,
  onDateChange,
  onTimeChange,
  timeTestId,
  timeValue,
}: MealDateTimeFieldsProps) {
  return (
    <div>
      <label className="form-label">언제 먹었나요</label>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <input
          type="date"
          value={dateValue}
          onChange={(event) => onDateChange(event.target.value)}
          required
          disabled={disabled}
          className="input-base"
          data-testid={dateTestId}
          style={{
            flex: "1 1 220px",
            minHeight: "48px",
            borderRadius: "14px",
            padding: "0 14px",
            outline: "none",
          }}
        />
        <input
          type="time"
          value={timeValue}
          onChange={(event) => onTimeChange(event.target.value)}
          required
          disabled={disabled}
          className="input-base"
          data-testid={timeTestId}
          style={{
            flex: "1 1 160px",
            minHeight: "48px",
            borderRadius: "14px",
            padding: "0 14px",
            outline: "none",
          }}
        />
      </div>
    </div>
  );
}
