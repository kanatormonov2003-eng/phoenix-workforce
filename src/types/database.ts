export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type AppRole = 'admin' | 'operator';
export type ShiftStatus = 'online' | 'closed' | 'auto_closed' | 'absent';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ExtraReason = 'replacement' | 'peak_load' | 'training' | 'other';
export type LineState = 'online' | 'offline' | 'late' | 'blocked';

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };
export interface Database {
  public: {
    Tables: {
      profiles: Table<{id:string;email:string;first_name:string;last_name:string;full_name:string;role:AppRole;is_active:boolean;avatar_url:string|null;deleted_at:string|null;created_at:string;updated_at:string}>;
      projects: Table<{id:string;name:string;code:string;color:string;is_active:boolean;created_at:string}>;
      employees: Table<{id:string;user_id:string;project_id:string|null;default_schedule:string;default_start:string;default_end:string;timezone:string;phone:string|null;hired_at:string;active:boolean;blocked_at:string|null;blocked_reason:string|null;deleted_at:string|null;created_by:string|null;created_at:string;updated_at:string}>;
      shifts: Table<{id:string;employee_id:string;work_date:string;started_at:string;ended_at:string|null;status:ShiftStatus;total_minutes:number|null;closed_by:string|null;note:string|null;created_at:string}>;
      additional_hours: Table<{id:string;employee_id:string;work_date:string;hours:number;reason:ExtraReason;comment:string;status:ApprovalStatus;approved_by:string|null;approved_at:string|null;created_at:string;updated_at:string}>;
      daily_schedules: Table<{id:string;employee_id:string;work_date:string;planned_start:string;planned_end:string;extra_hours:number;reason:ExtraReason|null;comment:string;status:ApprovalStatus;reviewed_by:string|null;reviewed_at:string|null;created_at:string;updated_at:string}>;
      notification_settings: Table<{id:boolean;telegram_enabled:boolean;telegram_chat_id:string|null;late_threshold_minutes:number;notify_on_start:boolean;notify_on_end:boolean;notify_on_late:boolean;updated_by:string|null;updated_at:string}>;
      notification_log: Table<{id:string;kind:string;employee_id:string|null;payload:Json;delivered:boolean;error:string|null;created_at:string}>;
      audit_log: Table<{id:string;actor_id:string|null;action:string;entity:string;entity_id:string|null;diff:Json;created_at:string}>;
      notification_jobs: Table<{id:string;kind:string;payload:Json;status:'pending'|'processing'|'delivered'|'failed'|'dead';attempts:number;next_attempt_at:string;locked_at:string|null;delivered_at:string|null;last_error:string|null;processed_at:string|null;created_at:string}>;
    };
    Views: { v_line_status:{Row:{employee_id:string;user_id:string;full_name:string;email:string;project:string;default_schedule:string;active:boolean;blocked:boolean;shift_id:string|null;started_at:string|null;started_label:string|null;line_state:LineState;today_minutes:number;planned_start:string|null;planned_end:string|null;extra_hours:number|null}}; v_daily_summary:{Row:{employee_id:string;work_date:string;full_name:string;project:string;first_start:string|null;last_end:string|null;worked_hours:number;extra_hours:number;shifts_count:number}}; v_schedule_feed:{Row:{id:string;work_date:string;employee_id:string;full_name:string;project:string;planned_start:string;planned_end:string;extra_hours:number;reason:ExtraReason|null;comment:string;status:ApprovalStatus;created_at:string}} };
    Functions: {
      start_shift:{Args:Record<string,never>;Returns:Database['public']['Tables']['shifts']['Row']};
      end_shift:{Args:{p_note?:string|null};Returns:Database['public']['Tables']['shifts']['Row']};
      save_daily_schedule:{Args:{p_work_date:string;p_planned_start:string;p_planned_end:string;p_extra_hours?:number;p_reason?:ExtraReason|null;p_comment?:string};Returns:Database['public']['Tables']['daily_schedules']['Row']};
      admin_set_block:{Args:{p_employee_id:string;p_blocked:boolean;p_reason?:string|null};Returns:Database['public']['Tables']['employees']['Row']};
      admin_dashboard_stats:{Args:{p_date?:string};Returns:Json};
      admin_monthly_report:{Args:{p_from:string;p_to:string};Returns:{employee_id:string;full_name:string;project:string;shifts_count:number;base_hours:number;extra_hours:number;total_hours:number}[]};
      claim_notification_job:{Args:{p_limit?:number};Returns:Database['public']['Tables']['notification_jobs']['Row'][]>;
      claim_notification_jobs:{Args:{p_limit?:number};Returns:Database['public']['Tables']['notification_jobs']['Row'][]>;
      complete_notification_job:{Args:{p_id:string;p_success:boolean;p_error?:string|null};Returns:null};
      is_admin:{Args:Record<string,never>;Returns:boolean};
      current_employee_id:{Args:Record<string,never>;Returns:string|null};
    };
    Enums:{app_role:AppRole;shift_status:ShiftStatus;approval_status:ApprovalStatus;extra_reason:ExtraReason};
    CompositeTypes:{[_ in never]:never};
  };
}
