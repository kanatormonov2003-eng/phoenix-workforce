export type AppRole =
  | 'admin'
  | 'operator';

export type LineState =
  | 'online'
  | 'offline'
  | 'break'
  | 'blocked';

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

export type ExtraReason =
  | 'overtime'
  | 'other';


export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string;
          user_id: string | null;
          full_name: string | null;
          email: string | null;
          role: AppRole;
          is_active: boolean;
          line_state: LineState;
        };
        Insert: Partial<{
          id: string;
          user_id: string;
          full_name: string;
          email: string;
          role: AppRole;
          is_active: boolean;
          line_state: LineState;
        }>;
        Update: Partial<{
          full_name: string;
          email: string;
          role: AppRole;
          is_active: boolean;
          line_state: LineState;
        }>;
      };

      projects: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          name: string;
        };
        Update: {
          name?: string;
        };
      };
    };

    Views: {};

    Functions: {};
  };
}
