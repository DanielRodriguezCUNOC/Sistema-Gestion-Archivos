export interface QuickStats {
  totalUsers: number;
  totalStorageUsed: number;
  totalFiles: number;
  totalActivitiesToday: number;
}

export interface AdminActionCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  badge?: string;
  color: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky';
}