// Supabase MCP generate_typescript_types 로 생성. 직접 수정하지 말 것.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
          updated_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          updated_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      briefs: {
        Row: {
          brief: string
          cost_usd: number
          created_at: string
          created_by: string | null
          id: string
          model_id: string | null
          plan: Json
          project_id: string
          status: string
          token_input: number
          token_output: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          brief: string
          cost_usd?: number
          created_at?: string
          created_by?: string | null
          id?: string
          model_id?: string | null
          plan?: Json
          project_id: string
          status?: string
          token_input?: number
          token_output?: number
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          brief?: string
          cost_usd?: number
          created_at?: string
          created_by?: string | null
          id?: string
          model_id?: string | null
          plan?: Json
          project_id?: string
          status?: string
          token_input?: number
          token_output?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      budget_settings: {
        Row: {
          created_at: string
          default_model_complex_id: string | null
          default_model_simple_id: string | null
          global_paused: boolean
          id: string
          max_tasks_per_run: number
          monthly_budget_usd: number
          updated_at: string
          work_hours: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          default_model_complex_id?: string | null
          default_model_simple_id?: string | null
          global_paused?: boolean
          id?: string
          max_tasks_per_run?: number
          monthly_budget_usd?: number
          updated_at?: string
          work_hours?: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          default_model_complex_id?: string | null
          default_model_simple_id?: string | null
          global_paused?: boolean
          id?: string
          max_tasks_per_run?: number
          monthly_budget_usd?: number
          updated_at?: string
          work_hours?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_settings_default_model_complex_id_fkey"
            columns: ["default_model_complex_id"]
            isOneToOne: false
            referencedRelation: "llm_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_settings_default_model_simple_id_fkey"
            columns: ["default_model_simple_id"]
            isOneToOne: false
            referencedRelation: "llm_models"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          color: string
          created_at: string
          depth: number
          id: string
          name: string
          position_x: number
          position_z: number
          slug: string
          updated_at: string
          width: number
          workspace_id: string
        }
        Insert: {
          color: string
          created_at?: string
          depth?: number
          id?: string
          name: string
          position_x?: number
          position_z?: number
          slug: string
          updated_at?: string
          width?: number
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          depth?: number
          id?: string
          name?: string
          position_x?: number
          position_z?: number
          slug?: string
          updated_at?: string
          width?: number
          workspace_id?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          current_task_id: string | null
          daily_token_limit: number
          department_id: string
          energy: number
          id: string
          in_meeting: boolean
          model_id: string
          name: string
          role: string
          seat_x: number
          seat_z: number
          status: Database["public"]["Enums"]["employee_status"]
          system_prompt: string
          tokens_used_today: number
          updated_at: string
          workspace_id: string
          works_on_code: boolean
        }
        Insert: {
          created_at?: string
          current_task_id?: string | null
          daily_token_limit?: number
          department_id: string
          energy?: number
          id?: string
          in_meeting?: boolean
          model_id: string
          name: string
          role: string
          seat_x?: number
          seat_z?: number
          status?: Database["public"]["Enums"]["employee_status"]
          system_prompt: string
          tokens_used_today?: number
          updated_at?: string
          workspace_id?: string
          works_on_code?: boolean
        }
        Update: {
          created_at?: string
          current_task_id?: string | null
          daily_token_limit?: number
          department_id?: string
          energy?: number
          id?: string
          in_meeting?: boolean
          model_id?: string
          name?: string
          role?: string
          seat_x?: number
          seat_z?: number
          status?: Database["public"]["Enums"]["employee_status"]
          system_prompt?: string
          tokens_used_today?: number
          updated_at?: string
          workspace_id?: string
          works_on_code?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "employees_current_task_fk"
            columns: ["current_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "llm_models"
            referencedColumns: ["id"]
          },
        ]
      }
      llm_models: {
        Row: {
          created_at: string
          display_name: string
          id: string
          input_price_per_mtok: number
          is_enabled: boolean
          model_name: string
          output_price_per_mtok: number
          provider: Database["public"]["Enums"]["llm_provider"]
          tier: Database["public"]["Enums"]["model_tier"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          input_price_per_mtok: number
          is_enabled?: boolean
          model_name: string
          output_price_per_mtok: number
          provider: Database["public"]["Enums"]["llm_provider"]
          tier: Database["public"]["Enums"]["model_tier"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          input_price_per_mtok?: number
          is_enabled?: boolean
          model_name?: string
          output_price_per_mtok?: number
          provider?: Database["public"]["Enums"]["llm_provider"]
          tier?: Database["public"]["Enums"]["model_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      llm_providers: {
        Row: {
          created_at: string
          key_hint: string | null
          last_verified_at: string | null
          last_verified_ok: boolean | null
          provider: Database["public"]["Enums"]["llm_provider"]
          updated_at: string
          updated_by: string | null
          vault_secret_id: string | null
        }
        Insert: {
          created_at?: string
          key_hint?: string | null
          last_verified_at?: string | null
          last_verified_ok?: boolean | null
          provider: Database["public"]["Enums"]["llm_provider"]
          updated_at?: string
          updated_by?: string | null
          vault_secret_id?: string | null
        }
        Update: {
          created_at?: string
          key_hint?: string | null
          last_verified_at?: string | null
          last_verified_ok?: boolean | null
          provider?: Database["public"]["Enums"]["llm_provider"]
          updated_at?: string
          updated_by?: string | null
          vault_secret_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "llm_providers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          department_id: string
          description: string | null
          id: string
          name: string
          revenue: number
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          description?: string | null
          id?: string
          name: string
          revenue?: number
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          department_id?: string
          description?: string | null
          id?: string
          name?: string
          revenue?: number
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      task_logs: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          level: Database["public"]["Enums"]["log_level"]
          message: string
          task_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          level?: Database["public"]["Enums"]["log_level"]
          message: string
          task_id: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          level?: Database["public"]["Enums"]["log_level"]
          message?: string
          task_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_employee_id: string
          brief_id: string | null
          completed_at: string | null
          cost_usd: number
          created_at: string
          created_by: string | null
          error: string | null
          id: string
          instruction: string
          priority: number
          project_id: string
          result: string | null
          retry_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_type: Database["public"]["Enums"]["task_type"]
          title: string
          token_input: number
          token_output: number
          updated_at: string
          used_model_id: string | null
          workspace_id: string
          github_issue_number: number | null
          github_issue_url: string | null
          github_pr_url: string | null
        }
        Insert: {
          assigned_employee_id: string
          brief_id?: string | null
          completed_at?: string | null
          cost_usd?: number
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          instruction: string
          priority?: number
          project_id: string
          result?: string | null
          retry_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: Database["public"]["Enums"]["task_type"]
          title: string
          token_input?: number
          token_output?: number
          updated_at?: string
          used_model_id?: string | null
          workspace_id?: string
          github_issue_number?: number | null
          github_issue_url?: string | null
          github_pr_url?: string | null
        }
        Update: {
          assigned_employee_id?: string
          brief_id?: string | null
          completed_at?: string | null
          cost_usd?: number
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          instruction?: string
          priority?: number
          project_id?: string
          result?: string | null
          retry_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: Database["public"]["Enums"]["task_type"]
          title?: string
          token_input?: number
          token_output?: number
          updated_at?: string
          used_model_id?: string | null
          workspace_id?: string
          github_issue_number?: number | null
          github_issue_url?: string | null
          github_pr_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_used_model_id_fkey"
            columns: ["used_model_id"]
            isOneToOne: false
            referencedRelation: "llm_models"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          github_repo: string | null
          id: string
          name: string
          updated_at: string
          github_secret_id: string | null
          github_token_hint: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          github_repo?: string | null
          id?: string
          name: string
          updated_at?: string
          github_secret_id?: string | null
          github_token_hint?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          github_repo?: string | null
          id?: string
          name?: string
          updated_at?: string
          github_secret_id?: string | null
          github_token_hint?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_approved: { Args: never; Returns: boolean }
      seed_workspace: { Args: { p_workspace: string }; Returns: undefined }
    }
    Enums: {
      employee_status: "idle" | "working" | "resting" | "paused"
      llm_provider: "anthropic" | "openai" | "google"
      log_level: "info" | "warn" | "error"
      model_tier: "fast" | "balanced" | "premium"
      project_status: "planning" | "active" | "done"
      task_status: "queued" | "running" | "done" | "failed"
      task_type: "simple" | "complex"
      user_role: "admin" | "member"
      user_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      employee_status: ["idle", "working", "resting", "paused"],
      llm_provider: ["anthropic", "openai", "google"],
      log_level: ["info", "warn", "error"],
      model_tier: ["fast", "balanced", "premium"],
      project_status: ["planning", "active", "done"],
      task_status: ["queued", "running", "done", "failed"],
      task_type: ["simple", "complex"],
      user_role: ["admin", "member"],
      user_status: ["pending", "approved", "rejected"],
    },
  },
} as const
