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
      audit_logs: {
        Row: {
          action: string
          actor_name: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          actor_name?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_name?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          cargo: string | null
          client_id: string
          created_at: string
          created_by: string | null
          distance_km: number
          drop_off: Json
          id: string
          invoice_id: string | null
          notes: string | null
          pickup: Json
          pickup_at: string | null
          priority: string
          rate: number
          ref: string
          status: string
          tenant_id: string
          trip_id: string | null
          updated_at: string
          vehicle_type: string
          weight_tons: number
        }
        Insert: {
          cargo?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          distance_km?: number
          drop_off?: Json
          id?: string
          invoice_id?: string | null
          notes?: string | null
          pickup?: Json
          pickup_at?: string | null
          priority?: string
          rate?: number
          ref: string
          status?: string
          tenant_id: string
          trip_id?: string | null
          updated_at?: string
          vehicle_type?: string
          weight_tons?: number
        }
        Update: {
          cargo?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          distance_km?: number
          drop_off?: Json
          id?: string
          invoice_id?: string | null
          notes?: string | null
          pickup?: Json
          pickup_at?: string | null
          priority?: string
          rate?: number
          ref?: string
          status?: string
          tenant_id?: string
          trip_id?: string | null
          updated_at?: string
          vehicle_type?: string
          weight_tons?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_invoice_fk"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_trip_fk"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          city: string
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          tenant_id: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name: string
          tenant_id: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          city: string | null
          contact_name: string | null
          created_at: string
          credit_days: number
          email: string | null
          gstin: string | null
          id: string
          is_archived: boolean
          name: string
          phone: string | null
          rate_per_km: number
          segment: string
          tenant_id: string
        }
        Insert: {
          city?: string | null
          contact_name?: string | null
          created_at?: string
          credit_days?: number
          email?: string | null
          gstin?: string | null
          id?: string
          is_archived?: boolean
          name: string
          phone?: string | null
          rate_per_km?: number
          segment?: string
          tenant_id: string
        }
        Update: {
          city?: string | null
          contact_name?: string | null
          created_at?: string
          credit_days?: number
          email?: string | null
          gstin?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          phone?: string | null
          rate_per_km?: number
          segment?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          doc_number: string | null
          doc_type: string
          expiry_date: string | null
          file_path: string | null
          id: string
          issue_date: string | null
          owner_id: string
          owner_type: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          doc_number?: string | null
          doc_type: string
          expiry_date?: string | null
          file_path?: string | null
          id?: string
          issue_date?: string | null
          owner_id: string
          owner_type: string
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          doc_number?: string | null
          doc_type?: string
          expiry_date?: string | null
          file_path?: string | null
          id?: string
          issue_date?: string | null
          owner_id?: string
          owner_type?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          assigned_vehicle_id: string | null
          branch_id: string | null
          created_at: string
          id: string
          is_archived: boolean
          licence_expiry: string | null
          licence_no: string | null
          name: string
          phone: string | null
          rating: number
          status: string
          tenant_id: string
          trips_completed: number
          user_id: string | null
        }
        Insert: {
          assigned_vehicle_id?: string | null
          branch_id?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          licence_expiry?: string | null
          licence_no?: string | null
          name: string
          phone?: string | null
          rating?: number
          status?: string
          tenant_id: string
          trips_completed?: number
          user_id?: string | null
        }
        Update: {
          assigned_vehicle_id?: string | null
          branch_id?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          licence_expiry?: string | null
          licence_no?: string | null
          name?: string
          phone?: string | null
          rating?: number
          status?: string
          tenant_id?: string
          trips_completed?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_assigned_vehicle_id_fkey"
            columns: ["assigned_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_logs: {
        Row: {
          amount: number
          created_at: string
          driver_id: string | null
          filled_at: string
          id: string
          litres: number
          odometer_km: number
          station: string | null
          tenant_id: string
          trip_id: string | null
          vehicle_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          driver_id?: string | null
          filled_at?: string
          id?: string
          litres: number
          odometer_km?: number
          station?: string | null
          tenant_id: string
          trip_id?: string | null
          vehicle_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          driver_id?: string | null
          filled_at?: string
          id?: string
          litres?: number
          odometer_km?: number
          station?: string | null
          tenant_id?: string
          trip_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_logs_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fuel_logs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      gps_pings: {
        Row: {
          heading: number
          id: number
          lat: number
          lng: number
          recorded_at: string
          source: string
          speed_kph: number
          tenant_id: string
          trip_id: string | null
          vehicle_id: string
        }
        Insert: {
          heading?: number
          id?: number
          lat: number
          lng: number
          recorded_at?: string
          source?: string
          speed_kph?: number
          tenant_id: string
          trip_id?: string | null
          vehicle_id: string
        }
        Update: {
          heading?: number
          id?: number
          lat?: number
          lng?: number
          recorded_at?: string
          source?: string
          speed_kph?: number
          tenant_id?: string
          trip_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gps_pings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_pings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gps_pings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          amount: number
          description: string
          id: string
          invoice_id: string
          qty: number
          tenant_id: string
          unit_price: number
        }
        Insert: {
          amount?: number
          description: string
          id?: string
          invoice_id: string
          qty?: number
          tenant_id: string
          unit_price?: number
        }
        Update: {
          amount?: number
          description?: string
          id?: string
          invoice_id?: string
          qty?: number
          tenant_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          balance: number | null
          booking_id: string | null
          client_id: string
          created_at: string
          due_date: string | null
          id: string
          issue_date: string
          number: string
          pod_id: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_pct: number
          tenant_id: string
          total: number
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          balance?: number | null
          booking_id?: string | null
          client_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          issue_date?: string
          number: string
          pod_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_pct?: number
          tenant_id: string
          total?: number
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          balance?: number | null
          booking_id?: string | null
          client_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          issue_date?: string
          number?: string
          pod_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_pct?: number
          tenant_id?: string
          total?: number
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_pod_id_fkey"
            columns: ["pod_id"]
            isOneToOne: false
            referencedRelation: "pods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      job_cards: {
        Row: {
          closed_at: string | null
          cost: number
          created_at: string
          id: string
          issue: string
          opened_at: string
          parts: Json
          status: string
          tenant_id: string
          vehicle_id: string
          vendor_id: string | null
        }
        Insert: {
          closed_at?: string | null
          cost?: number
          created_at?: string
          id?: string
          issue: string
          opened_at?: string
          parts?: Json
          status?: string
          tenant_id: string
          vehicle_id: string
          vendor_id?: string | null
        }
        Update: {
          closed_at?: string | null
          cost?: number
          created_at?: string
          id?: string
          issue?: string
          opened_at?: string
          parts?: Json
          status?: string
          tenant_id?: string
          vehicle_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_cards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_cards_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_cards_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: string
          created_at: string
          event: string
          failure_reason: string | null
          id: string
          payload: Json
          read_at: string | null
          recipient: string
          recipient_user_id: string | null
          sent_at: string | null
          status: string
          template: string | null
          tenant_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          event: string
          failure_reason?: string | null
          id?: string
          payload?: Json
          read_at?: string | null
          recipient: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          template?: string | null
          tenant_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          event?: string
          failure_reason?: string | null
          id?: string
          payload?: Json
          read_at?: string | null
          recipient?: string
          recipient_user_id?: string | null
          sent_at?: string | null
          status?: string
          template?: string | null
          tenant_id?: string
        }
        Relationships: [
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
          client_id: string | null
          created_at: string
          id: string
          invoice_id: string
          method: string
          paid_at: string
          reference: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          method?: string
          paid_at?: string
          reference?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          method?: string
          paid_at?: string
          reference?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pods: {
        Row: {
          booking_id: string
          created_at: string
          file_path: string | null
          id: string
          otp: string | null
          photo_note: string | null
          receiver_name: string
          signature_seed: string | null
          tenant_id: string
          trip_id: string
          verified: boolean
        }
        Insert: {
          booking_id: string
          created_at?: string
          file_path?: string | null
          id?: string
          otp?: string | null
          photo_note?: string | null
          receiver_name: string
          signature_seed?: string | null
          tenant_id: string
          trip_id: string
          verified?: boolean
        }
        Update: {
          booking_id?: string
          created_at?: string
          file_path?: string | null
          id?: string
          otp?: string | null
          photo_note?: string | null
          receiver_name?: string
          signature_seed?: string | null
          tenant_id?: string
          trip_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pods_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pods_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          client_id: string | null
          created_at: string
          driver_id: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          tenant_id: string | null
          title: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          driver_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          tenant_id?: string | null
          title?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          driver_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          tenant_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_driver_fk"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_cards: {
        Row: {
          client_id: string
          created_at: string
          id: string
          min_charge: number
          per_km: number
          tenant_id: string
          vehicle_type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          min_charge?: number
          per_km?: number
          tenant_id: string
          vehicle_type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          min_charge?: number
          per_km?: number
          tenant_id?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_cards_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_cards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      spare_parts: {
        Row: {
          created_at: string
          id: string
          min_qty: number
          name: string
          sku: string | null
          stock_qty: number
          tenant_id: string
          unit_cost: number
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          min_qty?: number
          name: string
          sku?: string | null
          stock_qty?: number
          tenant_id: string
          unit_cost?: number
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          min_qty?: number
          name?: string
          sku?: string | null
          stock_qty?: number
          tenant_id?: string
          unit_cost?: number
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spare_parts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spare_parts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          country: string
          created_at: string
          currency: string
          id: string
          is_demo: boolean
          name: string
        }
        Insert: {
          country?: string
          created_at?: string
          currency?: string
          id?: string
          is_demo?: boolean
          name: string
        }
        Update: {
          country?: string
          created_at?: string
          currency?: string
          id?: string
          is_demo?: boolean
          name?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          booking_id: string
          checkpoints: Json
          created_at: string
          delay_mins: number
          delivered_at: string | null
          driver_cost: number
          driver_id: string | null
          eta_at: string | null
          exception: Json | null
          fuel_cost: number
          id: string
          pod_id: string | null
          progress: number
          ref: string
          revenue: number
          route: Json
          started_at: string | null
          status: string
          tenant_id: string
          toll_cost: number
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          booking_id: string
          checkpoints?: Json
          created_at?: string
          delay_mins?: number
          delivered_at?: string | null
          driver_cost?: number
          driver_id?: string | null
          eta_at?: string | null
          exception?: Json | null
          fuel_cost?: number
          id?: string
          pod_id?: string | null
          progress?: number
          ref: string
          revenue?: number
          route?: Json
          started_at?: string | null
          status?: string
          tenant_id: string
          toll_cost?: number
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          booking_id?: string
          checkpoints?: Json
          created_at?: string
          delay_mins?: number
          delivered_at?: string | null
          driver_cost?: number
          driver_id?: string | null
          eta_at?: string | null
          exception?: Json | null
          fuel_cost?: number
          id?: string
          pod_id?: string | null
          progress?: number
          ref?: string
          revenue?: number
          route?: Json
          started_at?: string | null
          status?: string
          tenant_id?: string
          toll_cost?: number
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trips_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_pod_fk"
            columns: ["pod_id"]
            isOneToOne: false
            referencedRelation: "pods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          branch_id: string | null
          capacity_tons: number
          created_at: string
          current_trip_id: string | null
          fuel_pct: number
          id: string
          is_archived: boolean
          last_ping_at: string | null
          lat: number
          lng: number
          make: string | null
          odometer_km: number
          reg_no: string
          service_due_km: number
          speed_kph: number
          status: string
          tenant_id: string
          type: string
        }
        Insert: {
          branch_id?: string | null
          capacity_tons?: number
          created_at?: string
          current_trip_id?: string | null
          fuel_pct?: number
          id?: string
          is_archived?: boolean
          last_ping_at?: string | null
          lat?: number
          lng?: number
          make?: string | null
          odometer_km?: number
          reg_no: string
          service_due_km?: number
          speed_kph?: number
          status?: string
          tenant_id: string
          type?: string
        }
        Update: {
          branch_id?: string | null
          capacity_tons?: number
          created_at?: string
          current_trip_id?: string | null
          fuel_pct?: number
          id?: string
          is_archived?: boolean
          last_ping_at?: string | null
          lat?: number
          lng?: number
          make?: string | null
          odometer_km?: number
          reg_no?: string
          service_due_km?: number
          speed_kph?: number
          status?: string
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_trip_fk"
            columns: ["current_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          category: string
          city: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          rating: number
          tenant_id: string
        }
        Insert: {
          category?: string
          city?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          rating?: number
          tenant_id: string
        }
        Update: {
          category?: string
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          rating?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_tenant: { Args: { _company_name: string }; Returns: string }
      current_client_id: { Args: never; Returns: string }
      current_driver_id: { Args: never; Returns: string }
      current_tenant_id: { Args: never; Returns: string }
      has_any_role: {
        Args: { _roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "owner"
        | "manager"
        | "dispatcher"
        | "driver"
        | "accountant"
        | "workshop"
        | "viewer"
        | "client"
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
      app_role: [
        "owner",
        "manager",
        "dispatcher",
        "driver",
        "accountant",
        "workshop",
        "viewer",
        "client",
      ],
    },
  },
} as const
