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
      accounting_rules: {
        Row: {
          company_id: string
          created_at: string
          credit_account_id: string | null
          debit_account_id: string | null
          description: string | null
          event_type: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          event_type: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          event_type?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_rules_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_rules_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_payable: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          due_date: string
          id: string
          paid_at: string | null
          status: string
          store_id: string | null
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          description: string
          due_date: string
          id?: string
          paid_at?: string | null
          status?: string
          store_id?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string
          id?: string
          paid_at?: string | null
          status?: string
          store_id?: string | null
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_receivable: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          customer_name: string
          description: string
          document_ref: string | null
          due_date: string
          id: string
          paid_at: string | null
          status: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_name: string
          description: string
          document_ref?: string | null
          due_date: string
          id?: string
          paid_at?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_name?: string
          description?: string
          document_ref?: string | null
          due_date?: string
          id?: string
          paid_at?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_store_id_fkey"
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
      agro_orders: {
        Row: {
          cliente_contacto: string
          cliente_nome: string
          company_id: string
          created_at: string
          created_by: string | null
          delivery_status: string
          driver_id: string | null
          id: string
          payment_status: string
          preco_unitario: number
          producer_id: string
          quantidade: number
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          cliente_contacto: string
          cliente_nome: string
          company_id: string
          created_at?: string
          created_by?: string | null
          delivery_status?: string
          driver_id?: string | null
          id?: string
          payment_status?: string
          preco_unitario?: number
          producer_id: string
          quantidade?: number
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          cliente_contacto?: string
          cliente_nome?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          delivery_status?: string
          driver_id?: string | null
          id?: string
          payment_status?: string
          preco_unitario?: number
          producer_id?: string
          quantidade?: number
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agro_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agro_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agro_orders_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "agro_producers"
            referencedColumns: ["id"]
          },
        ]
      }
      agro_producers: {
        Row: {
          company_id: string
          created_at: string
          foto_url: string | null
          id: string
          latitude: number
          longitude: number
          nome_granja: string
          preco: number
          quantidade_disponivel: number
          status: string
          telefone: string | null
          tipo_produto: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          foto_url?: string | null
          id?: string
          latitude: number
          longitude: number
          nome_granja: string
          preco?: number
          quantidade_disponivel?: number
          status?: string
          telefone?: string | null
          tipo_produto?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          foto_url?: string | null
          id?: string
          latitude?: number
          longitude?: number
          nome_granja?: string
          preco?: number
          quantidade_disponivel?: number
          status?: string
          telefone?: string | null
          tipo_produto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agro_producers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          absences: number | null
          check_in: string | null
          check_out: string | null
          company_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          hours_worked: number | null
          id: string
          late_minutes: number | null
          notes: string | null
          overtime_hours: number | null
          record_date: string
          status: string
          updated_at: string
        }
        Insert: {
          absences?: number | null
          check_in?: string | null
          check_out?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          hours_worked?: number | null
          id?: string
          late_minutes?: number | null
          notes?: string | null
          overtime_hours?: number | null
          record_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          absences?: number | null
          check_in?: string | null
          check_out?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          hours_worked?: number | null
          id?: string
          late_minutes?: number | null
          notes?: string | null
          overtime_hours?: number | null
          record_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_type: string
          code: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string
          code: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string
          code?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
        ]
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
          country: string | null
          created_at: string | null
          email: string | null
          fiscal_rate: number | null
          fiscal_regime: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          nif: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          fiscal_rate?: number | null
          fiscal_regime?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          nif?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          fiscal_rate?: number | null
          fiscal_regime?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          nif?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      compradores: {
        Row: {
          capacidade_compra: number | null
          company_id: string
          confiabilidade: number | null
          created_at: string | null
          created_by: string | null
          distrito: string | null
          email: string | null
          forma_pagamento: string | null
          frequencia_compra: string | null
          id: string
          latitude: number | null
          localizacao: string | null
          longitude: number | null
          nome: string
          peso_max: number | null
          peso_min: number | null
          prazo_pagamento: string | null
          preco_alvo: number | null
          preferencia_tipo: string | null
          provincia: string | null
          status: string | null
          telefone: string | null
          telefone_alt: string | null
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          capacidade_compra?: number | null
          company_id: string
          confiabilidade?: number | null
          created_at?: string | null
          created_by?: string | null
          distrito?: string | null
          email?: string | null
          forma_pagamento?: string | null
          frequencia_compra?: string | null
          id?: string
          latitude?: number | null
          localizacao?: string | null
          longitude?: number | null
          nome: string
          peso_max?: number | null
          peso_min?: number | null
          prazo_pagamento?: string | null
          preco_alvo?: number | null
          preferencia_tipo?: string | null
          provincia?: string | null
          status?: string | null
          telefone?: string | null
          telefone_alt?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          capacidade_compra?: number | null
          company_id?: string
          confiabilidade?: number | null
          created_at?: string | null
          created_by?: string | null
          distrito?: string | null
          email?: string | null
          forma_pagamento?: string | null
          frequencia_compra?: string | null
          id?: string
          latitude?: number | null
          localizacao?: string | null
          longitude?: number | null
          nome?: string
          peso_max?: number | null
          peso_min?: number | null
          prazo_pagamento?: string | null
          preco_alvo?: number | null
          preferencia_tipo?: string | null
          provincia?: string | null
          status?: string | null
          telefone?: string | null
          telefone_alt?: string | null
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compradores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      criadores: {
        Row: {
          bi_nuit: string | null
          capacidade: number | null
          company_id: string
          confiabilidade: number | null
          consumo_racao: string | null
          created_at: string
          created_by: string | null
          cria_sozinho: boolean | null
          data_prevista_venda: string | null
          desafios: string | null
          distrito: string | null
          email: string | null
          experiencia_anos: number | null
          fonte_agua: string | null
          fonte_energia: string | null
          forma_pagamento: string | null
          fornecedor_pintos: string | null
          fornecedor_racao: string | null
          id: string
          latitude: number | null
          localidade: string | null
          longitude: number | null
          mercados_atuais: string | null
          nome: string
          num_trabalhadores: number | null
          peso_medio: number | null
          plano_mensal: string | null
          plano_quinzenal: string | null
          plano_semanal: string | null
          precisa_tecnico: boolean | null
          preco_medio: number | null
          provincia: string | null
          saldo: number | null
          status: string | null
          telefone: string | null
          telefone_alt: string | null
          tem_mercado: boolean | null
          tipo_instalacao: string | null
          tipo_producao: string | null
          updated_at: string
          wallet_id: string | null
        }
        Insert: {
          bi_nuit?: string | null
          capacidade?: number | null
          company_id: string
          confiabilidade?: number | null
          consumo_racao?: string | null
          created_at?: string
          created_by?: string | null
          cria_sozinho?: boolean | null
          data_prevista_venda?: string | null
          desafios?: string | null
          distrito?: string | null
          email?: string | null
          experiencia_anos?: number | null
          fonte_agua?: string | null
          fonte_energia?: string | null
          forma_pagamento?: string | null
          fornecedor_pintos?: string | null
          fornecedor_racao?: string | null
          id?: string
          latitude?: number | null
          localidade?: string | null
          longitude?: number | null
          mercados_atuais?: string | null
          nome: string
          num_trabalhadores?: number | null
          peso_medio?: number | null
          plano_mensal?: string | null
          plano_quinzenal?: string | null
          plano_semanal?: string | null
          precisa_tecnico?: boolean | null
          preco_medio?: number | null
          provincia?: string | null
          saldo?: number | null
          status?: string | null
          telefone?: string | null
          telefone_alt?: string | null
          tem_mercado?: boolean | null
          tipo_instalacao?: string | null
          tipo_producao?: string | null
          updated_at?: string
          wallet_id?: string | null
        }
        Update: {
          bi_nuit?: string | null
          capacidade?: number | null
          company_id?: string
          confiabilidade?: number | null
          consumo_racao?: string | null
          created_at?: string
          created_by?: string | null
          cria_sozinho?: boolean | null
          data_prevista_venda?: string | null
          desafios?: string | null
          distrito?: string | null
          email?: string | null
          experiencia_anos?: number | null
          fonte_agua?: string | null
          fonte_energia?: string | null
          forma_pagamento?: string | null
          fornecedor_pintos?: string | null
          fornecedor_racao?: string | null
          id?: string
          latitude?: number | null
          localidade?: string | null
          longitude?: number | null
          mercados_atuais?: string | null
          nome?: string
          num_trabalhadores?: number | null
          peso_medio?: number | null
          plano_mensal?: string | null
          plano_quinzenal?: string | null
          plano_semanal?: string | null
          precisa_tecnico?: boolean | null
          preco_medio?: number | null
          provincia?: string | null
          saldo?: number | null
          status?: string | null
          telefone?: string | null
          telefone_alt?: string | null
          tem_mercado?: boolean | null
          tipo_instalacao?: string | null
          tipo_producao?: string | null
          updated_at?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "criadores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      dados_climaticos: {
        Row: {
          batch_id: string | null
          chuva: number | null
          company_id: string
          created_at: string
          data: string
          descricao: string | null
          fonte: string | null
          humidade: number | null
          icone: string | null
          id: string
          pressao: number | null
          temperatura: number | null
          vento: number | null
        }
        Insert: {
          batch_id?: string | null
          chuva?: number | null
          company_id: string
          created_at?: string
          data?: string
          descricao?: string | null
          fonte?: string | null
          humidade?: number | null
          icone?: string | null
          id?: string
          pressao?: number | null
          temperatura?: number | null
          vento?: number | null
        }
        Update: {
          batch_id?: string | null
          chuva?: number | null
          company_id?: string
          created_at?: string
          data?: string
          descricao?: string | null
          fonte?: string | null
          humidade?: number | null
          icone?: string | null
          id?: string
          pressao?: number | null
          temperatura?: number | null
          vento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dados_climaticos_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "poultry_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_climaticos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      dados_satelite: {
        Row: {
          batch_id: string | null
          company_id: string
          created_at: string
          data: string
          evapotranspiracao: number | null
          fonte: string | null
          id: string
          indice_stress: number | null
          ndvi: number | null
          radiacao_solar: number | null
          temperatura_solo: number | null
        }
        Insert: {
          batch_id?: string | null
          company_id: string
          created_at?: string
          data?: string
          evapotranspiracao?: number | null
          fonte?: string | null
          id?: string
          indice_stress?: number | null
          ndvi?: number | null
          radiacao_solar?: number | null
          temperatura_solo?: number | null
        }
        Update: {
          batch_id?: string | null
          company_id?: string
          created_at?: string
          data?: string
          evapotranspiracao?: number | null
          fonte?: string | null
          id?: string
          indice_stress?: number | null
          ndvi?: number | null
          radiacao_solar?: number | null
          temperatura_solo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dados_satelite_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "poultry_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_satelite_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_drivers: {
        Row: {
          company_id: string
          created_at: string
          id: string
          nome: string
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          nome: string
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          nome?: string
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_drivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          commission_rate: number
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
          commission_rate?: number
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
          commission_rate?: number
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
      expenses: {
        Row: {
          amount: number
          category: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          receipt_url: string | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          receipt_url?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          receipt_url?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_scores: {
        Row: {
          company_id: string
          created_at: string
          details: Json | null
          expenses: number
          id: string
          period_month: number
          period_year: number
          profit: number
          revenue: number
          score: number
          taxes_paid_on_time: number
          taxes_total: number
        }
        Insert: {
          company_id: string
          created_at?: string
          details?: Json | null
          expenses?: number
          id?: string
          period_month: number
          period_year: number
          profit?: number
          revenue?: number
          score?: number
          taxes_paid_on_time?: number
          taxes_total?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          details?: Json | null
          expenses?: number
          id?: string
          period_month?: number
          period_year?: number
          profit?: number
          revenue?: number
          score?: number
          taxes_paid_on_time?: number
          taxes_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          payment_method: string | null
          reference_id: string | null
          reference_type: string | null
          status: string
          store_id: string | null
          transaction_date: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          store_id?: string | null
          transaction_date?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          payment_method?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          store_id?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_store_id_fkey"
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
      insights_ia: {
        Row: {
          batch_id: string | null
          company_id: string
          created_at: string | null
          dados: Json | null
          id: string
          is_read: boolean | null
          mensagem: string
          nivel: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          batch_id?: string | null
          company_id: string
          created_at?: string | null
          dados?: Json | null
          id?: string
          is_read?: boolean | null
          mensagem: string
          nivel?: string
          tipo?: string
          updated_at?: string | null
        }
        Update: {
          batch_id?: string | null
          company_id?: string
          created_at?: string | null
          dados?: Json | null
          id?: string
          is_read?: boolean | null
          mensagem?: string
          nivel?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insights_ia_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "poultry_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_ia_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          entry_number: number
          id: string
          reference: string | null
          reference_id: string | null
          reference_type: string | null
          status: string
          total_credit: number
          total_debit: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description: string
          entry_date?: string
          entry_number?: number
          id?: string
          reference?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          entry_number?: number
          id?: string
          reference?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string
          total_credit?: number
          total_debit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          id: string
          journal_entry_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_payments: {
        Row: {
          amount: number
          company_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          fraud_flag: boolean
          fraud_reason: string | null
          id: string
          phone: string
          proof_image_url: string | null
          provider: string
          reference: string
          rejection_reason: string | null
          risk_score: number
          sale_id: string | null
          status: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          company_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          fraud_flag?: boolean
          fraud_reason?: string | null
          id?: string
          phone: string
          proof_image_url?: string | null
          provider: string
          reference: string
          rejection_reason?: string | null
          risk_score?: number
          sale_id?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          fraud_flag?: boolean
          fraud_reason?: string | null
          id?: string
          phone?: string
          proof_image_url?: string | null
          provider?: string
          reference?: string
          rejection_reason?: string | null
          risk_score?: number
          sale_id?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_payments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_matches: {
        Row: {
          company_id: string
          comprador_id: string
          created_at: string | null
          criador_id: string
          id: string
          pedido_id: string | null
          score: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          comprador_id: string
          created_at?: string | null
          criador_id: string
          id?: string
          pedido_id?: string | null
          score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          comprador_id?: string
          created_at?: string | null
          criador_id?: string
          id?: string
          pedido_id?: string | null
          score?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_matches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_matches_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "compradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_matches_criador_id_fkey"
            columns: ["criador_id"]
            isOneToOne: false
            referencedRelation: "criadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_matches_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_features: {
        Row: {
          batch_id: string
          company_id: string
          consumo_racao: number | null
          created_at: string | null
          custo_acumulado: number | null
          data: string
          id: string
          idade_dias: number
          lucro_final: number | null
          mortalidade: number | null
          peso_final: number | null
          peso_medio: number | null
          receita_parcial: number | null
        }
        Insert: {
          batch_id: string
          company_id: string
          consumo_racao?: number | null
          created_at?: string | null
          custo_acumulado?: number | null
          data?: string
          id?: string
          idade_dias?: number
          lucro_final?: number | null
          mortalidade?: number | null
          peso_final?: number | null
          peso_medio?: number | null
          receita_parcial?: number | null
        }
        Update: {
          batch_id?: string
          company_id?: string
          consumo_racao?: number | null
          created_at?: string | null
          custo_acumulado?: number | null
          data?: string
          id?: string
          idade_dias?: number
          lucro_final?: number | null
          mortalidade?: number | null
          peso_final?: number | null
          peso_medio?: number | null
          receita_parcial?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_features_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "poultry_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_features_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      obligation_documents: {
        Row: {
          alert_level: string | null
          company_id: string
          created_at: string
          expiration_date: string | null
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          last_alert_sent_at: string | null
          notes: string | null
          obligation_id: string
          uploaded_by: string | null
        }
        Insert: {
          alert_level?: string | null
          company_id: string
          created_at?: string
          expiration_date?: string | null
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          last_alert_sent_at?: string | null
          notes?: string | null
          obligation_id: string
          uploaded_by?: string | null
        }
        Update: {
          alert_level?: string | null
          company_id?: string
          created_at?: string
          expiration_date?: string | null
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          last_alert_sent_at?: string | null
          notes?: string | null
          obligation_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligation_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligation_documents_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "obligations"
            referencedColumns: ["id"]
          },
        ]
      }
      obligations: {
        Row: {
          amount: number | null
          company_id: string
          created_at: string
          created_by: string | null
          due_date: string
          frequency: string
          id: string
          name: string
          notes: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          company_id: string
          created_at?: string
          created_by?: string | null
          due_date: string
          frequency?: string
          id?: string
          name: string
          notes?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string
          frequency?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obligations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string | null
          error_message: string | null
          http_status: number | null
          id: string
          ip_address: string | null
          provider: string
          request_payload: Json | null
          response_payload: Json | null
          status: string | null
          transaction_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          ip_address?: string | null
          provider: string
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string | null
          transaction_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          ip_address?: string | null
          provider?: string
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          id: string
          last_checked_at: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["billing_payment_method"]
          phone_number: string | null
          provider_response: Json | null
          provider_transaction_id: string | null
          reference_id: string | null
          retry_count: number | null
          status: string
          subscription_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          paid_at?: string | null
          payment_method: Database["public"]["Enums"]["billing_payment_method"]
          phone_number?: string | null
          provider_response?: Json | null
          provider_transaction_id?: string | null
          reference_id?: string | null
          retry_count?: number | null
          status?: string
          subscription_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          last_checked_at?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["billing_payment_method"]
          phone_number?: string | null
          provider_response?: Json | null
          provider_transaction_id?: string | null
          reference_id?: string | null
          retry_count?: number | null
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
      payouts: {
        Row: {
          amount: number
          bank_account: string | null
          company_id: string
          created_at: string
          created_by: string | null
          fee_amount: number
          id: string
          net_amount: number
          notes: string | null
          payment_method: string
          phone_number: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          bank_account?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          fee_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          payment_method?: string
          phone_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          fee_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          payment_method?: string
          phone_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_store_id_fkey"
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
      pedidos_marketplace: {
        Row: {
          company_id: string
          comprador_id: string
          created_at: string | null
          created_by: string | null
          data_entrega: string | null
          id: string
          peso_desejado: number | null
          preco_oferecido: number | null
          quantidade: number | null
          status: string | null
          tipo_producao: string | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          comprador_id: string
          created_at?: string | null
          created_by?: string | null
          data_entrega?: string | null
          id?: string
          peso_desejado?: number | null
          preco_oferecido?: number | null
          quantidade?: number | null
          status?: string | null
          tipo_producao?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          comprador_id?: string
          created_at?: string | null
          created_by?: string | null
          data_entrega?: string | null
          id?: string
          peso_desejado?: number | null
          preco_oferecido?: number | null
          quantidade?: number | null
          status?: string | null
          tipo_producao?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_marketplace_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_marketplace_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "compradores"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_fees: {
        Row: {
          created_at: string
          fee_fixed: number
          fee_percentage: number
          fee_type: string
          id: string
          is_active: boolean
          max_amount: number | null
          min_amount: number
          provider: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee_fixed?: number
          fee_percentage?: number
          fee_type?: string
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number
          provider?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee_fixed?: number
          fee_percentage?: number
          fee_type?: string
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number
          provider?: string | null
          updated_at?: string
        }
        Relationships: []
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
      poultry_daily_records: {
        Row: {
          avg_weight_kg: number | null
          batch_id: string
          company_id: string
          created_at: string
          created_by: string | null
          feed_consumed_kg: number | null
          humidity_percent: number | null
          id: string
          mortality_count: number
          observations: string | null
          record_date: string
          temperature_celsius: number | null
          water_consumed_liters: number | null
        }
        Insert: {
          avg_weight_kg?: number | null
          batch_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          feed_consumed_kg?: number | null
          humidity_percent?: number | null
          id?: string
          mortality_count?: number
          observations?: string | null
          record_date?: string
          temperature_celsius?: number | null
          water_consumed_liters?: number | null
        }
        Update: {
          avg_weight_kg?: number | null
          batch_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          feed_consumed_kg?: number | null
          humidity_percent?: number | null
          id?: string
          mortality_count?: number
          observations?: string | null
          record_date?: string
          temperature_celsius?: number | null
          water_consumed_liters?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "poultry_daily_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "poultry_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poultry_daily_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      poultry_inputs: {
        Row: {
          balance: number | null
          batch_id: string
          company_id: string
          created_at: string
          created_by: string | null
          entry_date: string
          id: string
          input_type: string
          low_stock_threshold: number | null
          name: string
          notes: string | null
          quantity_received: number
          quantity_used: number
          supplier: string | null
          total_cost: number | null
          unit: string
          unit_cost: number
          updated_at: string
          usage_date: string | null
        }
        Insert: {
          balance?: number | null
          batch_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          input_type?: string
          low_stock_threshold?: number | null
          name: string
          notes?: string | null
          quantity_received?: number
          quantity_used?: number
          supplier?: string | null
          total_cost?: number | null
          unit?: string
          unit_cost?: number
          updated_at?: string
          usage_date?: string | null
        }
        Update: {
          balance?: number | null
          batch_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          input_type?: string
          low_stock_threshold?: number | null
          name?: string
          notes?: string | null
          quantity_received?: number
          quantity_used?: number
          supplier?: string | null
          total_cost?: number | null
          unit?: string
          unit_cost?: number
          updated_at?: string
          usage_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poultry_inputs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "poultry_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poultry_inputs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      poultry_operational_costs: {
        Row: {
          amount: number
          batch_id: string
          company_id: string
          cost_date: string
          cost_type: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          notes: string | null
          quantity: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          batch_id: string
          company_id: string
          cost_date?: string
          cost_type?: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          notes?: string | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          batch_id?: string
          company_id?: string
          cost_date?: string
          cost_type?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          notes?: string | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poultry_operational_costs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "poultry_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poultry_operational_costs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          company_id: string | null
          cost_price: number
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          last_sale_date: string | null
          low_stock_threshold: number | null
          max_stock: number | null
          min_stock: number | null
          name: string
          reorder_point: number | null
          sale_price: number
          updated_at: string | null
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          code: string
          company_id?: string | null
          cost_price?: number
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          last_sale_date?: string | null
          low_stock_threshold?: number | null
          max_stock?: number | null
          min_stock?: number | null
          name: string
          reorder_point?: number | null
          sale_price?: number
          updated_at?: string | null
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          code?: string
          company_id?: string | null
          cost_price?: number
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          last_sale_date?: string | null
          low_stock_threshold?: number | null
          max_stock?: number | null
          min_stock?: number | null
          name?: string
          reorder_point?: number | null
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
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      referral_logs: {
        Row: {
          company_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          referral_code: string | null
          referred_user_id: string | null
          reseller_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          referral_code?: string | null
          referred_user_id?: string | null
          reseller_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          referral_code?: string | null
          referred_user_id?: string | null
          reseller_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_logs_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_signups: {
        Row: {
          company_id: string | null
          converted_at: string | null
          created_at: string
          id: string
          metadata: Json
          referral_code: string
          referred_email: string | null
          referred_user_id: string | null
          reseller_id: string
          status: Database["public"]["Enums"]["referral_signup_status"]
        }
        Insert: {
          company_id?: string | null
          converted_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          referral_code: string
          referred_email?: string | null
          referred_user_id?: string | null
          reseller_id: string
          status?: Database["public"]["Enums"]["referral_signup_status"]
        }
        Update: {
          company_id?: string | null
          converted_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          referral_code?: string
          referred_email?: string | null
          referred_user_id?: string | null
          reseller_id?: string
          status?: Database["public"]["Enums"]["referral_signup_status"]
        }
        Relationships: [
          {
            foreignKeyName: "referral_signups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_signups_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_clients: {
        Row: {
          company_id: string
          created_at: string
          id: string
          primary_contact_email: string | null
          referral_signup_id: string | null
          reseller_id: string
          status: string
          total_commission_generated: number
          total_commission_paid: number
          total_revenue: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          primary_contact_email?: string | null
          referral_signup_id?: string | null
          reseller_id: string
          status?: string
          total_commission_generated?: number
          total_commission_paid?: number
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          primary_contact_email?: string | null
          referral_signup_id?: string | null
          reseller_id?: string
          status?: string
          total_commission_generated?: number
          total_commission_paid?: number
          total_revenue?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_clients_referral_signup_id_fkey"
            columns: ["referral_signup_id"]
            isOneToOne: true
            referencedRelation: "referral_signups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_clients_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_commissions: {
        Row: {
          commission_amount: number
          commission_rate: number
          company_id: string
          created_at: string
          id: string
          paid_at: string | null
          payment_amount: number
          payment_transaction_id: string
          reseller_client_id: string | null
          reseller_id: string
          status: Database["public"]["Enums"]["reseller_commission_status"]
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          commission_amount: number
          commission_rate?: number
          company_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_amount: number
          payment_transaction_id: string
          reseller_client_id?: string | null
          reseller_id: string
          status?: Database["public"]["Enums"]["reseller_commission_status"]
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          company_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_amount?: number
          payment_transaction_id?: string
          reseller_client_id?: string | null
          reseller_id?: string
          status?: Database["public"]["Enums"]["reseller_commission_status"]
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_commissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_commissions_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: true
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_commissions_reseller_client_id_fkey"
            columns: ["reseller_client_id"]
            isOneToOne: false
            referencedRelation: "reseller_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_commissions_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_commissions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_materials: {
        Row: {
          asset_url: string | null
          content_text: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          material_type: Database["public"]["Enums"]["reseller_material_type"]
          title: string
          updated_at: string
        }
        Insert: {
          asset_url?: string | null
          content_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          material_type: Database["public"]["Enums"]["reseller_material_type"]
          title: string
          updated_at?: string
        }
        Update: {
          asset_url?: string | null
          content_text?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          material_type?: Database["public"]["Enums"]["reseller_material_type"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reseller_payout_items: {
        Row: {
          commission_id: string
          created_at: string
          id: string
          payout_id: string
        }
        Insert: {
          commission_id: string
          created_at?: string
          id?: string
          payout_id: string
        }
        Update: {
          commission_id?: string
          created_at?: string
          id?: string
          payout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_payout_items_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: true
            referencedRelation: "reseller_commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_payout_items_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "reseller_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_payouts: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string
          reference: string | null
          reseller_id: string
          status: Database["public"]["Enums"]["reseller_payout_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method: string
          reference?: string | null
          reseller_id: string
          status?: Database["public"]["Enums"]["reseller_payout_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string
          reference?: string | null
          reseller_id?: string
          status?: Database["public"]["Enums"]["reseller_payout_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_payouts_reseller_id_fkey"
            columns: ["reseller_id"]
            isOneToOne: false
            referencedRelation: "resellers"
            referencedColumns: ["id"]
          },
        ]
      }
      resellers: {
        Row: {
          city: string | null
          country: string
          created_at: string
          document_id: string | null
          email: string
          full_name: string
          id: string
          phone: string
          profile_id: string | null
          referral_code: string
          status: Database["public"]["Enums"]["reseller_status"]
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string
          created_at?: string
          document_id?: string | null
          email: string
          full_name: string
          id?: string
          phone: string
          profile_id?: string | null
          referral_code?: string
          status?: Database["public"]["Enums"]["reseller_status"]
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string
          created_at?: string
          document_id?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string
          profile_id?: string | null
          referral_code?: string
          status?: Database["public"]["Enums"]["reseller_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resellers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          cost_price: number
          created_at: string | null
          discount_amount: number | null
          id: string
          product_id: string | null
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
          product_id?: string | null
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
          product_id?: string | null
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
          seller_name: string | null
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
          seller_name?: string | null
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
          seller_name?: string | null
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
      sales_targets: {
        Row: {
          company_id: string
          created_at: string
          current_amount: number
          id: string
          period_end: string
          period_start: string
          salesman_id: string
          status: string
          target_amount: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          current_amount?: number
          id?: string
          period_end: string
          period_start: string
          salesman_id: string
          status?: string
          target_amount?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          current_amount?: number
          id?: string
          period_end?: string
          period_start?: string
          salesman_id?: string
          status?: string
          target_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_targets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      salesman_commissions: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          id: string
          percentage: number
          sale_id: string | null
          salesman_id: string
          status: string
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          id?: string
          percentage?: number
          sale_id?: string | null
          salesman_id: string
          status?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          percentage?: number
          sale_id?: string | null
          salesman_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "salesman_commissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      salesman_stock: {
        Row: {
          company_id: string
          id: string
          product_id: string
          quantity: number
          salesman_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          id?: string
          product_id: string
          quantity?: number
          salesman_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          id?: string
          product_id?: string
          quantity?: number
          salesman_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salesman_stock_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salesman_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_payments: {
        Row: {
          amount: number
          category: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          destination_info: string | null
          destination_phone: string | null
          frequency: string
          id: string
          is_active: boolean
          last_run_at: string | null
          next_run_at: string
          payment_method: string
          store_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description: string
          destination_info?: string | null
          destination_phone?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at: string
          payment_method?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          destination_info?: string | null
          destination_phone?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          next_run_at?: string
          payment_method?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_payments_store_id_fkey"
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
      stock_alerts: {
        Row: {
          company_id: string
          created_at: string
          id: string
          message: string
          product_id: string
          resolved_at: string | null
          status: string
          store_id: string
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          message: string
          product_id: string
          resolved_at?: string | null
          status?: string
          store_id: string
          type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          message?: string
          product_id?: string
          resolved_at?: string | null
          status?: string
          store_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          device: string | null
          id: string
          ip_address: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          salesman_id: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          device?: string | null
          id?: string
          ip_address?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          salesman_id: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          device?: string | null
          id?: string
          ip_address?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          salesman_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          new_stock: number
          previous_stock: number
          product_id: string
          quantity: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          store_id: string
          total_cost: number
          type: string
          unit_cost: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_stock?: number
          previous_stock?: number
          product_id: string
          quantity: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          store_id: string
          total_cost?: number
          type: string
          unit_cost?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          new_stock?: number
          previous_stock?: number
          product_id?: string
          quantity?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string
          total_cost?: number
          type?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_reconciliation: {
        Row: {
          actual_stock: number
          company_id: string
          created_at: string
          created_by: string | null
          difference: number
          expected_stock: number
          id: string
          notes: string | null
          product_id: string
          salesman_id: string
          status: string
        }
        Insert: {
          actual_stock?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          difference?: number
          expected_stock?: number
          id?: string
          notes?: string | null
          product_id: string
          salesman_id: string
          status?: string
        }
        Update: {
          actual_stock?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          difference?: number
          expected_stock?: number
          id?: string
          notes?: string | null
          product_id?: string
          salesman_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_reconciliation_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfer_items: {
        Row: {
          id: string
          product_id: string
          quantity: number
          transfer_id: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity: number
          transfer_id: string
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfer_items_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "stock_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          company_id: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          from_admin_id: string
          id: string
          notes: string | null
          status: string
          to_salesman_id: string
        }
        Insert: {
          company_id: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          from_admin_id: string
          id?: string
          notes?: string | null
          status?: string
          to_salesman_id: string
        }
        Update: {
          company_id?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          from_admin_id?: string
          id?: string
          notes?: string | null
          status?: string
          to_salesman_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          max_products: number
          max_sellers: number
          max_stores: number
          notes: string | null
          plan_tier: Database["public"]["Enums"]["plan_tier"]
          price_monthly: number
          status: Database["public"]["Enums"]["subscription_status"]
          store_id: string
          trial_ends_at: string | null
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
          max_products?: number
          max_sellers?: number
          max_stores?: number
          notes?: string | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          price_monthly?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          store_id: string
          trial_ends_at?: string | null
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
          max_products?: number
          max_sellers?: number
          max_stores?: number
          notes?: string | null
          plan_tier?: Database["public"]["Enums"]["plan_tier"]
          price_monthly?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          store_id?: string
          trial_ends_at?: string | null
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
      system_alerts: {
        Row: {
          company_id: string
          created_at: string
          id: string
          message: string
          product_id: string | null
          salesman_id: string | null
          status: string
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          message: string
          product_id?: string | null
          salesman_id?: string | null
          status?: string
          type?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          message?: string
          product_id?: string | null
          salesman_id?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_audit_logs: {
        Row: {
          action_taken: string | null
          check_name: string
          created_at: string
          details: Json | null
          id: string
          message: string
          module: string
          severity: string
          status: string
        }
        Insert: {
          action_taken?: string | null
          check_name: string
          created_at?: string
          details?: Json | null
          id?: string
          message: string
          module: string
          severity?: string
          status?: string
        }
        Update: {
          action_taken?: string | null
          check_name?: string
          created_at?: string
          details?: Json | null
          id?: string
          message?: string
          module?: string
          severity?: string
          status?: string
        }
        Relationships: []
      }
      tax_calculations: {
        Row: {
          base_amount: number
          company_id: string
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          status: string
          tax_amount: number
          tax_rate: number
          tax_type: string
          updated_at: string
        }
        Insert: {
          base_amount?: number
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          status?: string
          tax_amount?: number
          tax_rate?: number
          tax_type: string
          updated_at?: string
        }
        Update: {
          base_amount?: number
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          status?: string
          tax_amount?: number
          tax_rate?: number
          tax_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_calculations_company_id_fkey"
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
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          fee_amount: number | null
          id: string
          net_amount: number | null
          provider: string | null
          reference: string | null
          sale_id: string | null
          store_id: string
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fee_amount?: number | null
          id?: string
          net_amount?: number | null
          provider?: string | null
          reference?: string | null
          sale_id?: string | null
          store_id: string
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          fee_amount?: number | null
          id?: string
          net_amount?: number | null
          provider?: string | null
          reference?: string | null
          sale_id?: string | null
          store_id?: string
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
      capture_referral_for_user: {
        Args: {
          _email: string
          _metadata?: Json
          _referral_code: string
          _user_id: string
        }
        Returns: undefined
      }
      check_subscription_status: {
        Args: { p_store_id: string }
        Returns: Database["public"]["Enums"]["subscription_status"]
      }
      collect_ml_features: { Args: { p_batch_id: string }; Returns: undefined }
      complete_onboarding: {
        Args: {
          p_company_address?: string
          p_company_name: string
          p_company_nif?: string
          p_company_phone?: string
        }
        Returns: undefined
      }
      confirm_manual_payment: {
        Args: { p_confirmed_by: string; p_payment_id: string }
        Returns: Json
      }
      confirm_stock_transfer: { Args: { p_transfer_id: string }; Returns: Json }
      create_journal_entry: {
        Args: {
          p_description: string
          p_entry_date?: string
          p_lines: Json
          p_reference?: string
          p_reference_id?: string
          p_reference_type?: string
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
      decrement_product_stock: {
        Args: { p_product_id: string; p_quantity: number; p_store_id: string }
        Returns: undefined
      }
      evaluate_environmental_alerts: {
        Args: { p_company_id: string }
        Returns: number
      }
      evaluate_payment_fraud: { Args: { p_payment_id: string }; Returns: Json }
      evaluate_poultry_insights: {
        Args: { p_batch_id: string }
        Returns: number
      }
      evaluate_stock_alerts: { Args: { p_store_id: string }; Returns: Json }
      force_confirm_stock_transfer: {
        Args: { p_transfer_id: string }
        Returns: Json
      }
      generate_nava_reference: { Args: never; Returns: string }
      generate_reseller_code: { Args: never; Returns: string }
      get_ceo_dashboard_stats: { Args: never; Returns: Json }
      get_platform_stats: { Args: never; Returns: Json }
      get_reseller_id: { Args: { _user_id: string }; Returns: string }
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
      is_reseller: { Args: { _user_id: string }; Returns: boolean }
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
      link_referral_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: undefined
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
      place_agro_order: {
        Args: {
          p_cliente_contacto: string
          p_cliente_nome: string
          p_company_id: string
          p_created_by?: string
          p_producer_id: string
          p_quantidade: number
        }
        Returns: Json
      }
      process_nava_payment: {
        Args: {
          p_amount: number
          p_description?: string
          p_payment_method: string
          p_provider?: string
          p_reference?: string
          p_store_id: string
        }
        Returns: Json
      }
      process_reseller_commission: {
        Args: { _payment_transaction_id: string }
        Returns: undefined
      }
      process_subscription_payment: {
        Args: {
          p_payment_method: Database["public"]["Enums"]["billing_payment_method"]
          p_phone_number?: string
          p_reference_id: string
          p_subscription_id: string
        }
        Returns: Json
      }
      record_stock_movement: {
        Args: {
          p_product_id: string
          p_quantity: number
          p_reason?: string
          p_reference_id?: string
          p_reference_type?: string
          p_store_id: string
          p_type: string
          p_unit_cost?: number
        }
        Returns: Json
      }
      reject_manual_payment: {
        Args: { p_payment_id: string; p_reason?: string; p_rejected_by: string }
        Returns: Json
      }
      request_payout: {
        Args: {
          p_amount: number
          p_payment_method?: string
          p_phone_number?: string
          p_store_id: string
        }
        Returns: Json
      }
      run_stock_reconciliation: {
        Args: { p_salesman_id: string }
        Returns: Json
      }
      seed_chart_of_accounts: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      set_active_store: { Args: { p_store_id: string }; Returns: Json }
      sync_company_subscription_pricing: {
        Args: { p_company_id: string }
        Returns: undefined
      }
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
      update_agro_order_status: {
        Args: { p_new_status: string; p_order_id: string }
        Returns: Json
      }
      validate_and_redeem_voucher: {
        Args: { p_code: string; p_store_id?: string }
        Returns: Json
      }
    }
    Enums: {
      accounting_entry_type: "revenue" | "expense" | "tax" | "transfer"
      app_role:
        | "admin"
        | "manager"
        | "seller"
        | "ceo"
        | "reseller"
        | "director"
        | "hr"
        | "cashier"
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
      plan_tier: "starter" | "pro" | "enterprise"
      purchase_order_status:
        | "draft"
        | "pending"
        | "approved"
        | "received"
        | "cancelled"
      referral_signup_status: "captured" | "converted"
      reseller_commission_status: "pending" | "paid" | "cancelled"
      reseller_material_type:
        | "presentation"
        | "video"
        | "image"
        | "sales_copy"
        | "manual"
      reseller_payout_status: "pending" | "paid"
      reseller_status: "active" | "suspended"
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
      app_role: [
        "admin",
        "manager",
        "seller",
        "ceo",
        "reseller",
        "director",
        "hr",
        "cashier",
      ],
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
      plan_tier: ["starter", "pro", "enterprise"],
      purchase_order_status: [
        "draft",
        "pending",
        "approved",
        "received",
        "cancelled",
      ],
      referral_signup_status: ["captured", "converted"],
      reseller_commission_status: ["pending", "paid", "cancelled"],
      reseller_material_type: [
        "presentation",
        "video",
        "image",
        "sales_copy",
        "manual",
      ],
      reseller_payout_status: ["pending", "paid"],
      reseller_status: ["active", "suspended"],
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
