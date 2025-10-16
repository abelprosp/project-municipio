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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string | null
          link: string | null
          type: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message?: string | null
          link?: string | null
          type?: string
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string | null
          link?: string | null
          type?: string
          read_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      movements: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          project_id: string
          responsible: string | null
          stage: Database["public"]["Enums"]["project_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          description: string
          id?: string
          project_id: string
          responsible?: string | null
          stage: Database["public"]["Enums"]["project_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          project_id?: string
          responsible?: string | null
          stage?: Database["public"]["Enums"]["project_status"]
        }
        Relationships: [
          {
            foreignKeyName: "movements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      municipalities: {
        Row: {
          created_at: string
          email: string | null
          id: string
          manager: string | null
          name: string
          notes: string | null
          phone: string | null
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          manager?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          state: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          manager?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          name: string
          notes: string | null
          responsible_agency: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          name: string
          notes?: string | null
          responsible_agency?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          name?: string
          notes?: string | null
          responsible_agency?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          accountability_date: string | null
          amendment_type: Database["public"]["Enums"]["amendment_type"] | null
          counterpart_amount: number
          created_at: string
          end_date: string | null
          execution_percentage: number | null
          id: string
          ministry: string | null
          municipality_id: string
          notes: string | null
          object: string
          parliamentarian: string | null
          program_id: string | null
          proposal_number: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          transfer_amount: number
          updated_at: string
          year: number
        }
        Insert: {
          accountability_date?: string | null
          amendment_type?: Database["public"]["Enums"]["amendment_type"] | null
          counterpart_amount?: number
          created_at?: string
          end_date?: string | null
          execution_percentage?: number | null
          id?: string
          ministry?: string | null
          municipality_id: string
          notes?: string | null
          object: string
          parliamentarian?: string | null
          program_id?: string | null
          proposal_number?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          transfer_amount?: number
          updated_at?: string
          year: number
        }
        Update: {
          accountability_date?: string | null
          amendment_type?: Database["public"]["Enums"]["amendment_type"] | null
          counterpart_amount?: number
          created_at?: string
          end_date?: string | null
          execution_percentage?: number | null
          id?: string
          ministry?: string | null
          municipality_id?: string
          notes?: string | null
          object?: string
          parliamentarian?: string | null
          program_id?: string | null
          proposal_number?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          transfer_amount?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "projects_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      amendment_type: "extra" | "individual" | "rp2" | "outro"
      app_role: "admin" | "gestor_municipal" | "visualizador"
      project_status:
        | "em_criacao"
        | "enviado"
        | "em_analise"
        | "clausula_suspensiva"
        | "aprovado"
        | "em_execucao"
        | "prestacao_contas"
        | "concluido"
        | "cancelado"
      user_role: "administrador" | "gestor_municipal" | "visualizador"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      amendment_type: ["extra", "individual", "rp2", "outro"],
      app_role: ["admin", "gestor_municipal", "visualizador"],
      project_status: [
        "em_criacao",
        "enviado",
        "em_analise",
        "clausula_suspensiva",
        "aprovado",
        "em_execucao",
        "prestacao_contas",
        "concluido",
        "cancelado",
      ],
      user_role: ["administrador", "gestor_municipal", "visualizador"],
    },
  },
} as const
