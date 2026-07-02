"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authenticate } from "./auth/core";
import { clearSession, createSession, requireAdmin, requireSession } from "./auth/session";
import { executeProduction } from "./manufacturing";
import { addSupplier, updateMaterialSettings } from "./master-data";
import { createOrder, receiveOrder } from "./procurement";
import { readDatabase, transaction } from "./repository";

const text = z.string().trim().min(1);
const positive = z.coerce.number().positive();
const go = (path: string, message: string, kind: "success" | "error" = "success"): never => redirect(`${path}?${kind}=${encodeURIComponent(message)}`);

export async function loginAction(form: FormData) {
  const parsed = z.object({ username: text, password: text }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return go("/login", "Введіть ім’я користувача та пароль.", "error");
  const user = authenticate((await readDatabase()).users, parsed.data.username, parsed.data.password);
  if (!user) return go("/login", "Неправильне ім’я користувача або пароль.", "error");
  await createSession({ userId: user.userId, username: user.username, fullName: user.fullName, role: user.role });
  redirect("/dashboard");
}
export async function logoutAction() { await clearSession(); redirect("/login"); }
export async function createSupplierAction(form: FormData) {
  try {
    await requireAdmin();
    const value = z.object({ companyName: text, contactName: text, email: z.email(), phone: text, leadTimeDays: z.coerce.number().int().nonnegative(), rating: z.coerce.number().min(0).max(5) }).parse(Object.fromEntries(form));
    await transaction((data) => addSupplier(data, { supplierId: `sup_${Date.now()}`, ...value }));
  } catch (error) { go("/inventory", error instanceof Error ? error.message : "Не вдалося створити постачальника.", "error"); }
  revalidatePath("/inventory"); go("/inventory", "Постачальника додано.");
}
export async function updateMaterialAction(form: FormData) {
  try {
    await requireAdmin();
    const value = z.object({ materialId: text, reorderLevel: z.coerce.number().nonnegative(), stockType: z.enum(["unrestricted", "quality_inspection", "blocked"]) }).parse(Object.fromEntries(form));
    await transaction((data) => updateMaterialSettings(data, value.materialId, value.reorderLevel, value.stockType));
  } catch (error) { go("/inventory", error instanceof Error ? error.message : "Не вдалося оновити матеріал.", "error"); }
  revalidatePath("/inventory"); go("/inventory", "Налаштування матеріалу оновлено.");
}
export async function createOrderAction(form: FormData) {
  const session = await requireSession();
  try { const value = z.object({ supplierId: text, materialId: text, quantity: positive, unitPrice: positive }).parse(Object.fromEntries(form)); await transaction((data) => createOrder(data, value.supplierId, value.materialId, value.quantity, value.unitPrice)); }
  catch (error) { go("/procurement", error instanceof Error ? error.message : "Не вдалося створити замовлення.", "error"); }
  revalidatePath("/procurement"); go("/procurement", `Замовлення створив користувач ${session.username}.`);
}
export async function receiveOrderAction(form: FormData) {
  const session = await requireSession();
  try { const value = z.object({ poId: text, quantity: positive }).parse(Object.fromEntries(form)); await transaction((data) => receiveOrder(data, value.poId, value.quantity, session.userId)); }
  catch (error) { go("/procurement", error instanceof Error ? error.message : "Не вдалося оприбуткувати надходження.", "error"); }
  revalidatePath("/procurement"); go("/procurement", "Надходження оприбутковано та передано на контроль якості.");
}
export async function productionAction(form: FormData) {
  const session = await requireSession();
  try { const value = z.object({ productId: text, quantity: positive }).parse(Object.fromEntries(form)); await transaction((data) => executeProduction(data, value.productId, value.quantity, session.userId)); }
  catch (error) { go("/manufacturing", error instanceof Error ? error.message : "Не вдалося завершити виробничий запуск.", "error"); }
  revalidatePath("/manufacturing"); go("/manufacturing", "Виробничий запуск завершено, рухи записано.");
}
