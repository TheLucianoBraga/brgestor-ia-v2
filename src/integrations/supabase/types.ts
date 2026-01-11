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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          resource: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      charge_schedules: {
        Row: {
          created_at: string | null
          customer_id: string
          customer_item_id: string | null
          days_offset: number
          error_message: string | null
          id: string
          scheduled_for: string
          sent_at: string | null
          status: string
          template_id: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          customer_item_id?: string | null
          days_offset: number
          error_message?: string | null
          id?: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          customer_item_id?: string | null
          days_offset?: number
          error_message?: string | null
          id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "charge_schedules_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charge_schedules_customer_item_id_fkey"
            columns: ["customer_item_id"]
            isOneToOne: false
            referencedRelation: "customer_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charge_schedules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charge_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charge_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      charges: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          description: string
          due_date: string
          id: string
          paid_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          description: string
          due_date: string
          id?: string
          paid_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          paid_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "charges_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_memory: {
        Row: {
          contact_name: string | null
          conversation_summary: string | null
          customer_id: string | null
          first_contact_at: string | null
          id: string
          interests: string[] | null
          is_customer: boolean | null
          is_owner: boolean | null
          is_reseller: boolean | null
          last_contact_at: string | null
          last_intent: string | null
          messages_count: number | null
          metadata: Json | null
          phone: string
          tenant_id: string
        }
        Insert: {
          contact_name?: string | null
          conversation_summary?: string | null
          customer_id?: string | null
          first_contact_at?: string | null
          id?: string
          interests?: string[] | null
          is_customer?: boolean | null
          is_owner?: boolean | null
          is_reseller?: boolean | null
          last_contact_at?: string | null
          last_intent?: string | null
          messages_count?: number | null
          metadata?: Json | null
          phone: string
          tenant_id: string
        }
        Update: {
          contact_name?: string | null
          conversation_summary?: string | null
          customer_id?: string | null
          first_contact_at?: string | null
          id?: string
          interests?: string[] | null
          is_customer?: boolean | null
          is_owner?: boolean | null
          is_reseller?: boolean | null
          last_contact_at?: string | null
          last_intent?: string | null
          messages_count?: number | null
          metadata?: Json | null
          phone?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_memory_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_memory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_memory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages_history: {
        Row: {
          content: string
          created_at: string | null
          id: string
          intent_detected: string | null
          memory_id: string
          role: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          intent_detected?: string | null
          memory_id: string
          role: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          intent_detected?: string | null
          memory_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_history_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "chat_memory"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_actions: {
        Row: {
          action_data: Json | null
          action_type: string
          created_at: string | null
          customer_id: string | null
          id: string
          result: string | null
          session_id: string
          tenant_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          result?: string | null
          session_id: string
          tenant_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string
          created_at?: string | null
          customer_id?: string | null
          id?: string
          result?: string | null
          session_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_actions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chatbot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_config: {
        Row: {
          ai_enabled: boolean | null
          ai_model: string | null
          ai_provider: string | null
          ai_temperature: number | null
          auto_responses: Json | null
          business_context: string | null
          business_hours: string | null
          business_hours_json: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          menu_options: Json
          offline_message: string | null
          system_prompt: string | null
          tenant_id: string
          transfer_after_messages: number | null
          transfer_whatsapp: string | null
          updated_at: string | null
          welcome_message: string
          whatsapp_number: string | null
        }
        Insert: {
          ai_enabled?: boolean | null
          ai_model?: string | null
          ai_provider?: string | null
          ai_temperature?: number | null
          auto_responses?: Json | null
          business_context?: string | null
          business_hours?: string | null
          business_hours_json?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          menu_options?: Json
          offline_message?: string | null
          system_prompt?: string | null
          tenant_id: string
          transfer_after_messages?: number | null
          transfer_whatsapp?: string | null
          updated_at?: string | null
          welcome_message?: string
          whatsapp_number?: string | null
        }
        Update: {
          ai_enabled?: boolean | null
          ai_model?: string | null
          ai_provider?: string | null
          ai_temperature?: number | null
          auto_responses?: Json | null
          business_context?: string | null
          business_hours?: string | null
          business_hours_json?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          menu_options?: Json
          offline_message?: string | null
          system_prompt?: string | null
          tenant_id?: string
          transfer_after_messages?: number | null
          transfer_whatsapp?: string | null
          updated_at?: string | null
          welcome_message?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_feedback: {
        Row: {
          created_at: string | null
          feedback_text: string | null
          id: string
          message_id: string | null
          rating: boolean
          session_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          message_id?: string | null
          rating: boolean
          session_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          message_id?: string | null
          rating?: boolean
          session_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chatbot_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_feedback_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_feedback_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_knowledge_base: {
        Row: {
          answer: string | null
          category: string | null
          content: string | null
          created_at: string | null
          file_name: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          question: string | null
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          answer?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          question?: string | null
          tenant_id: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          answer?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          question?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_knowledge_base_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_knowledge_base_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_menu_items: {
        Row: {
          action_payload: Json | null
          action_type: string
          action_value: string
          created_at: string | null
          icon: string
          id: string
          is_active: boolean | null
          label: string
          requires_ai: boolean | null
          sort_order: number | null
          tenant_id: string
          tenant_type: string
        }
        Insert: {
          action_payload?: Json | null
          action_type: string
          action_value: string
          created_at?: string | null
          icon: string
          id?: string
          is_active?: boolean | null
          label: string
          requires_ai?: boolean | null
          sort_order?: number | null
          tenant_id: string
          tenant_type: string
        }
        Update: {
          action_payload?: Json | null
          action_type?: string
          action_value?: string
          created_at?: string | null
          icon?: string
          id?: string
          is_active?: boolean | null
          label?: string
          requires_ai?: boolean | null
          sort_order?: number | null
          tenant_id?: string
          tenant_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_menu_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_menu_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_messages: {
        Row: {
          action_executed: Json | null
          content: string | null
          created_at: string | null
          id: string
          message_type: string | null
          metadata: Json | null
          role: string
          session_id: string
        }
        Insert: {
          action_executed?: Json | null
          content?: string | null
          created_at?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          role: string
          session_id: string
        }
        Update: {
          action_executed?: Json | null
          content?: string | null
          created_at?: string | null
          id?: string
          message_type?: string | null
          metadata?: Json | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chatbot_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_quick_actions: {
        Row: {
          action_code: string
          allowed_types: string[] | null
          created_at: string | null
          description: string | null
          function_name: string | null
          id: string
          is_active: boolean | null
          name: string
          parameters_schema: Json | null
          tenant_id: string
        }
        Insert: {
          action_code: string
          allowed_types?: string[] | null
          created_at?: string | null
          description?: string | null
          function_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parameters_schema?: Json | null
          tenant_id: string
        }
        Update: {
          action_code?: string
          allowed_types?: string[] | null
          created_at?: string | null
          description?: string | null
          function_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parameters_schema?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_quick_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_quick_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_sessions: {
        Row: {
          context: Json | null
          customer_id: string | null
          ended_at: string | null
          feedback: string | null
          id: string
          messages: Json
          metadata: Json | null
          rating: boolean | null
          resolved_by_ai: boolean | null
          satisfaction_rating: number | null
          started_at: string
          status: string
          tenant_id: string
          tenant_type: string | null
          total_actions: number | null
          transferred_to: string | null
          transferred_to_human: boolean | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          customer_id?: string | null
          ended_at?: string | null
          feedback?: string | null
          id?: string
          messages?: Json
          metadata?: Json | null
          rating?: boolean | null
          resolved_by_ai?: boolean | null
          satisfaction_rating?: number | null
          started_at?: string
          status?: string
          tenant_id: string
          tenant_type?: string | null
          total_actions?: number | null
          transferred_to?: string | null
          transferred_to_human?: boolean | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          customer_id?: string | null
          ended_at?: string | null
          feedback?: string | null
          id?: string
          messages?: Json
          metadata?: Json | null
          rating?: boolean | null
          resolved_by_ai?: boolean | null
          satisfaction_rating?: number | null
          started_at?: string
          status?: string
          tenant_id?: string
          tenant_type?: string | null
          total_actions?: number | null
          transferred_to?: string | null
          transferred_to_human?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active: boolean | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      content_posts: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          media_url: string | null
          scheduled_at: string | null
          tenant_id: string
          title: string
          type: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          media_url?: string | null
          scheduled_at?: string | null
          tenant_id: string
          title: string
          type?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          media_url?: string | null
          scheduled_at?: string | null
          tenant_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      content_versions: {
        Row: {
          category: string | null
          content: string
          content_post_id: string
          created_at: string
          created_by: string | null
          id: string
          images: string[] | null
          media_url: string | null
          title: string
          type: string
          version_number: number
        }
        Insert: {
          category?: string | null
          content: string
          content_post_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          images?: string[] | null
          media_url?: string | null
          title: string
          type?: string
          version_number: number
        }
        Update: {
          category?: string | null
          content?: string
          content_post_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          images?: string[] | null
          media_url?: string | null
          title?: string
          type?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_versions_content_post_id_fkey"
            columns: ["content_post_id"]
            isOneToOne: false
            referencedRelation: "content_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          buyer_tenant_id: string
          coupon_id: string
          id: string
          payment_id: string
          used_at: string
        }
        Insert: {
          buyer_tenant_id: string
          coupon_id: string
          id?: string
          payment_id: string
          used_at?: string
        }
        Update: {
          buyer_tenant_id?: string
          coupon_id?: string
          id?: string
          payment_id?: string
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_buyer_tenant_id_fkey"
            columns: ["buyer_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_buyer_tenant_id_fkey"
            columns: ["buyer_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          issuer_tenant_id: string
          max_redemptions: number | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          issuer_tenant_id: string
          max_redemptions?: number | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          issuer_tenant_id?: string
          max_redemptions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_issuer_tenant_id_fkey"
            columns: ["issuer_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_issuer_tenant_id_fkey"
            columns: ["issuer_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          cep: string | null
          city: string | null
          complement: string | null
          customer_id: string
          district: string | null
          id: string
          number: string | null
          state: string | null
          street: string | null
        }
        Insert: {
          cep?: string | null
          city?: string | null
          complement?: string | null
          customer_id: string
          district?: string | null
          id?: string
          number?: string | null
          state?: string | null
          street?: string | null
        }
        Update: {
          cep?: string | null
          city?: string | null
          complement?: string | null
          customer_id?: string
          district?: string | null
          id?: string
          number?: string | null
          state?: string | null
          street?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_auth: {
        Row: {
          created_at: string | null
          customer_id: string
          email: string
          id: string
          is_active: boolean | null
          last_login: string | null
          password_hash: string
          plain_password: string | null
          reset_token: string | null
          reset_token_expires: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          email: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          password_hash: string
          plain_password?: string | null
          reset_token?: string | null
          reset_token_expires?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          email?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          password_hash?: string
          plain_password?: string | null
          reset_token?: string | null
          reset_token_expires?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_auth_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_charges: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          description: string
          due_date: string
          id: string
          paid_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          description: string
          due_date: string
          id?: string
          paid_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          description?: string
          due_date?: string
          id?: string
          paid_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_charges_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_charges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_charges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_items: {
        Row: {
          created_at: string
          customer_id: string
          discount: number | null
          due_date: string | null
          expires_at: string | null
          id: string
          plan_name: string | null
          price: number | null
          product_name: string
          starts_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          discount?: number | null
          due_date?: string | null
          expires_at?: string | null
          id?: string
          plan_name?: string | null
          price?: number | null
          product_name: string
          starts_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          discount?: number | null
          due_date?: string | null
          expires_at?: string | null
          id?: string
          plan_name?: string | null
          price?: number | null
          product_name?: string
          starts_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_plan_subscriptions: {
        Row: {
          auto_renew: boolean | null
          created_at: string | null
          customer_id: string
          discount_amount: number | null
          discount_id: string | null
          end_date: string | null
          entry_fee: number | null
          entry_fee_mode: string | null
          final_price: number
          id: string
          next_billing_date: string | null
          plan_id: string
          price: number
          start_date: string
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          auto_renew?: boolean | null
          created_at?: string | null
          customer_id: string
          discount_amount?: number | null
          discount_id?: string | null
          end_date?: string | null
          entry_fee?: number | null
          entry_fee_mode?: string | null
          final_price: number
          id?: string
          next_billing_date?: string | null
          plan_id: string
          price: number
          start_date?: string
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          auto_renew?: boolean | null
          created_at?: string | null
          customer_id?: string
          discount_amount?: number | null
          discount_id?: string | null
          end_date?: string | null
          entry_fee?: number | null
          entry_fee_mode?: string | null
          final_price?: number
          id?: string
          next_billing_date?: string | null
          plan_id?: string
          price?: number
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_plan_subscriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_plan_subscriptions_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_plan_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "tenant_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_plan_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_plan_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_product_purchases: {
        Row: {
          created_at: string | null
          customer_id: string
          discount_amount: number | null
          discount_id: string | null
          id: string
          product_id: string
          quantity: number
          status: string
          tenant_id: string
          total_price: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          discount_amount?: number | null
          discount_id?: string | null
          id?: string
          product_id: string
          quantity?: number
          status?: string
          tenant_id: string
          total_price: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          discount_amount?: number | null
          discount_id?: string | null
          id?: string
          product_id?: string
          quantity?: number
          status?: string
          tenant_id?: string
          total_price?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_product_purchases_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_product_purchases_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_product_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "tenant_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_product_purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_product_purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_referral_links: {
        Row: {
          available_balance: number | null
          created_at: string | null
          customer_id: string
          id: string
          is_active: boolean | null
          ref_code: number
          tenant_id: string
          total_earned: number | null
          total_referrals: number | null
        }
        Insert: {
          available_balance?: number | null
          created_at?: string | null
          customer_id: string
          id?: string
          is_active?: boolean | null
          ref_code?: number
          tenant_id: string
          total_earned?: number | null
          total_referrals?: number | null
        }
        Update: {
          available_balance?: number | null
          created_at?: string | null
          customer_id?: string
          id?: string
          is_active?: boolean | null
          ref_code?: number
          tenant_id?: string
          total_earned?: number | null
          total_referrals?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_referral_links_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_referral_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_referral_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_referrals: {
        Row: {
          commission_amount: number | null
          commission_type: string | null
          created_at: string | null
          id: string
          paid_at: string | null
          referral_link_id: string | null
          referred_customer_id: string
          referrer_customer_id: string
          service_id: string | null
          status: string | null
          subscription_id: string | null
          tenant_id: string
        }
        Insert: {
          commission_amount?: number | null
          commission_type?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          referral_link_id?: string | null
          referred_customer_id: string
          referrer_customer_id: string
          service_id?: string | null
          status?: string | null
          subscription_id?: string | null
          tenant_id: string
        }
        Update: {
          commission_amount?: number | null
          commission_type?: string | null
          created_at?: string | null
          id?: string
          paid_at?: string | null
          referral_link_id?: string | null
          referred_customer_id?: string
          referrer_customer_id?: string
          service_id?: string | null
          status?: string | null
          subscription_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_referred"
            columns: ["referred_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_referrer"
            columns: ["referrer_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tenant"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_vehicles: {
        Row: {
          brand: string | null
          color: string | null
          customer_id: string
          id: string
          model: string | null
          notes: string | null
          plate: string | null
          renavam: string | null
          year: string | null
        }
        Insert: {
          brand?: string | null
          color?: string | null
          customer_id: string
          id?: string
          model?: string | null
          notes?: string | null
          plate?: string | null
          renavam?: string | null
          year?: string | null
        }
        Update: {
          brand?: string | null
          color?: string | null
          customer_id?: string
          id?: string
          model?: string | null
          notes?: string | null
          plate?: string | null
          renavam?: string | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_vehicles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          allow_email: boolean
          allow_portal_notifications: boolean
          allow_whatsapp: boolean
          birth_date: string | null
          cpf_cnpj: string | null
          created_at: string
          customer_tenant_id: string | null
          email: string
          full_name: string
          gender: string | null
          id: string
          notes: string | null
          pix_key: string | null
          referrer_customer_id: string | null
          rg_ie: string | null
          secondary_phone: string | null
          status: string
          tenant_id: string
          whatsapp: string
        }
        Insert: {
          allow_email?: boolean
          allow_portal_notifications?: boolean
          allow_whatsapp?: boolean
          birth_date?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          customer_tenant_id?: string | null
          email?: string
          full_name: string
          gender?: string | null
          id?: string
          notes?: string | null
          pix_key?: string | null
          referrer_customer_id?: string | null
          rg_ie?: string | null
          secondary_phone?: string | null
          status?: string
          tenant_id: string
          whatsapp: string
        }
        Update: {
          allow_email?: boolean
          allow_portal_notifications?: boolean
          allow_whatsapp?: boolean
          birth_date?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          customer_tenant_id?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          id?: string
          notes?: string | null
          pix_key?: string | null
          referrer_customer_id?: string | null
          rg_ie?: string | null
          secondary_phone?: string | null
          status?: string
          tenant_id?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_customer_tenant_id_fkey"
            columns: ["customer_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_customer_tenant_id_fkey"
            columns: ["customer_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_referrer_customer_id_fkey"
            columns: ["referrer_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_items: {
        Row: {
          created_at: string | null
          discount_id: string
          id: string
          item_type: string
          plan_id: string | null
          product_id: string | null
        }
        Insert: {
          created_at?: string | null
          discount_id: string
          id?: string
          item_type: string
          plan_id?: string | null
          product_id?: string | null
        }
        Update: {
          created_at?: string | null
          discount_id?: string
          id?: string
          item_type?: string
          plan_id?: string | null
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_items_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "tenant_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "tenant_products"
            referencedColumns: ["id"]
          },
        ]
      }
      discounts: {
        Row: {
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_ai_learning: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          last_used_at: string | null
          occurrences: number | null
          pattern_key: string
          pattern_type: string
          pattern_value: Json
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          occurrences?: number | null
          pattern_key: string
          pattern_type: string
          pattern_value: Json
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          last_used_at?: string | null
          occurrences?: number | null
          pattern_key?: string
          pattern_type?: string
          pattern_value?: Json
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_ai_learning_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_ai_learning_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_allocations: {
        Row: {
          amount: number
          cost_center_id: string
          created_at: string | null
          expense_id: string
          id: string
          percentage: number
        }
        Insert: {
          amount: number
          cost_center_id: string
          created_at?: string | null
          expense_id: string
          id?: string
          percentage: number
        }
        Update: {
          amount?: number
          cost_center_id?: string
          created_at?: string | null
          expense_id?: string
          id?: string
          percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "expense_allocations_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "expense_cost_centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_allocations_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_attachments: {
        Row: {
          expense_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          expense_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          expense_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_attachments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_cost_centers: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_cost_centers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_cost_centers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_history: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          expense_id: string
          field_changed: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          expense_id: string
          field_changed?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          expense_id?: string
          field_changed?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_history_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_reminders: {
        Row: {
          channel: string
          created_at: string | null
          days_offset: number
          error_message: string | null
          expense_id: string
          id: string
          response_action: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          channel?: string
          created_at?: string | null
          days_offset: number
          error_message?: string | null
          expense_id: string
          id?: string
          response_action?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          days_offset?: number
          error_message?: string | null
          expense_id?: string
          id?: string
          response_action?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_reminders_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string
          due_date: string
          id: string
          is_recurring: boolean | null
          notes: string | null
          paid_at: string | null
          parent_expense_id: string | null
          recurrence_rule: Json | null
          status: string
          supplier: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          due_date: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          paid_at?: string | null
          parent_expense_id?: string | null
          recurrence_rule?: Json | null
          status?: string
          supplier?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          due_date?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          paid_at?: string | null
          parent_expense_id?: string | null
          recurrence_rule?: Json | null
          status?: string
          supplier?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_parent_expense_id_fkey"
            columns: ["parent_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      group_autoresponder_config: {
        Row: {
          config_type: string | null
          custom_context: string | null
          group_id: string
          id: string
          ignore_admins: boolean | null
          is_enabled: boolean | null
          max_responses_per_minute: number | null
          mode: string | null
          respond_all: boolean | null
          respond_on_keywords: boolean | null
          respond_on_mention: boolean | null
          respond_on_questions: boolean | null
          response_delay_seconds: number | null
          tone: string | null
          updated_at: string | null
        }
        Insert: {
          config_type?: string | null
          custom_context?: string | null
          group_id: string
          id?: string
          ignore_admins?: boolean | null
          is_enabled?: boolean | null
          max_responses_per_minute?: number | null
          mode?: string | null
          respond_all?: boolean | null
          respond_on_keywords?: boolean | null
          respond_on_mention?: boolean | null
          respond_on_questions?: boolean | null
          response_delay_seconds?: number | null
          tone?: string | null
          updated_at?: string | null
        }
        Update: {
          config_type?: string | null
          custom_context?: string | null
          group_id?: string
          id?: string
          ignore_admins?: boolean | null
          is_enabled?: boolean | null
          max_responses_per_minute?: number | null
          mode?: string | null
          respond_all?: boolean | null
          respond_on_keywords?: boolean | null
          respond_on_mention?: boolean | null
          respond_on_questions?: boolean | null
          response_delay_seconds?: number | null
          tone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_autoresponder_config_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          channel: string
          created_at: string | null
          customer_id: string | null
          error_message: string | null
          id: string
          sent_at: string | null
          status: string
          template_id: string | null
          tenant_id: string
        }
        Insert: {
          channel: string
          created_at?: string | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          tenant_id: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          channel: string
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          tenant_id: string
          type: string
        }
        Insert: {
          channel?: string
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          tenant_id: string
          type: string
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      note_ai_actions: {
        Row: {
          action_type: string
          ai_response: string | null
          created_at: string
          id: string
          note_id: string
          original_content: string
        }
        Insert: {
          action_type: string
          ai_response?: string | null
          created_at?: string
          id?: string
          note_id: string
          original_content: string
        }
        Update: {
          action_type?: string
          ai_response?: string | null
          created_at?: string
          id?: string
          note_id?: string
          original_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_ai_actions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          category: Database["public"]["Enums"]["note_category"] | null
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          reminder_at: string | null
          scheduled_at: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["note_category"] | null
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          reminder_at?: string | null
          scheduled_at?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["note_category"] | null
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          reminder_at?: string | null
          scheduled_at?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          charge_notifications: boolean
          created_at: string
          customer_notifications: boolean
          daily_summary_enabled: boolean
          daily_summary_time: string
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          payment_notifications: boolean
          push_enabled: boolean
          quiet_hours_enabled: boolean
          quiet_hours_end: string
          quiet_hours_start: string
          reseller_notifications: boolean
          system_notifications: boolean
          tenant_id: string
          updated_at: string
          user_id: string | null
          whatsapp_enabled: boolean
        }
        Insert: {
          charge_notifications?: boolean
          created_at?: string
          customer_notifications?: boolean
          daily_summary_enabled?: boolean
          daily_summary_time?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          payment_notifications?: boolean
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          reseller_notifications?: boolean
          system_notifications?: boolean
          tenant_id: string
          updated_at?: string
          user_id?: string | null
          whatsapp_enabled?: boolean
        }
        Update: {
          charge_notifications?: boolean
          created_at?: string
          customer_notifications?: boolean
          daily_summary_enabled?: boolean
          daily_summary_time?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          payment_notifications?: boolean
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string
          quiet_hours_start?: string
          reseller_notifications?: boolean
          system_notifications?: boolean
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
          whatsapp_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          reference_id?: string | null
          reference_type?: string | null
          tenant_id: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          buyer_tenant_id: string
          created_at: string
          due_date: string | null
          id: string
          paid_at: string | null
          seller_tenant_id: string
          status: string
          subscription_id: string | null
        }
        Insert: {
          amount: number
          buyer_tenant_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          paid_at?: string | null
          seller_tenant_id: string
          status?: string
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          buyer_tenant_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          paid_at?: string | null
          seller_tenant_id?: string
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_buyer_tenant_id_fkey"
            columns: ["buyer_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_buyer_tenant_id_fkey"
            columns: ["buyer_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_seller_tenant_id_fkey"
            columns: ["seller_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_seller_tenant_id_fkey"
            columns: ["seller_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          created_at: string
          feature_category: string
          feature_name: string
          feature_subcategory: string
          id: string
          is_enabled: boolean | null
          plan_id: string
        }
        Insert: {
          created_at?: string
          feature_category: string
          feature_name: string
          feature_subcategory: string
          id?: string
          is_enabled?: boolean | null
          plan_id: string
        }
        Update: {
          created_at?: string
          feature_category?: string
          feature_name?: string
          feature_subcategory?: string
          id?: string
          is_enabled?: boolean | null
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_prices: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          plan_id: string
          price_monthly: number
          seller_tenant_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          plan_id: string
          price_monthly: number
          seller_tenant_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          plan_id?: string
          price_monthly?: number
          seller_tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_prices_seller_tenant_id_fkey"
            columns: ["seller_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_prices_seller_tenant_id_fkey"
            columns: ["seller_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          active: boolean | null
          base_price: number | null
          benefits: string | null
          created_at: string | null
          created_by_tenant_id: string
          description: string | null
          duration_months: number | null
          id: string
          max_clients: number | null
          max_users: number | null
          min_fee_annual: number | null
          min_fee_monthly: number | null
          name: string
          per_active_revenda_price: number | null
          plan_type: string
          price_annual: number | null
          price_monthly: number | null
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          base_price?: number | null
          benefits?: string | null
          created_at?: string | null
          created_by_tenant_id: string
          description?: string | null
          duration_months?: number | null
          id?: string
          max_clients?: number | null
          max_users?: number | null
          min_fee_annual?: number | null
          min_fee_monthly?: number | null
          name: string
          per_active_revenda_price?: number | null
          plan_type: string
          price_annual?: number | null
          price_monthly?: number | null
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          base_price?: number | null
          benefits?: string | null
          created_at?: string | null
          created_by_tenant_id?: string
          description?: string | null
          duration_months?: number | null
          id?: string
          max_clients?: number | null
          max_users?: number | null
          min_fee_annual?: number | null
          min_fee_monthly?: number | null
          name?: string
          per_active_revenda_price?: number | null
          plan_type?: string
          price_annual?: number | null
          price_monthly?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_created_by_tenant_id_fkey"
            columns: ["created_by_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_created_by_tenant_id_fkey"
            columns: ["created_by_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_tiers: {
        Row: {
          created_at: string | null
          id: string
          max_quantity: number | null
          min_quantity: number
          product_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_quantity?: number | null
          min_quantity?: number
          product_id: string
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          max_quantity?: number | null
          min_quantity?: number
          product_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_price_tiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "tenant_products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          current_tenant_id: string | null
          full_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_tenant_id?: string | null
          full_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_tenant_id?: string | null
          full_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_tenant_id_fkey"
            columns: ["current_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_current_tenant_id_fkey"
            columns: ["current_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_codes: {
        Row: {
          active: boolean | null
          code: number
          created_at: string | null
          kind: string
          owner_tenant_id: string
          payload: Json | null
        }
        Insert: {
          active?: boolean | null
          code?: number
          created_at?: string | null
          kind: string
          owner_tenant_id: string
          payload?: Json | null
        }
        Update: {
          active?: boolean | null
          code?: number
          created_at?: string | null
          kind?: string
          owner_tenant_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ref_codes_owner_tenant_id_fkey"
            columns: ["owner_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ref_codes_owner_tenant_id_fkey"
            columns: ["owner_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_history: {
        Row: {
          commission_amount: number
          commission_type: string | null
          created_at: string | null
          customer_item_id: string | null
          id: string
          payment_id: string | null
          referral_link_id: string
          referred_tenant_id: string | null
          status: string
        }
        Insert: {
          commission_amount?: number
          commission_type?: string | null
          created_at?: string | null
          customer_item_id?: string | null
          id?: string
          payment_id?: string | null
          referral_link_id: string
          referred_tenant_id?: string | null
          status?: string
        }
        Update: {
          commission_amount?: number
          commission_type?: string | null
          created_at?: string | null
          customer_item_id?: string | null
          id?: string
          payment_id?: string | null
          referral_link_id?: string
          referred_tenant_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_history_customer_item_id_fkey"
            columns: ["customer_item_id"]
            isOneToOne: false
            referencedRelation: "customer_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_history_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_history_referral_link_id_fkey"
            columns: ["referral_link_id"]
            isOneToOne: false
            referencedRelation: "referral_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_history_referred_tenant_id_fkey"
            columns: ["referred_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_history_referred_tenant_id_fkey"
            columns: ["referred_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_links: {
        Row: {
          commission_type: string
          commission_value: number
          created_at: string | null
          id: string
          is_active: boolean | null
          ref_code: number
          tenant_id: string
          total_earned: number | null
          total_referrals: number | null
        }
        Insert: {
          commission_type: string
          commission_value?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          ref_code: number
          tenant_id: string
          total_earned?: number | null
          total_referrals?: number | null
        }
        Update: {
          commission_type?: string
          commission_value?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          ref_code?: number
          tenant_id?: string
          total_earned?: number | null
          total_referrals?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_links_ref_code_fkey"
            columns: ["ref_code"]
            isOneToOne: false
            referencedRelation: "ref_codes"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "referral_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_transactions: {
        Row: {
          amount: number
          created_at: string
          customer_id: string
          customer_referral_link_id: string
          id: string
          notes: string | null
          pix_key: string | null
          processed_at: string | null
          status: string
          tenant_id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          customer_id: string
          customer_referral_link_id: string
          id?: string
          notes?: string | null
          pix_key?: string | null
          processed_at?: string | null
          status?: string
          tenant_id: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string
          customer_referral_link_id?: string
          id?: string
          notes?: string | null
          pix_key?: string | null
          processed_at?: string | null
          status?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_transactions_customer_referral_link_id_fkey"
            columns: ["customer_referral_link_id"]
            isOneToOne: false
            referencedRelation: "customer_referral_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_messages: {
        Row: {
          created_at: string
          custom_content: string | null
          customer_id: string | null
          error_message: string | null
          id: string
          scheduled_at: string
          sent_at: string | null
          status: string
          template_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          custom_content?: string | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          scheduled_at: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          custom_content?: string | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean | null
          benefits: string[] | null
          billing_type: string
          commission_type: string | null
          commission_value: number | null
          created_at: string | null
          cta_text: string | null
          description: string | null
          display_order: number | null
          duration_months: number | null
          id: string
          images: string[] | null
          interval: string | null
          is_featured: boolean | null
          is_variation: boolean | null
          long_description: string | null
          name: string
          parent_service_id: string | null
          price: number
          recurrence_enabled: boolean | null
          recurrence_value: number | null
          seller_tenant_id: string
          short_description: string | null
          variation_label: string | null
        }
        Insert: {
          active?: boolean | null
          benefits?: string[] | null
          billing_type: string
          commission_type?: string | null
          commission_value?: number | null
          created_at?: string | null
          cta_text?: string | null
          description?: string | null
          display_order?: number | null
          duration_months?: number | null
          id?: string
          images?: string[] | null
          interval?: string | null
          is_featured?: boolean | null
          is_variation?: boolean | null
          long_description?: string | null
          name: string
          parent_service_id?: string | null
          price: number
          recurrence_enabled?: boolean | null
          recurrence_value?: number | null
          seller_tenant_id: string
          short_description?: string | null
          variation_label?: string | null
        }
        Update: {
          active?: boolean | null
          benefits?: string[] | null
          billing_type?: string
          commission_type?: string | null
          commission_value?: number | null
          created_at?: string | null
          cta_text?: string | null
          description?: string | null
          display_order?: number | null
          duration_months?: number | null
          id?: string
          images?: string[] | null
          interval?: string | null
          is_featured?: boolean | null
          is_variation?: boolean | null
          long_description?: string | null
          name?: string
          parent_service_id?: string | null
          price?: number
          recurrence_enabled?: boolean | null
          recurrence_value?: number | null
          seller_tenant_id?: string
          short_description?: string | null
          variation_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_parent_service_id_fkey"
            columns: ["parent_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_seller_tenant_id_fkey"
            columns: ["seller_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_seller_tenant_id_fkey"
            columns: ["seller_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          buyer_tenant_id: string
          cancelled_at: string | null
          created_at: string | null
          ends_at: string | null
          id: string
          interval: string | null
          kind: string
          plan_id: string | null
          price: number
          seller_tenant_id: string
          service_id: string | null
          starts_at: string
          status: string
        }
        Insert: {
          buyer_tenant_id: string
          cancelled_at?: string | null
          created_at?: string | null
          ends_at?: string | null
          id?: string
          interval?: string | null
          kind: string
          plan_id?: string | null
          price: number
          seller_tenant_id: string
          service_id?: string | null
          starts_at?: string
          status?: string
        }
        Update: {
          buyer_tenant_id?: string
          cancelled_at?: string | null
          created_at?: string | null
          ends_at?: string | null
          id?: string
          interval?: string | null
          kind?: string
          plan_id?: string | null
          price?: number
          seller_tenant_id?: string
          service_id?: string | null
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_buyer_tenant_id_fkey"
            columns: ["buyer_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_buyer_tenant_id_fkey"
            columns: ["buyer_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_seller_tenant_id_fkey"
            columns: ["seller_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_seller_tenant_id_fkey"
            columns: ["seller_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string | null
          role_in_tenant: string | null
          status: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role_in_tenant?: string | null
          status?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role_in_tenant?: string | null
          status?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_plans: {
        Row: {
          annual_price: number | null
          auto_renew: boolean | null
          benefits: string | null
          client_limit: number | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          display_order: number | null
          duration_months: number
          entry_fee: number | null
          entry_fee_mode: string | null
          id: string
          is_active: boolean | null
          min_annual_fee: number | null
          min_monthly_fee: number | null
          name: string
          price: number
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          annual_price?: number | null
          auto_renew?: boolean | null
          benefits?: string | null
          client_limit?: number | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_months?: number
          entry_fee?: number | null
          entry_fee_mode?: string | null
          id?: string
          is_active?: boolean | null
          min_annual_fee?: number | null
          min_monthly_fee?: number | null
          name: string
          price?: number
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          annual_price?: number | null
          auto_renew?: boolean | null
          benefits?: string | null
          client_limit?: number | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_months?: number
          entry_fee?: number | null
          entry_fee_mode?: string | null
          id?: string
          is_active?: boolean | null
          min_annual_fee?: number | null
          min_monthly_fee?: number | null
          name?: string
          price?: number
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_products: {
        Row: {
          cost_price: number | null
          created_at: string | null
          description: string | null
          has_price_tiers: boolean | null
          id: string
          is_active: boolean | null
          name: string
          sale_price: number
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          has_price_tiers?: boolean | null
          id?: string
          is_active?: boolean | null
          name: string
          sale_price?: number
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          has_price_tiers?: boolean | null
          id?: string
          is_active?: boolean | null
          name?: string
          sale_price?: number
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          tenant_id: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          tenant_id: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          tenant_id?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_tenant_id: string | null
          parent_tenant_id: string | null
          status: string | null
          trial_ends_at: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_tenant_id?: string | null
          parent_tenant_id?: string | null
          status?: string | null
          trial_ends_at?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_tenant_id?: string | null
          parent_tenant_id?: string | null
          status?: string | null
          trial_ends_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_owner_tenant_id_fkey"
            columns: ["owner_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_owner_tenant_id_fkey"
            columns: ["owner_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_parent_tenant_id_fkey"
            columns: ["parent_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_parent_tenant_id_fkey"
            columns: ["parent_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_notifications: {
        Row: {
          channel: string
          id: string
          notification_type: string
          sent_at: string
          tenant_id: string
        }
        Insert: {
          channel: string
          id?: string
          notification_type: string
          sent_at?: string
          tenant_id: string
        }
        Update: {
          channel?: string
          id?: string
          notification_type?: string
          sent_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_groups: {
        Row: {
          created_at: string | null
          id: string
          is_admin: boolean | null
          name: string
          participant_count: number | null
          synced_at: string | null
          tenant_id: string
          waha_group_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          name: string
          participant_count?: number | null
          synced_at?: string | null
          tenant_id: string
          waha_group_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_admin?: boolean | null
          name?: string
          participant_count?: number | null
          synced_at?: string | null
          tenant_id?: string
          waha_group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          api_key: string | null
          created_at: string | null
          id: string
          instance_name: string
          phone_number: string | null
          qr_code: string | null
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          id?: string
          instance_name: string
          phone_number?: string | null
          qr_code?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          id?: string
          instance_name?: string
          phone_number?: string | null
          qr_code?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_children_minimal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      tenant_children_minimal: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_complete_master_setup: { Args: never; Returns: Json }
      admin_seed_link_master_user: {
        Args: { _email: string; _full_name: string; _password: string }
        Returns: Json
      }
      approve_customer: { Args: { p_customer_id: string }; Returns: Json }
      approve_customer_service: {
        Args: {
          p_customer_id: string
          p_discount_id?: string
          p_service_id: string
        }
        Returns: Json
      }
      authenticate_customer: {
        Args: { _email: string; _password_hash: string }
        Returns: Json
      }
      can_view_customer: { Args: { cust_id: string }; Returns: boolean }
      can_view_customer_items: {
        Args: { item_customer_id: string }
        Returns: boolean
      }
      can_view_referral_link: {
        Args: { link_customer_id: string; link_tenant_id: string }
        Returns: boolean
      }
      can_view_subscription: {
        Args: { subscription_buyer_tenant_id: string }
        Returns: boolean
      }
      cancel_pending_commissions: {
        Args: { p_customer_tenant_id: string }
        Returns: Json
      }
      complete_checkout:
        | {
            Args: { _coupon_code?: string; _service_id: string }
            Returns: Json
          }
        | {
            Args: {
              p_amount: number
              p_buyer_tenant_id: string
              p_coupon_code?: string
              p_customer_id?: string
              p_payment_method: string
              p_service_id: string
            }
            Returns: Json
          }
      create_customer_auth_only: {
        Args: { p_customer_id: string; p_email: string; p_password: string }
        Returns: Json
      }
      create_customer_with_auth: {
        Args: {
          p_birth_date?: string
          p_cpf_cnpj?: string
          p_email: string
          p_full_name: string
          p_notes?: string
          p_password: string
          p_pix_key?: string
          p_tenant_id: string
          p_whatsapp: string
        }
        Returns: Json
      }
      create_renewal_payment: {
        Args: {
          _customer_item_id: string
          _months: number
          _referral_credit_amount?: number
          _use_referral_credit?: boolean
        }
        Returns: Json
      }
      current_tenant_id: { Args: never; Returns: string }
      current_user_id: { Args: never; Returns: string }
      customer_has_active_service: {
        Args: { _customer_id: string }
        Returns: boolean
      }
      customer_has_active_subscription: {
        Args: { p_customer_tenant_id: string }
        Returns: boolean
      }
      customer_subscribe_service: {
        Args: { p_service_id: string }
        Returns: Json
      }
      get_current_tenant_access: { Args: never; Returns: Json }
      get_master_signup_ref_code: {
        Args: never
        Returns: {
          kind: string
          ref_code: number
        }[]
      }
      get_user_tenant_ids: { Args: { _user_id: string }; Returns: string[] }
      has_active_service_access: {
        Args: { _tenant_id: string }
        Returns: boolean
      }
      is_current_tenant_adm: { Args: never; Returns: boolean }
      is_current_tenant_master: { Args: never; Returns: boolean }
      is_master_user: { Args: { _user_id: string }; Returns: boolean }
      is_member: { Args: { _tenant_id: string }; Returns: boolean }
      is_member_of_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      link_user_to_master: { Args: never; Returns: Json }
      mark_payment_paid: { Args: { _payment_id: string }; Returns: Json }
      process_ref_code_signup: { Args: { _code: number }; Returns: Json }
      publish_scheduled_posts: { Args: never; Returns: number }
      register_customer_recurring_commission: {
        Args: {
          p_amount: number
          p_referred_customer_id: string
          p_service_id: string
          p_subscription_id: string
        }
        Returns: Json
      }
      register_customer_referral_commission: {
        Args: {
          p_amount: number
          p_referred_customer_id: string
          p_service_id: string
          p_subscription_id: string
        }
        Returns: Json
      }
      register_portal_customer: {
        Args: {
          p_birth_date?: string
          p_cpf_cnpj?: string
          p_email: string
          p_full_name: string
          p_password: string
          p_pix_key?: string
          p_ref_code?: number
          p_tenant_id: string
          p_whatsapp: string
        }
        Returns: Json
      }
      register_renewal_commission: {
        Args: { p_customer_item_id: string; p_payment_amount: number }
        Returns: Json
      }
      set_current_tenant: { Args: { _tenant_id: string }; Returns: Json }
      setup_customer_after_signup: {
        Args: {
          p_account_name?: string
          p_birth_date?: string
          p_cpf_cnpj?: string
          p_email: string
          p_full_name: string
          p_is_revenda?: boolean
          p_notes?: string
          p_pix_key?: string
          p_tenant_id: string
          p_user_id: string
          p_whatsapp: string
        }
        Returns: Json
      }
      update_customer_password: {
        Args: { p_customer_id: string; p_new_password: string }
        Returns: Json
      }
      update_customer_password_sync: {
        Args: { p_customer_id: string; p_new_password: string }
        Returns: Json
      }
      user_can_access_customer_data: {
        Args: { customer_tenant_uuid: string }
        Returns: boolean
      }
      validate_coupon: {
        Args: { _amount: number; _code: string; _seller_tenant_id: string }
        Returns: Json
      }
      validate_ref_code: { Args: { _code: number }; Returns: Json }
    }
    Enums: {
      note_category: "idea" | "task" | "meeting" | "bug"
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
      note_category: ["idea", "task", "meeting", "bug"],
    },
  },
} as const
