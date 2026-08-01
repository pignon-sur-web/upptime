// Généré par scripts/generer-types.mjs — ne pas modifier à la main.
//
// Régénérer après toute migration :
//   node scripts/generer-types.mjs

export type Json =
  | string
  | number
  | boolean
  | null
  | { [cle: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          name: string
          type: string
          opening_balance_cents: number
          currency: string
          position: number
          archived: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type?: string
          opening_balance_cents?: number
          currency?: string
          position?: number
          archived?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          opening_balance_cents?: number
          currency?: string
          position?: number
          archived?: boolean
          created_at?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          id: string
          title: string
          author: string | null
          category: string | null
          status: string
          cover_path: string | null
          rating: number | null
          started_on: string | null
          finished_on: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          author?: string | null
          category?: string | null
          status?: string
          cover_path?: string | null
          rating?: number | null
          started_on?: string | null
          finished_on?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          author?: string | null
          category?: string | null
          status?: string
          cover_path?: string | null
          rating?: number | null
          started_on?: string | null
          finished_on?: string | null
          created_at?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          id: string
          category: string
          monthly_cap_cents: number
          month: string | null
        }
        Insert: {
          id?: string
          category: string
          monthly_cap_cents: number
          month?: string | null
        }
        Update: {
          id?: string
          category?: string
          monthly_cap_cents?: number
          month?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          name: string
          status: string
          last_contact: string | null
          next_followup: string | null
          email: string | null
          phone: string | null
          estimated_value_cents: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          status?: string
          last_contact?: string | null
          next_followup?: string | null
          email?: string | null
          phone?: string | null
          estimated_value_cents?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          status?: string
          last_contact?: string | null
          next_followup?: string | null
          email?: string | null
          phone?: string | null
          estimated_value_cents?: number | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          id: string
          name: string
          subject: string | null
          status: string
          resource_url: string | null
          progress: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          subject?: string | null
          status?: string
          resource_url?: string | null
          progress?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          subject?: string | null
          status?: string
          resource_url?: string | null
          progress?: number
          created_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          title: string
          starts_at: string
          ends_at: string
          all_day: boolean
          category: string | null
          location: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          starts_at: string
          ends_at: string
          all_day?: boolean
          category?: string | null
          location?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          starts_at?: string
          ends_at?: string
          all_day?: boolean
          category?: string | null
          location?: string | null
          created_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          id: string
          name: string
          category: string | null
          status: string
          priority: number | null
          start_date: string | null
          due_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category?: string | null
          status?: string
          priority?: number | null
          start_date?: string | null
          due_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string | null
          status?: string
          priority?: number | null
          start_date?: string | null
          due_date?: string | null
          created_at?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          id: string
          habit_id: string
          date: string
          done: boolean
        }
        Insert: {
          id?: string
          habit_id: string
          date: string
          done?: boolean
        }
        Update: {
          id?: string
          habit_id?: string
          date?: string
          done?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          id: string
          name: string
          emoji: string | null
          position: number
          started_on: string
          archived_on: string | null
          days_of_week: number[]
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          emoji?: string | null
          position?: number
          started_on?: string
          archived_on?: string | null
          days_of_week?: number[]
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          emoji?: string | null
          position?: number
          started_on?: string
          archived_on?: string | null
          days_of_week?: number[]
          created_at?: string
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          id: string
          source: string | null
          row_count: number
          created_at: string
        }
        Insert: {
          id?: string
          source?: string | null
          row_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          source?: string | null
          row_count?: number
          created_at?: string
        }
        Relationships: []
      }
      inbox_items: {
        Row: {
          id: string
          content: string
          guessed_type: string | null
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          content: string
          guessed_type?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          guessed_type?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          id: string
          date: string
          mood: number | null
          done_text: string | null
          carry_over_text: string | null
          free_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          date?: string
          mood?: number | null
          done_text?: string | null
          carry_over_text?: string | null
          free_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          mood?: number | null
          done_text?: string | null
          carry_over_text?: string | null
          free_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      key_results: {
        Row: {
          id: string
          goal_id: string
          name: string
          unit: string | null
          start_value: number
          current_value: number
          target_value: number
          position: number
        }
        Insert: {
          id?: string
          goal_id: string
          name: string
          unit?: string | null
          start_value?: number
          current_value?: number
          target_value: number
          position?: number
        }
        Update: {
          id?: string
          goal_id?: string
          name?: string
          unit?: string | null
          start_value?: number
          current_value?: number
          target_value?: number
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "key_results_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          id: string
          title: string
          content: string
          tags: string[]
          created_at: string
          updated_at: string
          search_vector: unknown | null
        }
        Insert: {
          id?: string
          title?: string
          content?: string
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          name: string
          status: string
          priority: number | null
          start_date: string | null
          due_date: string | null
          client_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          status?: string
          priority?: number | null
          start_date?: string | null
          due_date?: string | null
          client_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          status?: string
          priority?: number | null
          start_date?: string | null
          due_date?: string | null
          client_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_fk"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          title: string
          priority: number | null
          status: string
          due_date: string | null
          context: string | null
          note: string | null
          project_id: string | null
          parent_task_id: string | null
          key_result_id: string | null
          recurrence: string | null
          recurrence_anchor: string
          series_id: string
          series_origin_date: string | null
          occurrence_index: number
          import_batch_id: string | null
          done_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          priority?: number | null
          status?: string
          due_date?: string | null
          context?: string | null
          note?: string | null
          project_id?: string | null
          parent_task_id?: string | null
          key_result_id?: string | null
          recurrence?: string | null
          recurrence_anchor?: string
          series_id?: string
          series_origin_date?: string | null
          occurrence_index?: number
          import_batch_id?: string | null
          done_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          priority?: number | null
          status?: string
          due_date?: string | null
          context?: string | null
          note?: string | null
          project_id?: string | null
          parent_task_id?: string | null
          key_result_id?: string | null
          recurrence?: string | null
          recurrence_anchor?: string
          series_id?: string
          series_origin_date?: string | null
          occurrence_index?: number
          import_batch_id?: string | null
          done_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "key_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          id: string
          account_id: string
          date: string
          label: string
          amount_cents: number
          kind: string
          category: string | null
          note: string | null
          transfer_group_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          date?: string
          label: string
          amount_cents: number
          kind: string
          category?: string | null
          note?: string | null
          transfer_group_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          date?: string
          label?: string
          amount_cents?: number
          kind?: string
          category?: string | null
          note?: string | null
          transfer_group_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      upcoming_payments: {
        Row: {
          id: string
          name: string
          due_date: string
          amount_cents: number
          category: string | null
          account_id: string | null
          recurrence: string | null
          series_id: string
          series_origin_date: string | null
          occurrence_index: number
          paid_at: string | null
          paid_transaction_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          due_date: string
          amount_cents: number
          category?: string | null
          account_id?: string | null
          recurrence?: string | null
          series_id?: string
          series_origin_date?: string | null
          occurrence_index?: number
          paid_at?: string | null
          paid_transaction_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          due_date?: string
          amount_cents?: number
          category?: string | null
          account_id?: string | null
          recurrence?: string | null
          series_id?: string
          series_origin_date?: string | null
          occurrence_index?: number
          paid_at?: string | null
          paid_transaction_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upcoming_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upcoming_payments_paid_transaction_id_fkey"
            columns: ["paid_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      widget_settings: {
        Row: {
          id: string
          widget_key: string
          enabled: boolean
          position: number
        }
        Insert: {
          id?: string
          widget_key: string
          enabled?: boolean
          position?: number
        }
        Update: {
          id?: string
          widget_key?: string
          enabled?: boolean
          position?: number
        }
        Relationships: []
      }
      workouts: {
        Row: {
          id: string
          date: string
          type: string
          muscle_groups: string[]
          duration_min: number | null
          feeling: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          date?: string
          type: string
          muscle_groups?: string[]
          duration_min?: number | null
          feeling?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          type?: string
          muscle_groups?: string[]
          duration_min?: number | null
          feeling?: number | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      avancement_projet: {
        Row: {
          project_id: string | null
          taches_total: number | null
          taches_faites: number | null
          avancement: number | null
          jours_restants: number | null
        }
        Relationships: []
      }
      budget_statut: {
        Row: {
          mois: string | null
          category: string | null
          depense_cents: number | null
          plafond_cents: number | null
          consommation: number | null
        }
        Relationships: []
      }
      depenses_par_categorie: {
        Row: {
          mois: string | null
          category: string | null
          depense_cents: number | null
          depense_precedente_cents: number | null
          variation_cents: number | null
        }
        Relationships: []
      }
      finances_mensuelles: {
        Row: {
          mois: string | null
          entrees_cents: number | null
          sorties_cents: number | null
          net_cents: number | null
          ajustements_cents: number | null
          nb_ecritures: number | null
        }
        Relationships: []
      }
      progression_objectif: {
        Row: {
          goal_id: string | null
          nb_resultats: number | null
          progression: number | null
        }
        Relationships: []
      }
      progression_resultat_cle: {
        Row: {
          id: string | null
          goal_id: string | null
          name: string | null
          unit: string | null
          start_value: number | null
          current_value: number | null
          target_value: number | null
          position: number | null
          progression: number | null
        }
        Relationships: []
      }
      score_habitude_jour: {
        Row: {
          date: string | null
          attendues: number | null
          cochees: number | null
          score: number | null
        }
        Relationships: []
      }
      solde_compte: {
        Row: {
          account_id: string | null
          name: string | null
          type: string | null
          currency: string | null
          position: number | null
          archived: boolean | null
          opening_balance_cents: number | null
          solde_cents: number | null
          solde_pointe_cents: number | null
          nb_ecritures: number | null
          derniere_ecriture: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      app_today: {
        Args: Record<string, never>
        Returns: string | null
      }
      completer_tache: {
        Args: {
          p_task_id: string
        }
        Returns: string | null
      }
      enregistrer_ajustement: {
        Args: {
          p_compte_id: string
          p_solde_reel_cents: number
          p_date?: string
          p_note?: string
        }
        Returns: { transaction_id: string | null; calcule_cents: number | null; ecart_cents: number | null }[]
      }
      enregistrer_virement: {
        Args: {
          p_compte_source: string
          p_compte_destination: string
          p_montant_cents: number
          p_date?: string
          p_libelle?: string
          p_note?: string
        }
        Returns: string | null
      }
      passer_tache: {
        Args: {
          p_task_id: string
        }
        Returns: string | null
      }
      payer_echeance: {
        Args: {
          p_echeance_id: string
          p_compte_id?: string
          p_date?: string
        }
        Returns: string | null
      }
      serie_globale: {
        Args: Record<string, never>
        Returns: number | null
      }
      serie_habitude: {
        Args: {
          p_habit_id: string
        }
        Returns: number | null
      }
      supprimer_virement: {
        Args: {
          p_groupe: string
        }
        Returns: number | null
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
