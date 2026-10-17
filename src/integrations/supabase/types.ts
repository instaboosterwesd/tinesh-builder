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
      build_requests: {
        Row: {
          apk_path: string | null
          apk_url: string | null
          app_id: string | null
          app_name: string
          build_log: string
          charged: number
          created_at: string
          encrypt_log: string
          encrypt_status: string | null
          encrypted_apk_path: string | null
          id: string
          logo_path: string | null
          notes: string
          package_name: string
          register_link: string
          requester_email: string
          requester_name: string
          status: string
          template_id: string | null
          template_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          apk_path?: string | null
          apk_url?: string | null
          app_id?: string | null
          app_name: string
          build_log?: string
          charged?: number
          created_at?: string
          encrypt_log?: string
          encrypt_status?: string | null
          encrypted_apk_path?: string | null
          id?: string
          logo_path?: string | null
          notes?: string
          package_name: string
          register_link?: string
          requester_email?: string
          requester_name?: string
          status?: string
          template_id?: string | null
          template_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          apk_path?: string | null
          apk_url?: string | null
          app_id?: string | null
          app_name?: string
          build_log?: string
          charged?: number
          created_at?: string
          encrypt_log?: string
          encrypt_status?: string | null
          encrypted_apk_path?: string | null
          id?: string
          logo_path?: string | null
          notes?: string
          package_name?: string
          register_link?: string
          requester_email?: string
          requester_name?: string
          status?: string
          template_id?: string | null
          template_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "build_requests_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          status: string
          updated_at: string
          user_email: string
          user_id: string
          utr: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_email?: string
          user_id: string
          utr?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_email?: string
          user_id?: string
          utr?: string
        }
        Relationships: []
      }
      login_history: {
        Row: {
          created_at: string
          id: string
          user_agent: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_agent?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_agent?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string
          created_at: string
          email: string
          id: string
          name: string
          telegram_id: string
        }
        Insert: {
          avatar_url?: string
          created_at?: string
          email?: string
          id: string
          name?: string
          telegram_id?: string
        }
        Update: {
          avatar_url?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          telegram_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: number
          maintenance_message: string
          maintenance_mode: boolean
          min_deposit: number
          support_link: string
          updated_at: string
          upi_id: string
        }
        Insert: {
          id?: number
          maintenance_message?: string
          maintenance_mode?: boolean
          min_deposit?: number
          support_link?: string
          updated_at?: string
          upi_id?: string
        }
        Update: {
          id?: number
          maintenance_message?: string
          maintenance_mode?: boolean
          min_deposit?: number
          support_link?: string
          updated_at?: string
          upi_id?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          base_apk: string
          category: string
          created_at: string
          description: string
          html: string
          id: string
          image_url: string | null
          name: string
          price: number
          show_preview: boolean
          video_url: string | null
        }
        Insert: {
          base_apk?: string
          category?: string
          created_at?: string
          description?: string
          html?: string
          id?: string
          image_url?: string | null
          name: string
          price?: number
          show_preview?: boolean
          video_url?: string | null
        }
        Update: {
          base_apk?: string
          category?: string
          created_at?: string
          description?: string
          html?: string
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          show_preview?: boolean
          video_url?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          note: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind?: string
          note?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          note?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      wallet_change: {
        Args: { _amount: number; _kind: string; _note: string; _user: string }
        Returns: number
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
    Enums: {},
  },
} as const
