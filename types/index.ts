import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "./database";

export type { Database, Tables } from "./database";

export type Db = SupabaseClient<Database>;

export type Profile = Tables<"profiles">;
export type Department = Tables<"departments">;
export type Employee = Tables<"employees">;
export type Project = Tables<"projects">;
export type Task = Tables<"tasks">;
export type TaskLog = Tables<"task_logs">;
export type LlmModel = Tables<"llm_models">;
export type LlmProvider = Tables<"llm_providers">;
export type BudgetSettings = Tables<"budget_settings">;
export type AuditLog = Tables<"audit_logs">;
export type Brief = Tables<"briefs">;
export type Workspace = Tables<"workspaces">;
