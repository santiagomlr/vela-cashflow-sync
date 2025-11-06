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
      allowlist: {
        Row: {
          added_at: string | null
          email: string
        }
        Insert: {
          added_at?: string | null
          email: string
        }
        Update: {
          added_at?: string | null
          email?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          created_at: string | null
          id: string
          institution: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution?: string
          name?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          created_at: string | null
          credit: number | null
          date: string
          debit: number | null
          gl_account: string
          id: string
          transaction_id: string | null
        }
        Insert: {
          created_at?: string | null
          credit?: number | null
          date: string
          debit?: number | null
          gl_account: string
          id?: string
          transaction_id?: string | null
        }
        Update: {
          created_at?: string | null
          credit?: number | null
          date?: string
          debit?: number | null
          gl_account?: string
          id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          bank_account_id: string | null
          category: string | null
          concept: string
          created_at: string | null
          created_by: string | null
          date: string
          deleted_at: string | null
          id: string
          method: string
          notes: string | null
          policy_pdf_url: string | null
          receipt_type: string | null
          receipt_url: string | null
          reconciled: boolean | null
          signature_url: string | null
          status: string | null
          subtotal: number | null
          total: number | null
          type: string
          updated_at: string | null
          uuid_cfdi: string | null
          vat_amount: number | null
          vat_creditable: boolean | null
          vat_included: boolean | null
          vat_rate: number | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          category?: string | null
          concept: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          id?: string
          method: string
          notes?: string | null
          policy_pdf_url?: string | null
          receipt_type?: string | null
          receipt_url?: string | null
          reconciled?: boolean | null
          signature_url?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          type: string
          updated_at?: string | null
          uuid_cfdi?: string | null
          vat_amount?: number | null
          vat_creditable?: boolean | null
          vat_included?: boolean | null
          vat_rate?: number | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          category?: string | null
          concept?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          deleted_at?: string | null
          id?: string
          method?: string
          notes?: string | null
          policy_pdf_url?: string | null
          receipt_type?: string | null
          receipt_url?: string | null
          reconciled?: boolean | null
          signature_url?: string | null
          status?: string | null
          subtotal?: number | null
          total?: number | null
          type?: string
          updated_at?: string | null
          uuid_cfdi?: string | null
          vat_amount?: number | null
          vat_creditable?: boolean | null
          vat_included?: boolean | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_vat_breakdown: {
        Args: { p_amount: number; p_vat_included: boolean; p_vat_rate: number }
        Returns: {
          subtotal: number
          total: number
          vat_amount: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
