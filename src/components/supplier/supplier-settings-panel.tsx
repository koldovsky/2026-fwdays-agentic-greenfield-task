"use client";

import { useState, useSyncExternalStore } from "react";
import { SupplierProfileDropdown } from "@/components/supplier/supplier-profile-dropdown";
import { SupplierProfileForm } from "@/components/supplier/supplier-profile-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SupplierProfileStorageError,
  getActiveProfileId,
  getServerActiveProfileId,
  getServerProfilesSnapshot,
  listProfiles,
  removeProfile,
  saveProfile,
  setActiveProfile,
  subscribeSupplierProfiles,
} from "@/lib/storage/supplier-profiles";
import type { SupplierProfileFormValues } from "@/components/supplier/supplier-profile-form";

type PanelMode = "create" | "edit";

export function SupplierSettingsPanel() {
  // Store-backed state: server snapshot renders the empty state, so
  // server HTML and the first client render agree (no hydration mismatch).
  const profiles = useSyncExternalStore(
    subscribeSupplierProfiles,
    listProfiles,
    getServerProfilesSnapshot
  );
  const activeId = useSyncExternalStore(
    subscribeSupplierProfiles,
    getActiveProfileId,
    getServerActiveProfileId
  );

  // Local UI state only; profile data always derives from the store.
  const [mode, setMode] = useState<PanelMode>("create");
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  const editingProfile =
    profiles.find((profile) => profile.id === editingProfileId) ?? null;
  const activeProfile =
    profiles.find((profile) => profile.id === activeId) ?? null;

  function handleStorageFailure(error: unknown) {
    if (error instanceof SupplierProfileStorageError) {
      setStorageError(error.message);
      return;
    }
    setStorageError("Не вдалося виконати дію. Спробуйте ще раз.");
  }

  function handleSelectProfile(profileId: string) {
    try {
      setActiveProfile(profileId);
      setEditingProfileId(profileId);
      setMode("edit");
      setStorageError(null);
    } catch (error) {
      handleStorageFailure(error);
    }
  }

  function handleCreateClick() {
    setMode("create");
    setEditingProfileId(null);
    setStorageError(null);
  }

  function handleSave(values: SupplierProfileFormValues) {
    try {
      // Saving never changes the active profile: activation is an explicit
      // user action, and storage auto-activates the first-ever profile.
      const saved = saveProfile(
        mode === "edit" && editingProfile
          ? { ...values, id: editingProfile.id }
          : values
      );
      setMode("edit");
      setEditingProfileId(saved.id);
      setStorageError(null);
    } catch (error) {
      handleStorageFailure(error);
    }
  }

  function handleDelete() {
    if (!editingProfile) {
      return;
    }

    try {
      removeProfile(editingProfile.id);
      setMode("create");
      setEditingProfileId(null);
      setStorageError(null);
    } catch (error) {
      handleStorageFailure(error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SupplierProfileDropdown
          profiles={profiles}
          activeId={activeId}
          onSelect={handleSelectProfile}
        />
        <Button className="h-9 shrink-0" onClick={handleCreateClick}>
          Додати профіль
        </Button>
      </div>

      {storageError ? (
        <p className="text-sm text-destructive" role="alert">
          {storageError}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "edit" && editingProfile
              ? `Редагування: ${editingProfile.label}`
              : "Новий профіль постачальника"}
          </CardTitle>
          <CardDescription>
            {activeProfile && mode === "edit"
              ? "Активний профіль використовуватиметься для нових рахунків."
              : "Усі поля обовʼязкові. Дані зберігаються лише в цьому браузері."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SupplierProfileForm
            key={editingProfile?.id ?? "create"}
            profile={mode === "edit" ? editingProfile : null}
            onSubmit={handleSave}
            onCancel={
              mode === "edit"
                ? () => {
                    setMode("create");
                    setEditingProfileId(null);
                  }
                : undefined
            }
          />

          {mode === "edit" && editingProfile ? (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button type="button" variant="outline" className="text-destructive">
                    Видалити профіль
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Видалити профіль?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Профіль «{editingProfile.label}» буде видалено з браузера.
                    Цю дію не можна скасувати.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Скасувати</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    Видалити
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
