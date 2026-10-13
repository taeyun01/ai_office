import type { Db } from "@/types";
import type { TablesInsert } from "@/types/database";

export async function listLlmModels(db: Db) {
  const { data, error } = await db
    .from("llm_models")
    .select("*")
    .order("provider")
    .order("tier");
  if (error) throw error;
  return data;
}

export async function getBudgetSettings(db: Db) {
  const { data, error } = await db.from("budget_settings").select("*").single();
  if (error) throw error;
  return data;
}

// admin 전용 (RLS: admin만 읽기). 키 값은 없고 등록 여부·힌트만 있다.
export async function listLlmProviders(db: Db) {
  const { data, error } = await db.from("llm_providers").select("*");
  if (error) throw error;
  return data;
}

export async function upsertLlmModel(db: Db, row: TablesInsert<"llm_models">) {
  const { data, error } = await db.from("llm_models").upsert(row).select().single();
  if (error) throw error;
  return data;
}
