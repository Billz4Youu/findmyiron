export type BorrowStatus = 'waiting' | 'borrowed' | 'returned' | 'cancelled';

export interface IronStatus {
  id: number;
  is_available: boolean;
  current_borrower: string | null;
  current_room: string | null;
  borrowed_at: string | null;
  active_history_id: string | null;
  updated_at: string;
}

export interface BorrowHistory {
  id: string;
  borrower_name: string;
  room_number: string;
  status: BorrowStatus;
  borrowed_at: string | null;
  returned_at: string | null;
  created_at: string;
}

