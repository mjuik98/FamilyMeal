"use client";

import type { ReactNode } from "react";

import SurfaceSection from "@/components/SurfaceSection";
import { USER_ROLES, VALID_MEAL_TYPES } from "@/lib/domain/meal-policy";
import type { Meal, UserRole } from "@/lib/types";

type MealDetailsSectionProps = {
  dateTimeFields?: ReactNode;
  description: string;
  descriptionNote?: ReactNode;
  descriptionPlaceholder: string;
  descriptionRequired?: boolean;
  disabled?: boolean;
  onDescriptionChange: (value: string) => void;
  onToggleUser: (role: UserRole) => void;
  onTypeChange: (type: Meal["type"]) => void;
  selectedUsers: UserRole[];
  testIdPrefix?: string;
  type: Meal["type"];
};

export function MealDetailsSection({
  dateTimeFields,
  description,
  descriptionNote,
  descriptionPlaceholder,
  descriptionRequired = false,
  disabled = false,
  onDescriptionChange,
  onToggleUser,
  onTypeChange,
  selectedUsers,
  testIdPrefix,
  type,
}: MealDetailsSectionProps) {
  return (
    <SurfaceSection title="식사 정보" bodyClassName="surface-body form-stack">
      <div>
        <label className="form-label">식사 종류</label>
        <div className="chip-group">
          {VALID_MEAL_TYPES.map((value) => (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => onTypeChange(value)}
              className={`chip-button${type === value ? " chip-button-active" : ""}`}
              data-testid={testIdPrefix ? `${testIdPrefix}-meal-type-${value}` : undefined}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="form-label">함께 먹은 사람</label>
        <div className="chip-group">
          {USER_ROLES.map((role) => (
            <button
              key={role}
              type="button"
              disabled={disabled}
              onClick={() => onToggleUser(role)}
              className={`chip-button${selectedUsers.includes(role) ? " chip-button-active" : ""}`}
              data-testid={testIdPrefix ? `${testIdPrefix}-meal-user-${role}` : undefined}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {dateTimeFields}

      <div>
        <label className="form-label">설명</label>
        <textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder={descriptionPlaceholder}
          required={descriptionRequired}
          disabled={disabled}
          maxLength={300}
          className="input-base textarea-base"
          style={{
            width: "100%",
            minHeight: "116px",
            padding: "14px 14px 16px",
            resize: "vertical",
            outline: "none",
          }}
        />
        {descriptionNote ? (
          <p className="surface-note" style={{ marginTop: "8px" }}>
            {descriptionNote}
          </p>
        ) : null}
      </div>
    </SurfaceSection>
  );
}
