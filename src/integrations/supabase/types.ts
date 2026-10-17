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
      app_users: {
        Row: {
          created_at: string
          email: string
          name: string
          telegram_id: string
          uid: string
        }
        Insert: {
          created_at?: string
          email?: string
          name?: string
          telegram_id?: string
          uid: string
        }
        Update: {
          created_at?: string
          email?: string
          name?: string
          telegram_id?: string
          uid?: string
        }
        Relationships: []
      }
      build_requests: {
        Row: {
          apk_path: string | null
          apk_url: string | null
          app_id: string | null
          app_name: string
          build_log: string
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
        }
        Insert: {
          apk_path?: string | null
          apk_url?: string | null
          app_id?: string | null
          app_name: string
          build_log?: string
          created_at?: string
          encrypt_log?: string
          encrypt_status?: string | null
          encrypted_apk_path?: string | null
          id?: string
          logo_path?: string | null
          notes?: string
          package_name: string
          register_link?: string
          requester_email: string
          requester_name: string
          status?: string
          template_id?: string | null
          template_name?: string
          updated_at?: string
        }
        Update: {
          apk_path?: string | null
          apk_url?: string | null
          app_id?: string | null
          app_name?: string
          build_log?: string
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
          uid: string
          updated_at: string
          user_email: string
          utr: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          status?: string
          uid: string
          updated_at?: string
          user_email?: string
          utr?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          status?: string
          uid?: string
          updated_at?: string
          user_email?: string
          utr?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          build_price: number
          id: number
          min_deposit: number
          updated_at: string
          upi_id: string
        }
        Insert: {
          build_price?: number
          id?: number
          min_deposit?: number
          updated_at?: string
          upi_id?: string
        }
        Update: {
          build_price?: number
          id?: number
          min_deposit?: number
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
          video_url?: string | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          email: string
          uid: string
          updated_at: string
        }
        Insert: {
          balance?: number
          email?: string
          uid: string
          updated_at?: string
        }
        Update: {
          balance?: number
          email?: string
          uid?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
