"use client";

import {
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import {
  ClientForm,
  clientToFormValues,
  emptyClientFormValues,
  type ClientFormValues,
} from "@/components/clients/client-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClientNotFoundError,
  ClientValidationError,
  deleteClient,
  getClientsServerSnapshot,
  listClients,
  saveClient,
  subscribeClients,
} from "@/lib/storage/clients";
import type { Client } from "@/types/client";

type DialogMode = "create" | "edit";

export function ClientsPageContent() {
  const clients = useSyncExternalStore(
    subscribeClients,
    listClients,
    getClientsServerSnapshot
  );
  const formId = useId();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [formValues, setFormValues] = useState<ClientFormValues>(
    emptyClientFormValues()
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return clients;
    }

    return clients.filter((client) => {
      const haystack = [
        client.name,
        client.email,
        client.company ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [clients, searchQuery]);

  function openCreateDialog() {
    setDialogMode("create");
    setFormValues(emptyClientFormValues());
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(client: Client) {
    setDialogMode("edit");
    setFormValues(clientToFormValues(client));
    setFormError(null);
    setDialogOpen(true);
  }

  function handleSaveClient() {
    try {
      saveClient(formValues);
      setDialogOpen(false);
      setFormError(null);
      setPageError(null);
    } catch (error) {
      if (error instanceof ClientValidationError) {
        setFormError(error.message);
        return;
      }

      if (error instanceof ClientNotFoundError) {
        setFormError(
          "Цього клієнта вже видалено. Закрийте вікно та оновіть список."
        );
        return;
      }

      setFormError("Не вдалося зберегти клієнта. Спробуйте ще раз.");
    }
  }

  function handleDeleteClient() {
    if (!clientToDelete) {
      return;
    }

    try {
      deleteClient(clientToDelete.id);
      setPageError(null);
    } catch {
      setPageError(
        "Не вдалося видалити клієнта. Перевірте налаштування браузера."
      );
    } finally {
      setClientToDelete(null);
    }
  }

  let directoryContent: ReactNode;
  if (clients.length === 0) {
    directoryContent = (
      <div className="rounded-xl border border-dashed border-wf-border bg-wf-surface-2 px-6 py-10 text-center">
        <p className="text-sm text-wf-text-2">
          Поки немає жодного клієнта. Додайте першого, щоб швидко
          підставляти дані в інвойс.
        </p>
        <Button className="mt-4" onClick={openCreateDialog}>
          <PlusIcon data-icon="inline-start" />
          Додати клієнта
        </Button>
      </div>
    );
  } else if (filteredClients.length === 0) {
    directoryContent = (
      <p className="text-sm text-wf-text-2">
        Нічого не знайдено за запитом «{searchQuery.trim()}».
      </p>
    );
  } else {
    directoryContent = (
      <div className="rounded-xl border border-wf-border bg-wf-surface">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Клієнт</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Компанія</TableHead>
              <TableHead className="w-[120px] text-right">Дії</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.email}</TableCell>
                <TableCell className="text-wf-text-2">
                  {client.company ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditDialog(client)}
                      aria-label={`Редагувати ${client.name}`}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setClientToDelete(client)}
                      aria-label={`Видалити ${client.name}`}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          className="h-9 sm:max-w-xs"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Пошук за ім'ям або email"
          aria-label="Пошук клієнтів"
        />
        <Button onClick={openCreateDialog}>
          <PlusIcon data-icon="inline-start" />
          Додати клієнта
        </Button>
      </div>

      {pageError ? (
        <p className="text-sm text-destructive" role="alert">
          {pageError}
        </p>
      ) : null}

      {directoryContent}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "create" ? "Новий клієнт" : "Редагувати клієнта"}
            </DialogTitle>
            <DialogDescription>
              Дані зберігаються лише в цьому браузері.
            </DialogDescription>
          </DialogHeader>

          <ClientForm
            values={formValues}
            onChange={setFormValues}
            onSubmit={handleSaveClient}
            formId={formId}
          />

          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Скасувати
            </Button>
            <Button type="submit" form={formId}>
              Зберегти
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={clientToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setClientToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити клієнта?</AlertDialogTitle>
            <AlertDialogDescription>
              {clientToDelete
                ? `Запис «${clientToDelete.name}» буде видалено з довідника в цьому браузері.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient}>
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
