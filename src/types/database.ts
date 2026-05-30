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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          label: string | null
          last_used_at: string | null
          rate_limit_rpm: number
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          label?: string | null
          last_used_at?: string | null
          rate_limit_rpm?: number
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          label?: string | null
          last_used_at?: string | null
          rate_limit_rpm?: number
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          first_seen: string | null
          id: string
          last_seen: string | null
          name: string
          report_count: number
          type: string
        }
        Insert: {
          created_at?: string
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          name: string
          report_count?: number
          type: string
        }
        Update: {
          created_at?: string
          first_seen?: string | null
          id?: string
          last_seen?: string | null
          name?: string
          report_count?: number
          type?: string
        }
        Relationships: []
      }
      indicators: {
        Row: {
          extracted_at: string
          id: string
          is_verified: boolean
          report_id: string
          type: string
          value: string
        }
        Insert: {
          extracted_at?: string
          id?: string
          is_verified?: boolean
          report_id: string
          type: string
          value: string
        }
        Update: {
          extracted_at?: string
          id?: string
          is_verified?: boolean
          report_id?: string
          type?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicators_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      points_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          reason: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          reason: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          ref_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          ai_category: string | null
          ai_confidence: number | null
          ai_tags: string[] | null
          campaign_id: string | null
          confirm_count: number
          content_hash: string | null
          country_code: string | null
          dispute_count: number
          file_path: string | null
          file_type: string | null
          id: string
          is_novel: boolean
          moderated_at: string | null
          moderated_by: string | null
          published_at: string | null
          raw_content: string | null
          severity: number
          status: string
          submitted_at: string
          submitted_by: string | null
          summary: string | null
          type: string
          view_count: number
        }
        Insert: {
          ai_category?: string | null
          ai_confidence?: number | null
          ai_tags?: string[] | null
          campaign_id?: string | null
          confirm_count?: number
          content_hash?: string | null
          country_code?: string | null
          dispute_count?: number
          file_path?: string | null
          file_type?: string | null
          id?: string
          is_novel?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          published_at?: string | null
          raw_content?: string | null
          severity?: number
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          summary?: string | null
          type: string
          view_count?: number
        }
        Update: {
          ai_category?: string | null
          ai_confidence?: number | null
          ai_tags?: string[] | null
          campaign_id?: string | null
          confirm_count?: number
          content_hash?: string | null
          country_code?: string | null
          dispute_count?: number
          file_path?: string | null
          file_type?: string | null
          id?: string
          is_novel?: boolean
          moderated_at?: string | null
          moderated_by?: string | null
          published_at?: string | null
          raw_content?: string | null
          severity?: number
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          summary?: string | null
          type?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "reports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      researcher_applications: {
        Row: {
          created_at: string
          full_name: string
          id: string
          organisation: string
          portfolio_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          role: string
          status: string
          use_case: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          organisation: string
          portfolio_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role: string
          status?: string
          use_case: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          organisation?: string
          portfolio_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: string
          status?: string
          use_case?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "researcher_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "researcher_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          bonus_reason: string | null
          id: string
          points_awarded: number
          report_id: string
          submitted_at: string
          user_id: string
        }
        Insert: {
          bonus_reason?: string | null
          id?: string
          points_awarded?: number
          report_id: string
          submitted_at?: string
          user_id: string
        }
        Update: {
          bonus_reason?: string | null
          id?: string
          points_awarded?: number
          report_id?: string
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          badge: string
          bio: string | null
          country_code: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_moderator: boolean
          is_researcher: boolean
          points: number
          username: string
        }
        Insert: {
          badge?: string
          bio?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_moderator?: boolean
          is_researcher?: boolean
          points?: number
          username: string
        }
        Update: {
          badge?: string
          bio?: string | null
          country_code?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_moderator?: boolean
          is_researcher?: boolean
          points?: number
          username?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          id: string
          report_id: string
          user_id: string
          vote: string
          voted_at: string
        }
        Insert: {
          id?: string
          report_id: string
          user_id: string
          vote: string
          voted_at?: string
        }
        Update: {
          id?: string
          report_id?: string
          user_id?: string
          vote?: string
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_researcher_application: {
        Args: { p_application_id: string }
        Returns: string
      }
      get_monthly_leaderboard: {
        Args: never
        Returns: {
          badge: string
          country_code: string
          display_name: string
          id: string
          monthly_points: number
          username: string
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
