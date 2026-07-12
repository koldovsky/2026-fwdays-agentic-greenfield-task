"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SupplierProfile } from "@/types/supplier";

type SupplierProfileDropdownProps = {
  profiles: SupplierProfile[];
  activeId: string | null;
  onSelect: (profileId: string) => void;
  disabled?: boolean;
};

export function SupplierProfileDropdown({
  profiles,
  activeId,
  onSelect,
  disabled = false,
}: SupplierProfileDropdownProps) {
  if (profiles.length === 0) {
    return (
      <p className="text-sm text-wf-text-2">
        Ще немає профілів. Створіть перший нижче.
      </p>
    );
  }

  return (
    <Select
      value={activeId ?? undefined}
      onValueChange={(value) => {
        if (value) {
          onSelect(value);
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger className="h-9 w-full max-w-md">
        <SelectValue placeholder="Оберіть профіль постачальника" />
      </SelectTrigger>
      <SelectContent>
        {profiles.map((profile) => (
          <SelectItem key={profile.id} value={profile.id}>
            {profile.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
