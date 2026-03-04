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
      accounting_entries: {
        Row: {
          amount: number
          category: string
          company_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          store_id: string | null
          type: Database["public"]["Enums"]["accounting_entry_type"]
        }
        Insert: {
          amount?: number
          category?: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string | null
          type: Database["public"]["Enums"]["accounting_entry_type"]
        }
        Update: {
          amount?: number
          category?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string | null
          type?: Database["public"]["Enums"]["accounting_entry_type"]
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      active_store: {
        Row: {
          id: string
          store_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          store_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          store_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_store_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      agro_inputs: {
        Row: {
          cost: number
          created_at: string
          crop_id: string
          id: string
          input_type: string
          name: string
          quantity: number
          usage_date: string
        }
        Insert: {
          cost?: number
          created_at?: string
          crop_id: string
          id?: string
          input_type?: string
          name: string
          quantity?: number
          usage_date?: string
        }
        Update: {
          cost?: number
          created_at?: string
          crop_id?: string
          id?: string
          input_type?: string
          name?: string
          quantity?: number
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "agro_inputs_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      business_modules: {
        Row: {
          agricultura: boolean
          avicultura: boolean
          comercio: boolean
          company_id: string
          id: string
          updated_at: string
        }
        Insert: {
          agricultura?: boolean
          avicultura?: boolean
          comercio?: boolean
          company_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          agricultura?: boolean
          avicultura?: boolean
          comercio?: boolean
          company_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_modules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number
          cash_register_id: string
          created_at: string | null
          created_by: string
          description: string
          id: string
          type: string
        }
        Insert: {
          amount: number
          cash_register_id: string
          created_at?: string | null
          created_by: string
          description: string
          id?: string
          type: string
        }
        Update: {
          amount?: number
          cash_register_id?: string
          created_at?: string | null
          created_by?: string
          description?: string
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          closed_at: string | null
          closing_amount: number | null
          difference: number | null
          expected_amount: number | null
          id: string
          notes: string | null
          opened_at: string | null
          opening_amount: number | null
          status: Database["public"]["Enums"]["cash_register_status"] | null
          store_id: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          closing_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          opening_amount?: number | null
          status?: Database["public"]["Enums"]["cash_register_status"] | null
          store_id: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          closing_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          opening_amount?: number | null
          status?: Database["public"]["Enums"]["cash_register_status"] | null
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          paid_at: string | null
          rate: number
          sale_id: string | null
          status: string | null
          store_id: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          rate?: number
          sale_id?: string | null
          status?: string | null
          store_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          paid_at?: string | null
          rate?: number
          sale_id?: string | null
          status?: string | null
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          audio_url: string | null
          category: string
          comments_count: number
          company_id: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          likes_count: number
          title: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          category?: string
          comments_count?: number
          company_id?: string | null
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          title: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          category?: string
          comments_count?: number
          company_id?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          likes_count?: number
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          fiscal_rate: number | null
          fiscal_regime: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          nif: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          fiscal_rate?: number | null
          fiscal_regime?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          nif?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          fiscal_rate?: number | null
          fiscal_regime?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          nif?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crops: {
        Row: {
          area_planted: number
          company_id: string
          created_at: string
          created_by: string | null
          expected_harvest_date: string | null
          expected_profit: number | null
          id: string
          losses: number | null
          name: string
          planting_date: string
          quantity_harvested: number | null
          status: string
          store_id: string | null
          total_cost: number
          updated_at: string
        }
        Insert: {
          area_planted?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          expected_harvest_date?: string | null
          expected_profit?: number | null
          id?: string
          losses?: number | null
          name: string
          planting_date?: string
          quantity_harvested?: number | null
          status?: string
          store_id?: string | null
          total_cost?: number
          updated_at?: string
        }
        Update: {
          area_planted?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          expected_harvest_date?: string | null
          expected_profit?: number | null
          id?: string
          losses?: number | null
          name?: string
          planting_date?: string
          quantity_harvested?: number | null
          status?: string
          store_id?: string | null
          total_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crops_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crops_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_sellers: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          seller_id: string
          store_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          seller_id: string
          store_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          seller_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_sellers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_sellers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_sellers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          created_by: string
          email: string | null
          full_name: string
          id: string
          last_purchase_at: string | null
          notes: string | null
          phone: string | null
          store_id: string | null
          total_purchases: number | null
          total_spent: number | null
          updated_at: string
          vip_level: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          full_name: string
          id?: string
          last_purchase_at?: string | null
          notes?: string | null
          phone?: string | null
          store_id?: string | null
          total_purchases?: number | null
          total_spent?: number | null
          updated_at?: string
          vip_level?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          full_name?: string
          id?: string
          last_purchase_at?: string | null
          notes?: string | null
          phone?: string | null
          store_id?: string | null
          total_purchases?: number | null
          total_spent?: number | null
          updated_at?: string
          vip_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      document_series: {
        Row: {
          company_id: string
          created_at: string
          default_notes: string | null
          document_type: Database["public"]["Enums"]["fiscal_document_type"]
          id: string
          is_active: boolean
          next_number: number
          prefix: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          default_notes?: string | null
          document_type: Database["public"]["Enums"]["fiscal_document_type"]
          id?: string
          is_active?: boolean
          next_number?: number
          prefix: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          default_notes?: string | null
          document_type?: Database["public"]["Enums"]["fiscal_document_type"]
          id?: string
          is_active?: boolean
          next_number?: number
          prefix?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_series_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_series_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          bank_account: string | null
          bank_name: string | null
          base_salary: number
          company_id: string
          created_at: string
          department: string
          email: string | null
          full_name: string
          hire_date: string
          id: string
          inss_number: string | null
          nuit: string | null
          phone: string | null
          position: string
          profile_id: string | null
          status: string
          store_id: string | null
          termination_date: string | null
          updated_at: string
        }
        Insert: {
          bank_account?: string | null
          bank_name?: string | null
          base_salary?: number
          company_id: string
          created_at?: string
          department?: string
          email?: string | null
          full_name: string
          hire_date?: string
          id?: string
          inss_number?: string | null
          nuit?: string | null
          phone?: string | null
          position?: string
          profile_id?: string | null
          status?: string
          store_id?: string | null
          termination_date?: string | null
          updated_at?: string
        }
        Update: {
          bank_account?: string | null
          bank_name?: string | null
          base_salary?: number
          company_id?: string
          created_at?: string
          department?: string
          email?: string | null
          full_name?: string
          hire_date?: string
          id?: string
          inss_number?: string | null
          nuit?: string | null
          phone?: string | null
          position?: string
          profile_id?: string | null
          status?: string
          store_id?: string | null
          termination_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_document_items: {
        Row: {
          created_at: string
          description: string
          document_id: string
          id: string
          line_total: number
          quantity: number
          tax_rate: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          document_id: string
          id?: string
          line_total?: number
          quantity?: number
          tax_rate?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          document_id?: string
          id?: string
          line_total?: number
          quantity?: number
          tax_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_document_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "fiscal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_documents: {
        Row: {
          company_id: string
          created_at: string
          currency: string
          customer_address: string | null
          customer_email: string | null
          customer_name: string
          customer_nuit: string | null
          customer_phone: string | null
          discount_amount: number
          document_number: string
          document_type: Database["public"]["Enums"]["fiscal_document_type"]
          id: string
          issue_date: string
          issued_by: string
          notes: string | null
          number: number
          series_id: string | null
          status: string
          store_id: string | null
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          currency?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name: string
          customer_nuit?: string | null
          customer_phone?: string | null
          discount_amount?: number
          document_number: string
          document_type: Database["public"]["Enums"]["fiscal_document_type"]
          id?: string
          issue_date?: string
          issued_by: string
          notes?: string | null
          number?: number
          series_id?: string | null
          status?: string
          store_id?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          currency?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_nuit?: string | null
          customer_phone?: string | null
          discount_amount?: number
          document_number?: string
          document_type?: Database["public"]["Enums"]["fiscal_document_type"]
          id?: string
          issue_date?: string
          issued_by?: string
          notes?: string | null
          number?: number
          series_id?: string | null
          status?: string
          store_id?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documents_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "document_series"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documents_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          id: string
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["billing_payment_method"]
          phone_number: string | null
          reference_id: string | null
          status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_method: Database["public"]["Enums"]["billing_payment_method"]
          phone_number?: string | null
          reference_id?: string | null
          status?: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["billing_payment_method"]
          phone_number?: string | null
          reference_id?: string | null
          status?: string
          subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_vouchers: {
        Row: {
          amount: number
          code: string
          created_at: string
          customer_name: string | null
          expires_at: string
          id: string
          payment_method: string
          phone_number: string | null
          redeemed_at: string | null
          redeemed_by: string | null
          sale_id: string | null
          status: Database["public"]["Enums"]["voucher_status"]
          store_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          customer_name?: string | null
          expires_at?: string
          id?: string
          payment_method: string
          phone_number?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          customer_name?: string | null
          expires_at?: string
          id?: string
          payment_method?: string
          phone_number?: string | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["voucher_status"]
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_vouchers_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_vouchers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          base_salary: number
          bonus_amount: number
          company_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          gross_salary: number
          id: string
          inss_employee: number
          inss_employer: number
          irps_amount: number
          net_salary: number
          notes: string | null
          other_deductions: number
          overtime_amount: number
          paid_at: string | null
          period_month: number
          period_year: number
          status: string
          total_cost: number
          updated_at: string
        }
        Insert: {
          base_salary?: number
          bonus_amount?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          gross_salary?: number
          id?: string
          inss_employee?: number
          inss_employer?: number
          irps_amount?: number
          net_salary?: number
          notes?: string | null
          other_deductions?: number
          overtime_amount?: number
          paid_at?: string | null
          period_month: number
          period_year: number
          status?: string
          total_cost?: number
          updated_at?: string
        }
        Update: {
          base_salary?: number
          bonus_amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          gross_salary?: number
          id?: string
          inss_employee?: number
          inss_employer?: number
          irps_amount?: number
          net_salary?: number
          notes?: string | null
          other_deductions?: number
          overtime_amount?: number
          paid_at?: string | null
          period_month?: number
          period_year?: number
          status?: string
          total_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      poultry_batches: {
        Row: {
          avg_weight: number | null
          batch_name: string
          company_id: string
          created_at: string
          created_by: string | null
          current_quantity: number
          expected_slaughter_date: string | null
          id: string
          initial_quantity: number
          mortality: number | null
          start_date: string
          status: string
          store_id: string | null
          total_cost: number
          updated_at: string
        }
        Insert: {
          avg_weight?: number | null
          batch_name: string
          company_id: string
          created_at?: string
          created_by?: string | null
          current_quantity?: number
          expected_slaughter_date?: string | null
          id?: string
          initial_quantity?: number
          mortality?: number | null
          start_date?: string
          status?: string
          store_id?: string | null
          total_cost?: number
          updated_at?: string
        }
        Update: {
          avg_weight?: number | null
          batch_name?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          current_quantity?: number
          expected_slaughter_date?: string | null
          id?: string
          initial_quantity?: number
          mortality?: number | null
          start_date?: string
          status?: string
          store_id?: string | null
          total_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poultry_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poultry_batches_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      poultry_feed: {
        Row: {
          batch_id: string
          created_at: string
          daily_consumption: number
          feed_type: string
          id: string
          supplier: string | null
          total_cost: number
          usage_date: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          daily_consumption?: number
          feed_type?: string
          id?: string
          supplier?: string | null
          total_cost?: number
          usage_date?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          daily_consumption?: number
          feed_type?: string
          id?: string
          supplier?: string | null
          total_cost?: number
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "poultry_feed_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "poultry_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      poultry_production: {
        Row: {
          batch_id: string
          chickens_sold: number | null
          created_at: string
          eggs_produced: number | null
          id: string
          production_date: string
          profit: number | null
          revenue: number | null
        }
        Insert: {
          batch_id: string
          chickens_sold?: number | null
          created_at?: string
          eggs_produced?: number | null
          id?: string
          production_date?: string
          profit?: number | null
          revenue?: number | null
        }
        Update: {
          batch_id?: string
          chickens_sold?: number | null
          created_at?: string
          eggs_produced?: number | null
          id?: string
          production_date?: string
          profit?: number | null
          revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "poultry_production_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "poultry_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          new_cost_price: number | null
          new_sale_price: number | null
          old_cost_price: number | null
          old_sale_price: number | null
          product_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_cost_price?: number | null
          new_sale_price?: number | null
          old_cost_price?: number | null
          old_sale_price?: number | null
          product_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_cost_price?: number | null
          new_sale_price?: number | null
          old_cost_price?: number | null
          old_sale_price?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock: {
        Row: {
          id: string
          product_id: string
          quantity: number | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          quantity?: number | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          code: string
          cost_price: number
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          low_stock_threshold: number | null
          name: string
          sale_price: number
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          code: string
          cost_price?: number
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          low_stock_threshold?: number | null
          name: string
          sale_price?: number
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          code?: string
          cost_price?: number
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          low_stock_threshold?: number | null
          name?: string
          sale_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          commission_rate: number | null
          company_id: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          onboarding_completed: boolean | null
          phone: string | null
          shift_end: string | null
          shift_start: string | null
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          commission_rate?: number | null
          company_id?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          onboarding_completed?: boolean | null
          phone?: string | null
          shift_end?: string | null
          shift_start?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          commission_rate?: number | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          onboarding_completed?: boolean | null
          phone?: string | null
          shift_end?: string | null
          shift_start?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          received_quantity: number | null
          total: number
          unit_cost: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          received_quantity?: number | null
          total?: number
          unit_cost?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          received_quantity?: number | null
          total?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_by: string | null
          company_id: string
          created_at: string | null
          id: string
          notes: string | null
          ordered_by: string
          received_at: string | null
          status: Database["public"]["Enums"]["purchase_order_status"] | null
          store_id: string
          supplier_id: string
          total: number | null
          updated_at: string | null
        }
        Insert: {
          approved_by?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          ordered_by: string
          received_at?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"] | null
          store_id: string
          supplier_id: string
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_by?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          ordered_by?: string
          received_at?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"] | null
          store_id?: string
          supplier_id?: string
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          cost_price: number
          created_at: string | null
          discount_amount: number | null
          id: string
          product_id: string
          product_name: string
          profit: number | null
          quantity: number
          sale_id: string
          total: number
          unit_price: number
        }
        Insert: {
          cost_price?: number
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          product_id: string
          product_name: string
          profit?: number | null
          quantity?: number
          sale_id: string
          total: number
          unit_price: number
        }
        Update: {
          cost_price?: number
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          product_id?: string
          product_name?: string
          profit?: number | null
          quantity?: number
          sale_id?: string
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cash_register_id: string | null
          cost_total: number
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          profit: number
          status: Database["public"]["Enums"]["sale_status"] | null
          store_id: string
          subtotal: number
          synced: boolean | null
          total: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cash_register_id?: string | null
          cost_total?: number
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          profit?: number
          status?: Database["public"]["Enums"]["sale_status"] | null
          store_id: string
          subtotal?: number
          synced?: boolean | null
          total?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cash_register_id?: string | null
          cost_total?: number
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          profit?: number
          status?: Database["public"]["Enums"]["sale_status"] | null
          store_id?: string
          subtotal?: number
          synced?: boolean | null
          total?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjusted_by: string
          created_at: string | null
          id: string
          notes: string | null
          product_id: string
          quantity_change: number
          reason: Database["public"]["Enums"]["stock_adjustment_reason"]
          store_id: string
        }
        Insert: {
          adjusted_by: string
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity_change: number
          reason: Database["public"]["Enums"]["stock_adjustment_reason"]
          store_id: string
        }
        Update: {
          adjusted_by?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity_change?: number
          reason?: Database["public"]["Enums"]["stock_adjustment_reason"]
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          business_type: string | null
          city: string | null
          company_id: string | null
          created_at: string | null
          default_min_stock: number | null
          email: string | null
          fiscal_regime: string | null
          id: string
          is_active: boolean | null
          last_online_at: string | null
          latitude: number | null
          longitude: number | null
          name: string
          nuit: string | null
          phone: string | null
          plan: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          business_type?: string | null
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          default_min_stock?: number | null
          email?: string | null
          fiscal_regime?: string | null
          id?: string
          is_active?: boolean | null
          last_online_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          nuit?: string | null
          phone?: string | null
          plan?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          business_type?: string | null
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          default_min_stock?: number | null
          email?: string | null
          fiscal_regime?: string | null
          id?: string
          is_active?: boolean | null
          last_online_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          nuit?: string | null
          phone?: string | null
          plan?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          blocked_at: string | null
          company_id: string
          created_at: string
          current_period_end: string
          current_period_start: string
          grace_period_days: number
          id: string
          notes: string | null
          price_monthly: number
          status: Database["public"]["Enums"]["subscription_status"]
          store_id: string
          updated_at: string
        }
        Insert: {
          blocked_at?: string | null
          company_id: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          grace_period_days?: number
          id?: string
          notes?: string | null
          price_monthly?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          store_id: string
          updated_at?: string
        }
        Update: {
          blocked_at?: string | null
          company_id?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          grace_period_days?: number
          id?: string
          notes?: string | null
          price_monthly?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          company_id: string
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          phone: string | null
          total_debt: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          phone?: string | null
          total_debt?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          phone?: string | null
          total_debt?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          sale_id: string | null
          store_id: string
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          sale_id?: string | null
          store_id: string
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          sale_id?: string | null
          store_id?: string
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          company_id: string
          created_at: string
          id: string
          payment_method: string
          store_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          company_id: string
          created_at?: string
          id?: string
          payment_method: string
          store_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          company_id?: string
          created_at?: string
          id?: string
          payment_method?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      customers_safe: {
        Row: {
          address: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          full_name: string | null
          id: string | null
          notes: string | null
          phone: string | null
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: never
          full_name?: string | null
          id?: string | null
          notes?: string | null
          phone?: never
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: never
          full_name?: string | null
          id?: string | null
          notes?: string | null
          phone?: never
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_community_comment: {
        Args: { p_content: string; p_post_id: string }
        Returns: Json
      }
      bootstrap_current_user: { Args: never; Returns: undefined }
      check_subscription_status: {
        Args: { p_store_id: string }
        Returns: Database["public"]["Enums"]["subscription_status"]
      }
      complete_onboarding: {
        Args: {
          p_company_address?: string
          p_company_name: string
          p_company_nif?: string
          p_company_phone?: string
        }
        Returns: Json
      }
      credit_wallet_from_sale: {
        Args: {
          p_amount: number
          p_payment_method: string
          p_sale_id?: string
          p_store_id: string
        }
        Returns: Json
      }
      get_ceo_dashboard_stats: { Args: never; Returns: Json }
      get_sales_by_store: { Args: { p_period?: string }; Returns: Json }
      get_top_products_national: { Args: { p_limit?: number }; Returns: Json }
      get_user_company: { Args: { _user_id: string }; Returns: string }
      get_user_store: { Args: { _user_id: string }; Returns: string }
      has_completed_onboarding: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_manager_or_admin: { Args: { _user_id: string }; Returns: boolean }
      issue_fiscal_document: {
        Args: {
          p_customer_address?: string
          p_customer_email?: string
          p_customer_name: string
          p_customer_nuit?: string
          p_customer_phone?: string
          p_discount_amount?: number
          p_document_type: Database["public"]["Enums"]["fiscal_document_type"]
          p_items: Json
          p_notes?: string
          p_store_id?: string
          p_tax_rate?: number
          p_valid_until?: string
        }
        Returns: Json
      }
      notify_company_admins: {
        Args: {
          p_category?: string
          p_company_id: string
          p_link?: string
          p_message: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      notify_user: {
        Args: {
          p_category?: string
          p_link?: string
          p_message: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      process_subscription_payment: {
        Args: {
          p_payment_method: Database["public"]["Enums"]["billing_payment_method"]
          p_phone_number?: string
          p_reference_id?: string
          p_subscription_id: string
        }
        Returns: Json
      }
      set_active_store: { Args: { p_store_id: string }; Returns: Json }
      toggle_post_like: { Args: { p_post_id: string }; Returns: Json }
      transfer_between_stores: {
        Args: {
          p_amount: number
          p_from_store_id: string
          p_payment_method: string
          p_to_store_id: string
        }
        Returns: Json
      }
      validate_and_redeem_voucher: {
        Args: { p_code: string; p_store_id?: string }
        Returns: Json
      }
    }
    Enums: {
      accounting_entry_type: "revenue" | "expense" | "tax" | "transfer"
      app_role: "admin" | "manager" | "seller" | "ceo"
      billing_payment_method: "mpesa" | "emola" | "manual"
      cash_register_status: "open" | "closed"
      fiscal_document_type:
        | "quotation"
        | "proforma"
        | "invoice"
        | "invoice_receipt"
        | "receipt"
        | "credit_note"
        | "debit_note"
      payment_method: "cash" | "mpesa" | "emola" | "card" | "voucher"
      purchase_order_status:
        | "draft"
        | "pending"
        | "approved"
        | "received"
        | "cancelled"
      sale_status: "pending" | "completed" | "cancelled" | "refunded"
      stock_adjustment_reason:
        | "loss"
        | "theft"
        | "breakage"
        | "admin_adjustment"
        | "inventory_correction"
      subscription_status: "active" | "warning" | "blocked" | "cancelled"
      voucher_status: "pending" | "redeemed" | "expired" | "cancelled"
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
      accounting_entry_type: ["revenue", "expense", "tax", "transfer"],
      app_role: ["admin", "manager", "seller", "ceo"],
      billing_payment_method: ["mpesa", "emola", "manual"],
      cash_register_status: ["open", "closed"],
      fiscal_document_type: [
        "quotation",
        "proforma",
        "invoice",
        "invoice_receipt",
        "receipt",
        "credit_note",
        "debit_note",
      ],
      payment_method: ["cash", "mpesa", "emola", "card", "voucher"],
      purchase_order_status: [
        "draft",
        "pending",
        "approved",
        "received",
        "cancelled",
      ],
      sale_status: ["pending", "completed", "cancelled", "refunded"],
      stock_adjustment_reason: [
        "loss",
        "theft",
        "breakage",
        "admin_adjustment",
        "inventory_correction",
      ],
      subscription_status: ["active", "warning", "blocked", "cancelled"],
      voucher_status: ["pending", "redeemed", "expired", "cancelled"],
    },
  },
} as const
