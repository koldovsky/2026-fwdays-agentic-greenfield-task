"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authenticate } from "./auth/core";
import { clearSession, createSession, requireAdmin, requireSession } from "./auth/session";
import { executeProduction } from "./manufacturing";
import { createOrder, receiveOrder } from "./procurement";
import { readDatabase, transaction } from "./repository";

const text = z.string().trim().min(1);
const positive = z.coerce.number().positive();
const go = (path: string, message: string, kind: "success" | "error" = "success"): never => redirect(`${path}?${kind}=${encodeURIComponent(message)}`);

export async function loginAction(form: FormData) {
  const parsed = z.object({ username: text, password: text }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return go("/login", "Enter both username and password.", "error");
  const user = authenticate((await readDatabase()).users, parsed.data.username, parsed.data.password);
  if (!user) return go("/login", "Invalid username or password.", "error");
  await createSession({ userId: user.userId, username: user.username, fullName: user.fullName, role: user.role });
  redirect("/dashboard");
}
export async function logoutAction() { await clearSession(); redirect("/login"); }
export async function createSupplierAction(form: FormData) {
  try {
    await requireAdmin();
    const value = z.object({ companyName: text, contactName: text, email: z.email(), phone: text, leadTimeDays: z.coerce.number().int().nonnegative(), rating: z.coerce.number().min(0).max(5) }).parse(Object.fromEntries(form));
    await transaction((data) => { data.suppliers.push({ supplierId: `sup_${Date.now()}`, ...value }); return data; });
  } catch (error) { go("/inventory", error instanceof Error ? error.message : "Supplier could not be created.", "error"); }
  revalidatePath("/inventory"); go("/inventory", "Supplier added.");
}
export async function updateMaterialAction(form: FormData) {
  try {
    await requireAdmin();
    const value = z.object({ materialId: text, reorderLevel: z.coerce.number().nonnegative(), stockType: z.enum(["unrestricted", "quality_inspection", "blocked"]) }).parse(Object.fromEntries(form));
    await transaction((data) => { const item = data.rawMaterials.find((m) => m.materialId === value.materialId); if (!item) throw new Error("Material not found."); Object.assign(item, value); return data; });
  } catch (error) { go("/inventory", error instanceof Error ? error.message : "Material could not be updated.", "error"); }
  revalidatePath("/inventory"); go("/inventory", "Material settings updated.");
}
export async function createOrderAction(form: FormData) {
  const session = await requireSession();
  try { const value = z.object({ supplierId: text, materialId: text, quantity: positive, unitPrice: positive }).parse(Object.fromEntries(form)); await transaction((data) => createOrder(data, value.supplierId, value.materialId, value.quantity, value.unitPrice)); }
  catch (error) { go("/procurement", error instanceof Error ? error.message : "Order could not be created.", "error"); }
  revalidatePath("/procurement"); go("/procurement", `Purchase order created by ${session.username}.`);
}
export async function receiveOrderAction(form: FormData) {
  const session = await requireSession();
  try { const value = z.object({ poId: text, quantity: positive }).parse(Object.fromEntries(form)); await transaction((data) => receiveOrder(data, value.poId, value.quantity, session.userId)); }
  catch (error) { go("/procurement", error instanceof Error ? error.message : "Receipt could not be posted.", "error"); }
  revalidatePath("/procurement"); go("/procurement", "Receipt posted to quality inspection.");
}
export async function productionAction(form: FormData) {
  const session = await requireSession();
  try { const value = z.object({ productId: text, quantity: positive }).parse(Object.fromEntries(form)); await transaction((data) => executeProduction(data, value.productId, value.quantity, session.userId)); }
  catch (error) { go("/manufacturing", error instanceof Error ? error.message : "Production run could not be completed.", "error"); }
  revalidatePath("/manufacturing"); go("/manufacturing", "Production run completed and movements recorded.");
}
