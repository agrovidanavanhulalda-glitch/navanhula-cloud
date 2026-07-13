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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          company_id: string | null
          created_by: string | null
          id: string
          store_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_by?: string | null
          id?: string
          store_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_by?: string | null
          id?: string
          store_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_store_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: string | null
          cost: number
          created_at: string
          created_by: string | null
          crop_id: string
          id: string
          input_type: string
          name: string
          quantity: number
          usage_date: string
        }
        Insert: {
          company_id?: string | null
          cost?: number
          created_at?: string
          created_by?: string | null
          crop_id: string
          id?: string
          input_type?: string
          name: string
          quantity?: number
          usage_date?: string
        }
        Update: {
          company_id?: string | null
          cost?: number
          created_at?: string
          created_by?: string | null
          crop_id?: string
          id?: string
          input_type?: string
          name?: string
          quantity?: number
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "agro_inputs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
      alerts: {
        Row: {
          alert_type: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          message: string
          related_entity_id: string | null
          related_entity_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          rule_id: string | null
          severity: string
          status: string
          store_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          severity?: string
          status?: string
          store_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          rule_id?: string | null
          severity?: string
          status?: string
          store_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: Json
          rate_limit: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          permissions?: Json
          rate_limit?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: Json
          rate_limit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_logs: {
        Row: {
          api_key_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          endpoint: string
          id: string
          ip_address: string | null
          method: string
          response_time_ms: number | null
          status_code: number | null
        }
        Insert: {
          api_key_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          endpoint: string
          id?: string
          ip_address?: string | null
          method?: string
          response_time_ms?: number | null
          status_code?: number | null
        }
        Update: {
          api_key_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          endpoint?: string
          id?: string
          ip_address?: string | null
          method?: string
          response_time_ms?: number | null
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_request_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_actions: {
        Row: {
          action: string
          actor_id: string | null
          comment: string | null
          created_at: string
          id: string
          request_id: string
          step_order: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          request_id: string
          step_order: number
        }
        Update: {
          action?: string
          actor_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          request_id?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_actions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          amount: number | null
          branch_id: string | null
          company_id: string
          created_at: string
          current_step: number
          entity_id: string | null
          entity_type: string
          id: string
          notes: string | null
          payload: Json | null
          requested_by: string | null
          resolved_at: string | null
          status: string
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          amount?: number | null
          branch_id?: string | null
          company_id: string
          created_at?: string
          current_step?: number
          entity_id?: string | null
          entity_type: string
          id?: string
          notes?: string | null
          payload?: Json | null
          requested_by?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          amount?: number | null
          branch_id?: string | null
          company_id?: string
          created_at?: string
          current_step?: number
          entity_id?: string | null
          entity_type?: string
          id?: string
          notes?: string | null
          payload?: Json | null
          requested_by?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_steps: {
        Row: {
          approver_role: string
          created_at: string
          id: string
          required: boolean
          step_order: number
          workflow_id: string
        }
        Insert: {
          approver_role: string
          created_at?: string
          id?: string
          required?: boolean
          step_order: number
          workflow_id: string
        }
        Update: {
          approver_role?: string
          created_at?: string
          id?: string
          required?: boolean
          step_order?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflows: {
        Row: {
          branch_id: string | null
          company_id: string | null
          created_at: string
          department_id: string | null
          entity_type: string
          id: string
          is_active: boolean
          max_amount: number | null
          min_amount: number | null
          name: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          department_id?: string | null
          entity_type: string
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          department_id?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflows_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflows_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
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
          company_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          query_text: string | null
          record_id: string | null
          store_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          query_text?: string | null
          record_id?: string | null
          store_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          query_text?: string | null
          record_id?: string | null
          store_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_audit_logs_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_event_logs: {
        Row: {
          actor_id: string | null
          branch_id: string | null
          company_id: string | null
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          metadata: Json | null
          role_key: string
          status: string | null
          target_user_id: string
          transaction_id: string
        }
        Insert: {
          actor_id?: string | null
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          role_key: string
          status?: string | null
          target_user_id: string
          transaction_id?: string
        }
        Update: {
          actor_id?: string | null
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          role_key?: string
          status?: string | null
          target_user_id?: string
          transaction_id?: string
        }
        Relationships: []
      }
      auth_flow_logs: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          status: string
          step: string
          transaction_id: number | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          status: string
          step: string
          transaction_id?: number | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          step?: string
          transaction_id?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          action_type: string
          actions: Json
          company_id: string
          conditions: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          priority: number
          trigger_type: string
          updated_at: string
        }
        Insert: {
          action_type: string
          actions?: Json
          company_id: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          priority?: number
          trigger_type: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          actions?: Json
          company_id?: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          priority?: number
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      background_tasks: {
        Row: {
          attempts: number
          company_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          last_error: string | null
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_type: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_type: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "background_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_holder: string | null
          account_number: string | null
          balance: number
          bank_name: string
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          balance?: number
          bank_name: string
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          balance?: number
          bank_name?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          imported_from: string | null
          reconciled: boolean
          reconciled_with: string | null
          reference: string | null
          transaction_date: string
          type: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          imported_from?: string | null
          reconciled?: boolean
          reconciled_with?: string | null
          reference?: string | null
          transaction_date?: string
          type: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          imported_from?: string | null
          reconciled?: boolean
          reconciled_with?: string | null
          reference?: string | null
          transaction_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bootstrap_logs: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          message: string | null
          metadata: Json | null
          status: string
          step: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          status: string
          step: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          status?: string
          step?: string
          user_id?: string
        }
        Relationships: []
      }
      branch_stock_transfers: {
        Row: {
          company_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          from_company_id: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          requested_by: string | null
          status: string
          to_company_id: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          from_company_id: string
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          requested_by?: string | null
          status?: string
          to_company_id: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          from_company_id?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          requested_by?: string | null
          status?: string
          to_company_id?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_stock_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_stock_transfers_from_company_id_fkey"
            columns: ["from_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_stock_transfers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_stock_transfers_to_company_id_fkey"
            columns: ["to_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          manager_id: string | null
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          company_id: string | null
          created_at: string | null
          created_by: string
          description: string
          id: string
          type: string
        }
        Insert: {
          amount: number
          cash_register_id: string
          company_id?: string | null
          created_at?: string | null
          created_by: string
          description: string
          id?: string
          type: string
        }
        Update: {
          amount?: number
          cash_register_id?: string
          company_id?: string | null
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
          {
            foreignKeyName: "cash_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          closed_at: string | null
          closing_amount: number | null
          company_id: string | null
          created_by: string | null
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
          company_id?: string | null
          created_by?: string | null
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
          company_id?: string | null
          created_by?: string | null
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
            foreignKeyName: "cash_registers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          company_id: string | null
          created_at: string | null
          created_by: string | null
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
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
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
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
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
            foreignKeyName: "commissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          billing_exempt: boolean
          city: string | null
          company_type: string
          country: string | null
          created_at: string | null
          currency: string | null
          email: string | null
          fiscal_rate: number | null
          fiscal_regime: string | null
          id: string
          is_active: boolean | null
          is_master: boolean | null
          is_system_owner: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          nif: string | null
          parent_company_id: string | null
          phone: string | null
          plan: string | null
          status: string | null
          subscription_status: string | null
          tenant_id: string | null
          timezone: string | null
          trial_end_date: string | null
          trial_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          billing_exempt?: boolean
          city?: string | null
          company_type?: string
          country?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          fiscal_rate?: number | null
          fiscal_regime?: string | null
          id?: string
          is_active?: boolean | null
          is_master?: boolean | null
          is_system_owner?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          nif?: string | null
          parent_company_id?: string | null
          phone?: string | null
          plan?: string | null
          status?: string | null
          subscription_status?: string | null
          tenant_id?: string | null
          timezone?: string | null
          trial_end_date?: string | null
          trial_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          billing_exempt?: boolean
          city?: string | null
          company_type?: string
          country?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          fiscal_rate?: number | null
          fiscal_regime?: string | null
          id?: string
          is_active?: boolean | null
          is_master?: boolean | null
          is_system_owner?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          nif?: string | null
          parent_company_id?: string | null
          phone?: string | null
          plan?: string | null
          status?: string | null
          subscription_status?: string | null
          tenant_id?: string | null
          timezone?: string | null
          trial_end_date?: string | null
          trial_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_parent_company_id_fkey"
            columns: ["parent_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invitations: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          max_uses: number
          role: string
          status: string
          token: string
          updated_at: string
          used_count: number
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          max_uses?: number
          role?: string
          status?: string
          token?: string
          updated_at?: string
          used_count?: number
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          max_uses?: number
          role?: string
          status?: string
          token?: string
          updated_at?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "company_invitations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_users: {
        Row: {
          branch_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_users_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      cost_centers: {
        Row: {
          budget: number | null
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          spent: number | null
          updated_at: string
        }
        Insert: {
          budget?: number | null
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          spent?: number | null
          updated_at?: string
        }
        Update: {
          budget?: number | null
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          spent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_company_id_fkey"
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
      crm_tasks: {
        Row: {
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_date: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          priority: string
          status: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          priority?: string
          status?: string
          task_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          priority?: string
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
      currencies: {
        Row: {
          code: string
          company_id: string | null
          created_by: string | null
          exchange_rate: number
          id: string
          is_active: boolean
          is_base: boolean
          name: string
          symbol: string
          updated_at: string
        }
        Insert: {
          code: string
          company_id?: string | null
          created_by?: string | null
          exchange_rate?: number
          id?: string
          is_active?: boolean
          is_base?: boolean
          name: string
          symbol?: string
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string | null
          created_by?: string | null
          exchange_rate?: number
          id?: string
          is_active?: boolean
          is_base?: boolean
          name?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "currencies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_sellers: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          seller_id: string
          store_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          seller_id: string
          store_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          seller_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_sellers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
      delegations: {
        Row: {
          company_id: string
          created_at: string
          ends_at: string
          from_user_id: string
          id: string
          is_active: boolean
          reason: string | null
          scope: string
          starts_at: string
          to_user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          ends_at: string
          from_user_id: string
          id?: string
          is_active?: boolean
          reason?: string | null
          scope?: string
          starts_at?: string
          to_user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          ends_at?: string
          from_user_id?: string
          id?: string
          is_active?: boolean
          reason?: string | null
          scope?: string
          starts_at?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delegations_company_id_fkey"
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
          created_by: string | null
          id: string
          nome: string
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
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
      departments: {
        Row: {
          branch_id: string | null
          code: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          manager_id: string | null
          name: string
          parent_department_id: string | null
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          code?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name: string
          parent_department_id?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          code?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name?: string
          parent_department_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_department_id_fkey"
            columns: ["parent_department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      document_series: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          access_level: Database["public"]["Enums"]["app_role"] | null
          bank_account: string | null
          bank_name: string | null
          base_salary: number
          commission_rate: number
          company_id: string
          created_at: string
          created_by: string | null
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
          access_level?: Database["public"]["Enums"]["app_role"] | null
          bank_account?: string | null
          bank_name?: string | null
          base_salary?: number
          commission_rate?: number
          company_id: string
          created_at?: string
          created_by?: string | null
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
          access_level?: Database["public"]["Enums"]["app_role"] | null
          bank_account?: string | null
          bank_name?: string | null
          base_salary?: number
          commission_rate?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
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
      export_attempts_logs: {
        Row: {
          created_at: string
          error_message: string | null
          export_history_id: string | null
          id: string
          retry_count: number | null
          status: string
          timestamp: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          export_history_id?: string | null
          id?: string
          retry_count?: number | null
          status: string
          timestamp?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          export_history_id?: string | null
          id?: string
          retry_count?: number | null
          status?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_attempts_logs_export_history_id_fkey"
            columns: ["export_history_id"]
            isOneToOne: false
            referencedRelation: "export_history"
            referencedColumns: ["id"]
          },
        ]
      }
      export_history: {
        Row: {
          company_id: string
          created_at: string
          error_message: string | null
          filters: Json
          id: string
          status: string
          timestamp: string
          type: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          error_message?: string | null
          filters: Json
          id?: string
          status: string
          timestamp?: string
          type: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          error_message?: string | null
          filters?: Json
          id?: string
          status?: string
          timestamp?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_flag_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          expires_at: string | null
          feature_flag_id: string
          id: string
          reason: string | null
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          expires_at?: string | null
          feature_flag_id: string
          id?: string
          reason?: string | null
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          expires_at?: string | null
          feature_flag_id?: string
          id?: string
          reason?: string | null
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_overrides_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          category: string
          created_at: string
          description: string | null
          enabled: boolean
          environment: string
          id: string
          key: string
          name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          environment?: string
          id?: string
          key: string
          name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          environment?: string
          id?: string
          key?: string
          name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      financial_scores: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          cost_center_id: string | null
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
          cost_center_id?: string | null
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
          cost_center_id?: string | null
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
            foreignKeyName: "financial_transactions_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
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
      fiscal_audit_log: {
        Row: {
          actor_id: string | null
          checksum: string | null
          company_id: string | null
          created_at: string
          document_number: string | null
          duration_ms: number | null
          error_code: string | null
          error_stack: string | null
          finished_at: string | null
          fiscal_document_id: string | null
          hash: string | null
          id: string
          job_id: string | null
          result: Json | null
          retry_count: number
          sale_id: string | null
          source: string
          started_at: string
          status: string
          store_id: string | null
          worker: string
        }
        Insert: {
          actor_id?: string | null
          checksum?: string | null
          company_id?: string | null
          created_at?: string
          document_number?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_stack?: string | null
          finished_at?: string | null
          fiscal_document_id?: string | null
          hash?: string | null
          id?: string
          job_id?: string | null
          result?: Json | null
          retry_count?: number
          sale_id?: string | null
          source?: string
          started_at?: string
          status: string
          store_id?: string | null
          worker?: string
        }
        Update: {
          actor_id?: string | null
          checksum?: string | null
          company_id?: string | null
          created_at?: string
          document_number?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_stack?: string | null
          finished_at?: string | null
          fiscal_document_id?: string | null
          hash?: string | null
          id?: string
          job_id?: string | null
          result?: Json | null
          retry_count?: number
          sale_id?: string | null
          source?: string
          started_at?: string
          status?: string
          store_id?: string | null
          worker?: string
        }
        Relationships: []
      }
      fiscal_document_items: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string
          document_id: string
          id: string
          line_total: number
          quantity: number
          tax_rate: number
          unit_price: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          document_id: string
          id?: string
          line_total?: number
          quantity?: number
          tax_rate?: number
          unit_price?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
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
            foreignKeyName: "fiscal_document_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          checksum: string | null
          checksum_md5_path: string | null
          checksum_sha256_path: string | null
          company_id: string
          content_hash: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_address: string | null
          customer_email: string | null
          customer_name: string
          customer_nuit: string | null
          customer_phone: string | null
          discount_amount: number
          document_number: string
          document_type: Database["public"]["Enums"]["fiscal_document_type"]
          file_size_bytes: number | null
          id: string
          integrity_checked_at: string | null
          integrity_status: string
          issue_date: string
          issued_by: string
          json_path: string | null
          md5_hash: string | null
          metadata_json: Json | null
          metadata_path: string | null
          mime_type: string | null
          notes: string | null
          number: number
          pdf_path: string | null
          qr_path: string | null
          retention_until: string | null
          series_id: string | null
          status: string
          storage_paths: Json
          storage_version: number
          store_id: string | null
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          updated_at: string
          valid_until: string | null
          xml_path: string | null
        }
        Insert: {
          checksum?: string | null
          checksum_md5_path?: string | null
          checksum_sha256_path?: string | null
          company_id: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name: string
          customer_nuit?: string | null
          customer_phone?: string | null
          discount_amount?: number
          document_number: string
          document_type: Database["public"]["Enums"]["fiscal_document_type"]
          file_size_bytes?: number | null
          id?: string
          integrity_checked_at?: string | null
          integrity_status?: string
          issue_date?: string
          issued_by: string
          json_path?: string | null
          md5_hash?: string | null
          metadata_json?: Json | null
          metadata_path?: string | null
          mime_type?: string | null
          notes?: string | null
          number?: number
          pdf_path?: string | null
          qr_path?: string | null
          retention_until?: string | null
          series_id?: string | null
          status?: string
          storage_paths?: Json
          storage_version?: number
          store_id?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
          xml_path?: string | null
        }
        Update: {
          checksum?: string | null
          checksum_md5_path?: string | null
          checksum_sha256_path?: string | null
          company_id?: string
          content_hash?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_address?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_nuit?: string | null
          customer_phone?: string | null
          discount_amount?: number
          document_number?: string
          document_type?: Database["public"]["Enums"]["fiscal_document_type"]
          file_size_bytes?: number | null
          id?: string
          integrity_checked_at?: string | null
          integrity_status?: string
          issue_date?: string
          issued_by?: string
          json_path?: string | null
          md5_hash?: string | null
          metadata_json?: Json | null
          metadata_path?: string | null
          mime_type?: string | null
          notes?: string | null
          number?: number
          pdf_path?: string | null
          qr_path?: string | null
          retention_until?: string | null
          series_id?: string | null
          status?: string
          storage_paths?: Json
          storage_version?: number
          store_id?: string | null
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
          xml_path?: string | null
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
      founder_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      founder_backup_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          cron_expression: string | null
          enabled: boolean
          frequency: string
          hour: number
          id: string
          last_run_at: string | null
          minute: number
          next_run_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cron_expression?: string | null
          enabled?: boolean
          frequency: string
          hour?: number
          id?: string
          last_run_at?: string | null
          minute?: number
          next_run_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cron_expression?: string | null
          enabled?: boolean
          frequency?: string
          hour?: number
          id?: string
          last_run_at?: string | null
          minute?: number
          next_run_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      founder_backups: {
        Row: {
          backup_type: string
          checksum: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          kind: string
          notes: string | null
          size_bytes: number | null
          status: string
          storage_path: string | null
        }
        Insert: {
          backup_type?: string
          checksum?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          kind?: string
          notes?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
        }
        Update: {
          backup_type?: string
          checksum?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          kind?: string
          notes?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
        }
        Relationships: []
      }
      impersonation_sessions: {
        Row: {
          actor_id: string
          duration_ms: number | null
          ended_at: string | null
          expires_at: string | null
          id: string
          ip: string | null
          read_only: boolean
          reason: string | null
          simulated_company_id: string | null
          simulated_role: string | null
          simulated_store_id: string | null
          simulated_tenant_id: string | null
          started_at: string
          target_id: string
          user_agent: string | null
        }
        Insert: {
          actor_id: string
          duration_ms?: number | null
          ended_at?: string | null
          expires_at?: string | null
          id?: string
          ip?: string | null
          read_only?: boolean
          reason?: string | null
          simulated_company_id?: string | null
          simulated_role?: string | null
          simulated_store_id?: string | null
          simulated_tenant_id?: string | null
          started_at?: string
          target_id: string
          user_agent?: string | null
        }
        Update: {
          actor_id?: string
          duration_ms?: number | null
          ended_at?: string | null
          expires_at?: string | null
          id?: string
          ip?: string | null
          read_only?: boolean
          reason?: string | null
          simulated_company_id?: string | null
          simulated_role?: string | null
          simulated_store_id?: string | null
          simulated_tenant_id?: string | null
          started_at?: string
          target_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      insights_ia: {
        Row: {
          batch_id: string | null
          company_id: string
          created_at: string | null
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
      inventory_audit_items: {
        Row: {
          audit_id: string
          created_at: string | null
          discrepancy_reason: string | null
          id: string
          physical_qty: number
          product_id: string
          system_qty: number
        }
        Insert: {
          audit_id: string
          created_at?: string | null
          discrepancy_reason?: string | null
          id?: string
          physical_qty: number
          product_id: string
          system_qty: number
        }
        Update: {
          audit_id?: string
          created_at?: string | null
          discrepancy_reason?: string | null
          id?: string
          physical_qty?: number
          product_id?: string
          system_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_audit_items_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "inventory_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audit_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_audits: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          status: string | null
          store_id: string | null
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          store_id?: string | null
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_audits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_audits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          branch_id: string
          company_id: string
          created_at: string | null
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          branch_id: string
          company_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          branch_id?: string
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          email: string
          expires_at: string | null
          id: string
          role: string
          status: string
          token: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string | null
          id?: string
          role: string
          status?: string
          token?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          role?: string
          status?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          branch_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          email: string
          expires_at: string
          id: string
          role_id: string | null
          status: string | null
          token: string
        }
        Insert: {
          branch_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          expires_at: string
          id?: string
          role_id?: string | null
          status?: string | null
          token: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          role_id?: string | null
          status?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          currency: string
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          pdf_url: string | null
          period_end: string | null
          period_start: string | null
          plan_tier: string | null
          status: string
          store_id: string | null
          subscription_id: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount?: number
          company_id?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_tier?: string | null
          status?: string
          store_id?: string | null
          subscription_id?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          pdf_url?: string | null
          period_end?: string | null
          period_start?: string | null
          plan_tier?: string | null
          status?: string
          store_id?: string | null
          subscription_id?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
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
          company_id: string | null
          created_at: string
          created_by: string | null
          credit: number
          debit: number
          description: string | null
          id: string
          journal_entry_id: string
        }
        Insert: {
          account_id: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          credit?: number
          debit?: number
          description?: string | null
          id?: string
          journal_entry_id: string
        }
        Update: {
          account_id?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
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
            foreignKeyName: "journal_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      lead_activities: {
        Row: {
          activity_type: string
          company_id: string
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          metadata: Json | null
        }
        Insert: {
          activity_type: string
          company_id: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
        }
        Update: {
          activity_type?: string
          company_id?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          company_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          lead_id: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          business_name: string | null
          company_id: string
          converted_at: string | null
          created_at: string
          created_by: string | null
          email: string | null
          expected_close_at: string | null
          id: string
          last_contact_at: string | null
          lost_reason: string | null
          name: string
          notes: string | null
          phone: string | null
          probability: number | null
          source: string | null
          status: string
          updated_at: string
          value_estimated: number | null
        }
        Insert: {
          assigned_to?: string | null
          business_name?: string | null
          company_id: string
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expected_close_at?: string | null
          id?: string
          last_contact_at?: string | null
          lost_reason?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          probability?: number | null
          source?: string | null
          status?: string
          updated_at?: string
          value_estimated?: number | null
        }
        Update: {
          assigned_to?: string | null
          business_name?: string | null
          company_id?: string
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          expected_close_at?: string | null
          id?: string
          last_contact_at?: string | null
          lost_reason?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          probability?: number | null
          source?: string | null
          status?: string
          updated_at?: string
          value_estimated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          company_id: string | null
          created_at: string
          created_by: string | null
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
          company_id?: string | null
          created_at?: string
          created_by?: string | null
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
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      obligation_documents: {
        Row: {
          alert_level: string | null
          company_id: string
          created_at: string
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
      onboarding_progress: {
        Row: {
          company_created: boolean | null
          company_id: string | null
          completion_pct: number | null
          created_at: string
          created_by: string | null
          first_cash_opened: boolean | null
          first_customer_added: boolean | null
          first_product_added: boolean | null
          first_sale_completed: boolean | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_created?: boolean | null
          company_id?: string | null
          completion_pct?: number | null
          created_at?: string
          created_by?: string | null
          first_cash_opened?: boolean | null
          first_customer_added?: boolean | null
          first_product_added?: boolean | null
          first_sale_completed?: boolean | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_created?: boolean | null
          company_id?: string | null
          completion_pct?: number | null
          created_at?: string
          created_by?: string | null
          first_cash_opened?: boolean | null
          first_customer_added?: boolean | null
          first_product_added?: boolean | null
          first_sale_completed?: boolean | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_company_id_fkey"
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          converted_amount: number | null
          created_at: string
          created_by: string | null
          exchange_rate: number | null
          id: string
          idempotency_key: string | null
          last_checked_at: string | null
          original_amount: number | null
          original_currency: string | null
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
          converted_amount?: number | null
          created_at?: string
          created_by?: string | null
          exchange_rate?: number | null
          id?: string
          idempotency_key?: string | null
          last_checked_at?: string | null
          original_amount?: number | null
          original_currency?: string | null
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
          converted_amount?: number | null
          created_at?: string
          created_by?: string | null
          exchange_rate?: number | null
          id?: string
          idempotency_key?: string | null
          last_checked_at?: string | null
          original_amount?: number | null
          original_currency?: string | null
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
          company_id: string | null
          created_at: string
          created_by: string | null
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
          company_id?: string | null
          created_at?: string
          created_by?: string | null
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
          company_id?: string | null
          created_at?: string
          created_by?: string | null
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
            foreignKeyName: "payment_vouchers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
      permissions: {
        Row: {
          action: string | null
          created_at: string | null
          description: string | null
          id: string
          key: string
          module: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          module?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          module?: string | null
        }
        Relationships: []
      }
      platform_fees: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
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
          company_id?: string | null
          created_at?: string
          created_by?: string | null
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
          company_id?: string | null
          created_at?: string
          created_by?: string | null
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
        Relationships: [
          {
            foreignKeyName: "platform_fees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          currency: string
          default_language: string
          id: string
          integrations: Json
          logo_url: string | null
          name: string
          payments: Json
          plans: Json
          singleton: boolean
          timezone: string
          trial_days: number
          updated_at: string
          updated_by: string | null
          vat_rate: number
        }
        Insert: {
          created_at?: string
          currency?: string
          default_language?: string
          id?: string
          integrations?: Json
          logo_url?: string | null
          name?: string
          payments?: Json
          plans?: Json
          singleton?: boolean
          timezone?: string
          trial_days?: number
          updated_at?: string
          updated_by?: string | null
          vat_rate?: number
        }
        Update: {
          created_at?: string
          currency?: string
          default_language?: string
          id?: string
          integrations?: Json
          logo_url?: string | null
          name?: string
          payments?: Json
          plans?: Json
          singleton?: boolean
          timezone?: string
          trial_days?: number
          updated_at?: string
          updated_by?: string | null
          vat_rate?: number
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
          company_id: string | null
          created_at: string
          created_by: string | null
          daily_consumption: number
          feed_type: string
          id: string
          supplier: string | null
          total_cost: number
          usage_date: string
        }
        Insert: {
          batch_id: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          daily_consumption?: number
          feed_type?: string
          id?: string
          supplier?: string | null
          total_cost?: number
          usage_date?: string
        }
        Update: {
          batch_id?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
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
          {
            foreignKeyName: "poultry_feed_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          company_id: string | null
          created_at: string
          created_by: string | null
          eggs_produced: number | null
          id: string
          production_date: string
          profit: number | null
          revenue: number | null
        }
        Insert: {
          batch_id: string
          chickens_sold?: number | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          eggs_produced?: number | null
          id?: string
          production_date?: string
          profit?: number | null
          revenue?: number | null
        }
        Update: {
          batch_id?: string
          chickens_sold?: number | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
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
          {
            foreignKeyName: "poultry_production_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          changed_by: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          new_cost_price: number | null
          new_sale_price: number | null
          old_cost_price: number | null
          old_sale_price: number | null
          product_id: string
        }
        Insert: {
          changed_by?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_cost_price?: number | null
          new_sale_price?: number | null
          old_cost_price?: number | null
          old_sale_price?: number | null
          product_id: string
        }
        Update: {
          changed_by?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          new_cost_price?: number | null
          new_sale_price?: number | null
          old_cost_price?: number | null
          old_sale_price?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          id: string
          product_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          id?: string
          product_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_stock: {
        Row: {
          company_id: string | null
          created_by: string | null
          id: string
          product_id: string
          quantity: number
          store_id: string
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_by?: string | null
          id?: string
          product_id: string
          quantity?: number
          store_id: string
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_by?: string | null
          id?: string
          product_id?: string
          quantity?: number
          store_id?: string
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "product_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          code: string
          company_id: string
          conversion_factor: number | null
          cost_price: number
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          dimensions: Json | null
          gallery_urls: string[] | null
          id: string
          image_url: string | null
          is_active: boolean | null
          last_sale_date: string | null
          low_stock_threshold: number | null
          max_stock: number | null
          max_stock_level: number | null
          min_stock: number | null
          min_stock_level: number | null
          name: string
          reorder_point: number | null
          sale_price: number
          status: string | null
          tax_rate: number | null
          tax_type: string | null
          unit_type: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          code: string
          company_id: string
          conversion_factor?: number | null
          cost_price?: number
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          dimensions?: Json | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          last_sale_date?: string | null
          low_stock_threshold?: number | null
          max_stock?: number | null
          max_stock_level?: number | null
          min_stock?: number | null
          min_stock_level?: number | null
          name: string
          reorder_point?: number | null
          sale_price?: number
          status?: string | null
          tax_rate?: number | null
          tax_type?: string | null
          unit_type?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          code?: string
          company_id?: string
          conversion_factor?: number | null
          cost_price?: number
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          dimensions?: Json | null
          gallery_urls?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          last_sale_date?: string | null
          low_stock_threshold?: number | null
          max_stock?: number | null
          max_stock_level?: number | null
          min_stock?: number | null
          min_stock_level?: number | null
          name?: string
          reorder_point?: number | null
          sale_price?: number
          status?: string | null
          tax_rate?: number | null
          tax_type?: string | null
          unit_type?: string | null
          updated_at?: string | null
          weight?: number | null
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
          account_type: string
          avatar_url: string | null
          blocked_at: string | null
          branch_id: string | null
          commission_rate: number | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          email: string
          force_logout_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          is_founder: boolean
          is_super_admin: boolean | null
          language: string | null
          last_login: string | null
          onboarding_completed: boolean | null
          phone: string | null
          shift_end: string | null
          shift_start: string | null
          status: string | null
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          blocked_at?: string | null
          branch_id?: string | null
          commission_rate?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          force_logout_at?: string | null
          full_name: string
          id: string
          is_active?: boolean | null
          is_founder?: boolean
          is_super_admin?: boolean | null
          language?: string | null
          last_login?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          shift_end?: string | null
          shift_start?: string | null
          status?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          blocked_at?: string | null
          branch_id?: string | null
          commission_rate?: number | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          force_logout_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          is_founder?: boolean
          is_super_admin?: boolean | null
          language?: string | null
          last_login?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          shift_end?: string | null
          shift_start?: string | null
          status?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
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
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          order_id: string
          product_id: string
          quantity: number
          received_quantity: number | null
          total: number
          unit_cost: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          received_quantity?: number | null
          total?: number
          unit_cost?: number
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
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
            foreignKeyName: "purchase_order_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
      referrals: {
        Row: {
          company_id: string | null
          converted_at: string | null
          created_at: string
          created_by: string | null
          id: string
          invited_email: string
          reward_applied: boolean | null
          reward_days: number | null
          reward_type: string | null
          status: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invited_email: string
          reward_applied?: boolean | null
          reward_days?: number | null
          reward_type?: string | null
          status?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          invited_email?: string
          reward_applied?: boolean | null
          reward_days?: number | null
          reward_type?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_clients: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          company_id: string | null
          content_text: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          material_type: Database["public"]["Enums"]["reseller_material_type"]
          title: string
          updated_at: string
        }
        Insert: {
          asset_url?: string | null
          company_id?: string | null
          content_text?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          material_type: Database["public"]["Enums"]["reseller_material_type"]
          title: string
          updated_at?: string
        }
        Update: {
          asset_url?: string | null
          company_id?: string | null
          content_text?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          material_type?: Database["public"]["Enums"]["reseller_material_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reseller_materials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reseller_payout_items: {
        Row: {
          commission_id: string
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          payout_id: string
        }
        Insert: {
          commission_id: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          payout_id: string
        }
        Update: {
          commission_id?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
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
            foreignKeyName: "reseller_payout_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
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
            foreignKeyName: "reseller_payouts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: string | null
          country: string
          created_at: string
          created_by: string | null
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
          company_id?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
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
          company_id?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
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
            foreignKeyName: "resellers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          company_id: string | null
          created_by: string | null
          permission_id: string
          role_id: string
          scope: string
        }
        Insert: {
          company_id?: string | null
          created_by?: string | null
          permission_id: string
          role_id: string
          scope?: string
        }
        Update: {
          company_id?: string | null
          created_by?: string | null
          permission_id?: string
          role_id?: string
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions_legacy: {
        Row: {
          can_approve: boolean | null
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          can_approve?: boolean | null
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          can_approve?: boolean | null
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_legacy_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean
          key: string | null
          level: number
          name: string
          scope_default: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string | null
          level?: number
          name: string
          scope_default?: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string | null
          level?: number
          name?: string
          scope_default?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          company_id: string | null
          cost_price: number
          created_at: string | null
          created_by: string | null
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
          company_id?: string | null
          cost_price?: number
          created_at?: string | null
          created_by?: string | null
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
          company_id?: string | null
          cost_price?: number
          created_at?: string | null
          created_by?: string | null
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
            foreignKeyName: "sale_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          client_sale_id: string | null
          company_id: string | null
          cost_total: number
          created_at: string | null
          created_by: string | null
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
          client_sale_id?: string | null
          company_id?: string | null
          cost_total?: number
          created_at?: string | null
          created_by?: string | null
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
          client_sale_id?: string | null
          company_id?: string | null
          cost_total?: number
          created_at?: string | null
          created_by?: string | null
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
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          created_by: string | null
          id: string
          product_id: string
          quantity: number
          salesman_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_by?: string | null
          id?: string
          product_id: string
          quantity?: number
          salesman_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_by?: string | null
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
      serial_numbers: {
        Row: {
          company_id: string
          created_at: string | null
          current_store_id: string | null
          id: string
          product_id: string
          serial_number: string
          status: string | null
          updated_at: string | null
          warranty_expiry: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          current_store_id?: string | null
          id?: string
          product_id: string
          serial_number: string
          status?: string | null
          updated_at?: string | null
          warranty_expiry?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          current_store_id?: string | null
          id?: string
          product_id?: string
          serial_number?: string
          status?: string | null
          updated_at?: string | null
          warranty_expiry?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "serial_numbers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serial_numbers_current_store_id_fkey"
            columns: ["current_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "serial_numbers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sod_rules: {
        Row: {
          company_id: string | null
          conflicting_permissions: string[]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          severity: string
        }
        Insert: {
          company_id?: string | null
          conflicting_permissions: string[]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          severity?: string
        }
        Update: {
          company_id?: string | null
          conflicting_permissions?: string[]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "sod_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sod_violations: {
        Row: {
          company_id: string | null
          details: Json | null
          detected_at: string
          id: string
          resolved: boolean
          rule_id: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          details?: Json | null
          detected_at?: string
          id?: string
          resolved?: boolean
          rule_id?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          details?: Json | null
          detected_at?: string
          id?: string
          resolved?: boolean
          rule_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sod_violations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sod_violations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "sod_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjusted_by: string
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          product_id: string
          quantity_change: number
          reason: Database["public"]["Enums"]["stock_adjustment_reason"]
          store_id: string
        }
        Insert: {
          adjusted_by: string
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity_change: number
          reason: Database["public"]["Enums"]["stock_adjustment_reason"]
          store_id: string
        }
        Update: {
          adjusted_by?: string
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity_change?: number
          reason?: Database["public"]["Enums"]["stock_adjustment_reason"]
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          warehouse_id: string | null
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
          warehouse_id?: string | null
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
          warehouse_id?: string | null
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
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
          company_id: string | null
          created_by: string | null
          id: string
          product_id: string
          quantity: number
          transfer_id: string
        }
        Insert: {
          company_id?: string | null
          created_by?: string | null
          id?: string
          product_id: string
          quantity: number
          transfer_id: string
        }
        Update: {
          company_id?: string | null
          created_by?: string | null
          id?: string
          product_id?: string
          quantity?: number
          transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfer_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          created_by: string | null
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
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          business_type?: string | null
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
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
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          business_type?: string | null
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
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
          timezone?: string | null
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
          company_id: string | null
          created_at: string
          created_by: string | null
          details: Json | null
          id: string
          message: string
          module: string
          severity: string
          status: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          check_name: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          details?: Json | null
          id?: string
          message: string
          module: string
          severity?: string
          status?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          check_name?: string
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          details?: Json | null
          id?: string
          message?: string
          module?: string
          severity?: string
          status?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_errors: {
        Row: {
          company_id: string | null
          component_name: string | null
          created_at: string | null
          error_message: string
          error_stack: string | null
          id: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          component_name?: string | null
          created_at?: string | null
          error_message: string
          error_stack?: string | null
          id?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          component_name?: string | null
          created_at?: string | null
          error_message?: string
          error_stack?: string | null
          id?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_errors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      system_insights: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          data: Json
          id: string
          insight_type: string
          message: string
          priority: string
          status: string
          store_id: string | null
          title: string
          valid_until: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          insight_type: string
          message: string
          priority?: string
          status?: string
          store_id?: string | null
          title: string
          valid_until?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          insight_type?: string
          message?: string
          priority?: string
          status?: string
          store_id?: string | null
          title?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_insights_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_calculations: {
        Row: {
          base_amount: number
          company_id: string
          created_at: string
          created_by: string | null
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
          created_by?: string | null
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
          created_by?: string | null
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
      tax_reports: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          generated_by: string | null
          id: string
          net_result: number
          notes: string | null
          period_end: string
          period_start: string
          report_type: string
          status: string
          tax_rate: number
          total_expenses: number
          total_sales: number
          total_tax: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          generated_by?: string | null
          id?: string
          net_result?: number
          notes?: string | null
          period_end: string
          period_start: string
          report_type?: string
          status?: string
          tax_rate?: number
          total_expenses?: number
          total_sales?: number
          total_tax?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          generated_by?: string | null
          id?: string
          net_result?: number
          notes?: string | null
          period_end?: string
          period_start?: string
          report_type?: string
          status?: string
          tax_rate?: number
          total_expenses?: number
          total_sales?: number
          total_tax?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          department_id: string
          id: string
          is_active: boolean
          lead_user_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          is_active?: boolean
          lead_user_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          is_active?: boolean
          lead_user_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      telemetry_events: {
        Row: {
          company_id: string | null
          created_at: string
          duration_ms: number
          error_code: string | null
          event_ts: string
          id: string
          kind: string
          name: string
          payload_size: number | null
          request_id: string | null
          response_size: number | null
          retries: number | null
          success: boolean
          timeout: boolean | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          duration_ms?: number
          error_code?: string | null
          event_ts?: string
          id?: string
          kind: string
          name: string
          payload_size?: number | null
          request_id?: string | null
          response_size?: number | null
          retries?: number | null
          success?: boolean
          timeout?: boolean | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          duration_ms?: number
          error_code?: string | null
          event_ts?: string
          id?: string
          kind?: string
          name?: string
          payload_size?: number | null
          request_id?: string | null
          response_size?: number | null
          retries?: number | null
          success?: boolean
          timeout?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          owner_user_id: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          owner_user_id?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_user_id?: string | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_company: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          role_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          role_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          role_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_company_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_company_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          branch_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          granted: boolean
          id: string
          permission_id: string
          scope: Database["public"]["Enums"]["permission_scope"]
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          granted?: boolean
          id?: string
          permission_id: string
          scope?: Database["public"]["Enums"]["permission_scope"]
          user_id: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          granted?: boolean
          id?: string
          permission_id?: string
          scope?: Database["public"]["Enums"]["permission_scope"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          branch_id: string | null
          company_id: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          scope: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          scope?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          scope?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          company_id: string | null
          created_by: string | null
          device_type: string | null
          ended_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_seen_at: string | null
          location: string | null
          started_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_by?: string | null
          device_type?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_seen_at?: string | null
          location?: string | null
          started_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_by?: string | null
          device_type?: string | null
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_seen_at?: string | null
          location?: string | null
          started_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
          created_by: string | null
          id: string
          payment_method: string
          store_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          payment_method: string
          store_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
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
      warehouses: {
        Row: {
          address: string | null
          capacity: number | null
          code: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          code?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          capacity?: number | null
          code?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempt_count: number
          attempts: number
          company_id: string
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          signature: string | null
          status: string
          webhook_id: string
        }
        Insert: {
          attempt_count?: number
          attempts?: number
          company_id: string
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          signature?: string | null
          status?: string
          webhook_id: string
        }
        Update: {
          attempt_count?: number
          attempts?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          signature?: string | null
          status?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          events: string[]
          id: string
          is_active: boolean
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          events?: string[]
          id?: string
          is_active?: boolean
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          created_by: string | null
          data: Json
          description: string | null
          due_date: string | null
          id: string
          priority: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requested_by: string
          status: string
          store_id: string | null
          title: string
          updated_at: string
          workflow_type: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          data?: Json
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_by: string
          status?: string
          store_id?: string | null
          title: string
          updated_at?: string
          workflow_type: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          data?: Json
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_by?: string
          status?: string
          store_id?: string | null
          title?: string
          updated_at?: string
          workflow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      billing_dashboard_metrics_mv: {
        Row: {
          company_id: string | null
          generated_at: string | null
          invoices_paid: number | null
          invoices_pending: number | null
          invoices_total: number | null
          paid_amount: number | null
          pending_amount: number | null
        }
        Relationships: []
      }
      ceo_dashboard_metrics_mv: {
        Row: {
          company_id: string | null
          generated_at: string | null
          profit_total: number | null
          revenue_total: number | null
          sales_count: number | null
          stores_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_dashboard_metrics_mv: {
        Row: {
          company_id: string | null
          generated_at: string | null
          leads_lost: number | null
          leads_open: number | null
          leads_total: number | null
          leads_won: number | null
          won_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
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
      founder_dashboard_metrics_mv: {
        Row: {
          companies_active: number | null
          generated_at: string | null
          mrr: number | null
          stores_total: number | null
          subs_active: number | null
          users_total: number | null
        }
        Relationships: []
      }
      inventory_dashboard_metrics_mv: {
        Row: {
          company_id: string | null
          generated_at: string | null
          products_active: number | null
          products_total: number | null
          stock_low: number | null
          stock_negative: number | null
          stock_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_dashboard_metrics_mv: {
        Row: {
          avg_ticket_30d: number | null
          company_id: string | null
          generated_at: string | null
          profit_30d: number | null
          revenue_30d: number | null
          sales_30d: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _founder_audit: {
        Args: {
          _action: string
          _metadata: Json
          _target_id: string
          _target_type: string
        }
        Returns: undefined
      }
      _founder_guard: { Args: never; Returns: undefined }
      accept_company_invitation: { Args: { p_token: string }; Returns: Json }
      accept_invite_secure: { Args: { p_token: string }; Returns: Json }
      add_community_comment: {
        Args: { p_content: string; p_post_id: string }
        Returns: Json
      }
      add_inventory_adjustment: {
        Args: {
          p_product_id: string
          p_quantity: number
          p_reason?: string
          p_reference_id?: string
          p_reference_type?: string
          p_store_id: string
          p_type?: string
        }
        Returns: Json
      }
      apply_payment_to_invoice: {
        Args: {
          p_amount: number
          p_method: string
          p_provider_tx_ref?: string
          p_reference: string
        }
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
      check_fiscal_health: { Args: never; Returns: Json }
      check_is_master: { Args: { user_uuid: string }; Returns: boolean }
      check_sod_for_user: {
        Args: { _user_id: string }
        Returns: {
          conflicting_permissions: string[]
          rule_id: string
          rule_name: string
        }[]
      }
      check_subscription_status: {
        Args: { p_store_id: string }
        Returns: Database["public"]["Enums"]["subscription_status"]
      }
      check_user_role: {
        Args: {
          p_company_id: string
          p_required_roles: string[]
          p_user_id: string
        }
        Returns: boolean
      }
      collect_ml_features: { Args: { p_batch_id: string }; Returns: undefined }
      commercial_dashboard_stats: {
        Args: { p_company_id: string }
        Returns: Json
      }
      complete_onboarding: {
        Args: {
          p_company_address?: string
          p_company_name: string
          p_company_nif?: string
          p_company_phone?: string
        }
        Returns: undefined
      }
      confirm_branch_transfer: {
        Args: { p_action: string; p_transfer_id: string; p_user_id: string }
        Returns: Json
      }
      confirm_manual_payment: {
        Args: { p_confirmed_by: string; p_payment_id: string }
        Returns: Json
      }
      confirm_stock_transfer: { Args: { p_transfer_id: string }; Returns: Json }
      convert_lead_to_customer: { Args: { p_lead_id: string }; Returns: string }
      create_branch_company: {
        Args: {
          p_address?: string
          p_city?: string
          p_country?: string
          p_name: string
          p_nif?: string
          p_phone?: string
        }
        Returns: string
      }
      create_enterprise_seller: {
        Args: {
          p_email: string
          p_full_name: string
          p_password: string
          p_role?: string
          p_store_id: string
        }
        Returns: Json
      }
      create_enterprise_user: {
        Args: {
          p_company_id: string
          p_email: string
          p_full_name: string
          p_password: string
          p_role: string
          p_store_id?: string
        }
        Returns: Json
      }
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
      create_product_with_stock: {
        Args: {
          p_category_id?: string
          p_code?: string
          p_company_id: string
          p_cost_price: number
          p_description?: string
          p_image_url?: string
          p_initial_stock: number
          p_is_active?: boolean
          p_name: string
          p_sale_price: number
          p_store_id: string
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
      current_company_id: { Args: never; Returns: string }
      decrement_product_stock: {
        Args: { p_product_id: string; p_quantity: number; p_store_id: string }
        Returns: undefined
      }
      enqueue_fiscal_job: { Args: { p_sale_id: string }; Returns: string }
      evaluate_automation_rules: {
        Args: { p_company_id: string }
        Returns: Json
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
      feature_flag_is_enabled: {
        Args: { p_company_id?: string; p_key: string; p_store_id?: string }
        Returns: boolean
      }
      fiscal_document_canonical: {
        Args: { p_document_id: string }
        Returns: string
      }
      fiscal_document_register_artifacts: {
        Args: { p_artifacts: Json; p_document_id: string }
        Returns: Json
      }
      fiscal_document_request_regeneration: {
        Args: { p_document_id: string }
        Returns: Json
      }
      fiscal_document_storage_prefix: {
        Args: { p_document_id: string }
        Returns: string
      }
      fiscal_is_founder: { Args: { _user_id: string }; Returns: boolean }
      force_confirm_stock_transfer: {
        Args: { p_transfer_id: string }
        Returns: Json
      }
      founder_audit_search: {
        Args: {
          _actor?: string
          _from?: string
          _limit?: number
          _offset?: number
          _source?: string
          _to?: string
        }
        Returns: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata: Json
          source: string
          target: string
        }[]
      }
      founder_backup_delete: { Args: { p_id: string }; Returns: undefined }
      founder_backup_list: {
        Args: { p_limit?: number }
        Returns: {
          backup_type: string
          checksum: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          kind: string
          notes: string | null
          size_bytes: number | null
          status: string
          storage_path: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "founder_backups"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      founder_backup_schedule_get: {
        Args: never
        Returns: {
          created_at: string
          created_by: string | null
          cron_expression: string | null
          enabled: boolean
          frequency: string
          hour: number
          id: string
          last_run_at: string | null
          minute: number
          next_run_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "founder_backup_schedules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      founder_backup_schedule_upsert: {
        Args: {
          p_cron?: string
          p_enabled?: boolean
          p_frequency: string
          p_hour?: number
          p_minute?: number
        }
        Returns: {
          created_at: string
          created_by: string | null
          cron_expression: string | null
          enabled: boolean
          frequency: string
          hour: number
          id: string
          last_run_at: string | null
          minute: number
          next_run_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "founder_backup_schedules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      founder_backup_stats: { Args: never; Returns: Json }
      founder_business_analytics: { Args: { p_months?: number }; Returns: Json }
      founder_company_stats: { Args: { _company_id: string }; Returns: Json }
      founder_extend_trial: {
        Args: { _company_id: string; _days: number }
        Returns: undefined
      }
      founder_feature_flag_delete: {
        Args: { p_id: string }
        Returns: undefined
      }
      founder_feature_flag_override_delete: {
        Args: { p_id: string }
        Returns: undefined
      }
      founder_feature_flag_override_upsert: {
        Args: {
          p_enabled: boolean
          p_expires_at?: string
          p_flag_id: string
          p_reason?: string
          p_target_id: string
          p_target_type: string
        }
        Returns: string
      }
      founder_feature_flag_upsert: {
        Args: {
          p_category: string
          p_description: string
          p_enabled: boolean
          p_environment: string
          p_id: string
          p_key: string
          p_name: string
        }
        Returns: string
      }
      founder_fiscal_archive: { Args: { p_task_id: string }; Returns: Json }
      founder_fiscal_cancel: {
        Args: { p_reason?: string; p_task_id: string }
        Returns: Json
      }
      founder_fiscal_dlq: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: string
        }
        Returns: Json
      }
      founder_fiscal_metrics: { Args: { p_hours?: number }; Returns: Json }
      founder_fiscal_reprocess: { Args: { p_task_id: string }; Returns: Json }
      founder_force_logout: { Args: { _user_id: string }; Returns: undefined }
      founder_global_dashboard_stats: { Args: never; Returns: Json }
      founder_grant_lifetime: {
        Args: { _company_id: string }
        Returns: undefined
      }
      founder_impersonate_current: { Args: never; Returns: Json }
      founder_impersonate_end: { Args: never; Returns: Json }
      founder_impersonate_history: {
        Args: { p_limit?: number }
        Returns: {
          company_id: string
          duration_ms: number
          ended_at: string
          id: string
          ip: string
          reason: string
          role: string
          started_at: string
          store_id: string
          target_email: string
          target_id: string
          target_name: string
        }[]
      }
      founder_impersonate_start: {
        Args: {
          p_company_id?: string
          p_expires_minutes?: number
          p_ip?: string
          p_reason?: string
          p_role?: string
          p_store_id?: string
          p_target_user_id: string
          p_user_agent?: string
        }
        Returns: Json
      }
      founder_infrastructure_stats: { Args: never; Returns: Json }
      founder_invoice_create: {
        Args: {
          p_amount: number
          p_notes?: string
          p_period_end?: string
          p_period_start?: string
          p_subscription_id: string
          p_tax?: number
        }
        Returns: string
      }
      founder_invoice_mark_paid: {
        Args: { p_invoice_id: string; p_method?: string; p_reference?: string }
        Returns: undefined
      }
      founder_list_companies: {
        Args: {
          _limit?: number
          _offset?: number
          _search?: string
          _status?: string
        }
        Returns: {
          created_at: string
          id: string
          name: string
          status: string
          stores_count: number
          subscription_plan: string
          subscription_status: string
          users_count: number
        }[]
      }
      founder_list_subscriptions: {
        Args: { _limit?: number; _offset?: number; _status?: string }
        Returns: {
          blocked_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
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
        }[]
        SetofOptions: {
          from: "*"
          to: "subscriptions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      founder_list_users: {
        Args: {
          _blocked?: boolean
          _company_id?: string
          _limit?: number
          _offset?: number
          _role?: string
          _search?: string
        }
        Returns: {
          blocked_at: string
          company_id: string
          company_name: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_founder: boolean
          roles: string[]
        }[]
      }
      founder_monitoring_stats: { Args: never; Returns: Json }
      founder_platform_settings_get: {
        Args: never
        Returns: {
          created_at: string
          currency: string
          default_language: string
          id: string
          integrations: Json
          logo_url: string | null
          name: string
          payments: Json
          plans: Json
          singleton: boolean
          timezone: string
          trial_days: number
          updated_at: string
          updated_by: string | null
          vat_rate: number
        }[]
        SetofOptions: {
          from: "*"
          to: "platform_settings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      founder_platform_settings_upsert: {
        Args: { _payload: Json }
        Returns: undefined
      }
      founder_platform_stats: { Args: never; Returns: Json }
      founder_revenue_stats: { Args: never; Returns: Json }
      founder_set_company_status: {
        Args: { _company_id: string; _status: string }
        Returns: undefined
      }
      founder_set_subscription: {
        Args: {
          _company_id: string
          _expires_at: string
          _plan: string
          _status: string
        }
        Returns: undefined
      }
      founder_set_user_blocked: {
        Args: { _blocked: boolean; _user_id: string }
        Returns: undefined
      }
      founder_subscription_transition: {
        Args: {
          p_new_status: string
          p_reason?: string
          p_subscription_id: string
        }
        Returns: undefined
      }
      founder_system_audit: { Args: never; Returns: Json }
      founder_toggle_founder: {
        Args: { _enabled: boolean; _user_id: string }
        Returns: undefined
      }
      generate_demand_forecast: {
        Args: { p_company_id: string }
        Returns: Json
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_nava_reference: { Args: never; Returns: string }
      generate_product_sku: { Args: never; Returns: string }
      generate_reseller_code: { Args: never; Returns: string }
      generate_tax_report: {
        Args: {
          p_company_id: string
          p_end: string
          p_start: string
          p_type?: string
        }
        Returns: Json
      }
      get_branch_companies: {
        Args: never
        Returns: {
          billing_exempt: boolean
          city: string
          company_type: string
          country: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          total_revenue: number
          total_stock: number
          total_stores: number
          total_users: number
        }[]
      }
      get_cash_status: {
        Args: { p_store_id: string }
        Returns: {
          cash_register_id: string
          closed_at: string
          is_open: boolean
          opened_at: string
          opening_amount: number
          status: string
          store_id: string
          user_id: string
        }[]
      }
      get_ceo_dashboard_stats: { Args: never; Returns: Json }
      get_companies_no_sales: {
        Args: { days_count?: number }
        Returns: {
          company_id: string
          company_name: string
          last_sale_date: string
        }[]
      }
      get_dashboard_metrics: {
        Args: { p_company_id?: string; p_scope: string }
        Returns: Json[]
      }
      get_dashboard_stats: {
        Args: { p_company_id: string; p_store_id?: string }
        Returns: Json
      }
      get_fiscal_document_url: {
        Args: { p_document_id: string; p_expires_in?: number; p_kind?: string }
        Returns: Json
      }
      get_global_low_stock: {
        Args: never
        Returns: {
          company_name: string
          current_stock: number
          min_stock: number
          product_name: string
        }[]
      }
      get_global_sales_trend: {
        Args: { days_count?: number }
        Returns: {
          sale_count: number
          sale_date: string
          total_sales: number
        }[]
      }
      get_global_stock_summary: {
        Args: { p_user_id: string }
        Returns: {
          branch_count: number
          product_code: string
          product_id: string
          product_name: string
          total_quantity: number
          total_value: number
        }[]
      }
      get_global_users: {
        Args: never
        Returns: {
          company_name: string
          created_at: string
          email: string
          name: string
          role: string
          status: string
          user_id: string
        }[]
      }
      get_governance_dashboard: { Args: never; Returns: Json }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          company_id: string
          email: string
          expires_at: string
          id: string
          role_id: string
          status: string
        }[]
      }
      get_invite_details: {
        Args: { p_token: string }
        Returns: {
          branch_name: string
          company_name: string
          email: string
          expires_at: string
          invite_id: string
          role_name: string
        }[]
      }
      get_master_visible_company_ids: {
        Args: { p_user_id: string }
        Returns: string[]
      }
      get_my_company: { Args: never; Returns: string }
      get_my_company_id: { Args: never; Returns: string }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_my_store_id: { Args: never; Returns: string }
      get_platform_stats: { Args: never; Returns: Json }
      get_reseller_id: { Args: { _user_id: string }; Returns: string }
      get_revenue_by_company: {
        Args: never
        Returns: {
          company_name: string
          revenue: number
        }[]
      }
      get_sales_by_store: { Args: { p_period?: string }; Returns: Json }
      get_top_products_national: { Args: { p_limit?: number }; Returns: Json }
      get_user_allowed_companies: {
        Args: { user_uuid: string }
        Returns: {
          company_id: string
        }[]
      }
      get_user_app_context: { Args: { _user_id: string }; Returns: Json }
      get_user_branch_ids: { Args: never; Returns: string[] }
      get_user_company: { Args: { _user_id: string }; Returns: string }
      get_user_company_id: { Args: never; Returns: string }
      get_user_company_ids: { Args: never; Returns: string[] }
      get_user_permissions: { Args: { _user_id: string }; Returns: string[] }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_store: { Args: { _user_id: string }; Returns: string }
      has_company_role: {
        Args: { _company_id: string; _role: string }
        Returns: boolean
      }
      has_completed_onboarding: { Args: { _user_id: string }; Returns: boolean }
      has_min_role: { Args: { required_role: string }; Returns: boolean }
      has_minimum_role: {
        Args: {
          min_role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_manager: { Args: never; Returns: boolean }
      is_ceo: { Args: never; Returns: boolean }
      is_ceo_of_company: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: boolean
      }
      is_founder: { Args: { _user_id?: string }; Returns: boolean }
      is_global_ceo: { Args: never; Returns: boolean }
      is_manager_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_master_ceo: { Args: never; Returns: boolean }
      is_master_company_user: { Args: { p_user_id: string }; Returns: boolean }
      is_master_owner:
        | { Args: never; Returns: boolean }
        | { Args: { user_id: string }; Returns: boolean }
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
      log_audit_event: {
        Args: {
          _action: string
          _entity_id?: string
          _entity_type?: string
          _metadata?: Json
          _new?: Json
          _old?: Json
        }
        Returns: string
      }
      log_auth_event: {
        Args: {
          p_email: string
          p_error_message?: string
          p_metadata?: Json
          p_status: string
          p_step: string
          p_user_id: string
        }
        Returns: string
      }
      map_role_name: { Args: { p_role: string }; Returns: string }
      max_user_role_level: { Args: { _user_id: string }; Returns: number }
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
      pos_complete_sale: {
        Args: {
          p_cash_register_id: string
          p_client_sale_id?: string
          p_customer_name?: string
          p_customer_phone?: string
          p_discount_amount?: number
          p_discount_percent?: number
          p_ip_address?: string
          p_items: Json
          p_notes?: string
          p_payment_method: string
          p_seller_name?: string
          p_store_id: string
          p_subtotal: number
          p_total?: number
          p_voucher_code?: string
        }
        Returns: Json
      }
      process_lead_followups: { Args: never; Returns: Json }
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
      process_subscription_renewals: { Args: never; Returns: Json }
      rebuild_fiscal_document_metadata: {
        Args: { p_document_id: string }
        Returns: Json
      }
      reconcile_bank_transactions: {
        Args: { p_bank_account_id: string }
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
      record_user_session: {
        Args: { p_device?: string; p_ip?: string; p_user_agent?: string }
        Returns: string
      }
      refresh_dashboard_mvs: { Args: never; Returns: undefined }
      reject_manual_payment: {
        Args: { p_payment_id: string; p_reason?: string; p_rejected_by: string }
        Returns: Json
      }
      repair_fiscal_document_metadata: {
        Args: { p_document_id: string }
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
      restore_product: { Args: { p_product_id: string }; Returns: boolean }
      role_level: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: number
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sync_company_subscription_pricing: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      sync_user_profile: { Args: { target_user_id?: string }; Returns: Json }
      terminate_user_session: { Args: { p_session_id: string }; Returns: Json }
      toggle_company_status: {
        Args: { p_active: boolean; p_company_id: string }
        Returns: undefined
      }
      toggle_company_user_status: {
        Args: { p_company_id: string; p_status: string; p_user_id: string }
        Returns: Json
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
      update_company_user_role: {
        Args: { p_company_id: string; p_new_role: string; p_user_id: string }
        Returns: Json
      }
      user_has_company_access: {
        Args: { _company_id: string }
        Returns: boolean
      }
      user_has_permission: {
        Args: {
          _branch_id?: string
          _company_id?: string
          _department_id?: string
          _key: string
          _user_id: string
        }
        Returns: boolean
      }
      validate_and_redeem_voucher: {
        Args: { p_code: string; p_store_id?: string }
        Returns: Json
      }
      verify_fiscal_document_checksum: {
        Args: { p_document_id: string }
        Returns: Json
      }
      verify_fiscal_document_integrity: {
        Args: { p_document_id: string }
        Returns: Json
      }
      view_team_members: {
        Args: {
          p_branch_id?: string
          p_company_id: string
          p_permission?: string
        }
        Returns: {
          branch_id: string
          branch_name: string
          email: string
          full_name: string
          has_permission: boolean
          is_active: boolean
          role_label: string
          user_id: string
        }[]
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
        | "viewer"
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
      permission_scope: "GLOBAL" | "COMPANY" | "BRANCH" | "DEPARTMENT"
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
      subscription_status:
        | "active"
        | "warning"
        | "blocked"
        | "cancelled"
        | "trial"
        | "past_due"
        | "suspended"
        | "expired"
        | "lifetime"
      task_status:
        | "PENDING"
        | "PROCESSING"
        | "COMPLETED"
        | "FAILED"
        | "RETRY"
        | "CANCELLED"
        | "ARCHIVED"
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
        "viewer",
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
      permission_scope: ["GLOBAL", "COMPANY", "BRANCH", "DEPARTMENT"],
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
      subscription_status: [
        "active",
        "warning",
        "blocked",
        "cancelled",
        "trial",
        "past_due",
        "suspended",
        "expired",
        "lifetime",
      ],
      task_status: [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "FAILED",
        "RETRY",
        "CANCELLED",
        "ARCHIVED",
      ],
      voucher_status: ["pending", "redeemed", "expired", "cancelled"],
    },
  },
} as const
