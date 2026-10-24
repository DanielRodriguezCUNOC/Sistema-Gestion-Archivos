export interface FileTypeReport {
  type: string;
  totalFiles: number;
  totalBytes: number;
  totalMB: number;
  mimeTypes: string[];
}

export interface FileByDateReport {
  period: { startDate: string; endDate: string };
  totalFilesFound: number;
  files: {
    id: string;
    filename: string;
    uploadDate: string;
    sizeInBytes: number;
    sizeInKB: number;
    contentType: string;
    owner: { id: string; name: string; email: string };
  }[];
}

export interface TopActiveFileReport {
  id: string;
  filename: string;
  totalOperations: number;
  lastActivity: string;
  actionsPerformed: string[];
  sizeInBytes: number;
  owner: { id: string; name: string; email: string };
}

export interface TopUserFileReport {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  totalFiles: number;
  totalBytes: number;
  totalMB: number;
}

export interface TopSharedUserReport {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  sharedFilesCount: number;
  sharedFoldersCount: number;
  totalResourcesShared: number;
  totalPermissionsGranted: number;
}

export interface TopSharedFileReport {
  id: string;
  filename: string;
  sharedWithCount: number;
  sizeInBytes: number;
  contentType: string;
  owner: { id: string; name: string; email: string; avatarUrl?: string };
}

export interface SharedResourcesReport {
  owner: { id: string; name: string; email: string; avatarUrl?: string } | null;
  summary: { totalSharedFiles: number; totalSharedFolders: number; totalSharedResources: number };
  resources: {
    files: any[];
    folders: any[];
  };
}

export interface UserActivityReport {
  period: { startDate: string; endDate: string };
  totalActivities: number;
  activities: {
    id: string;
    action: string;
    resourceId: string;
    resourceType: string;
    resourceName: string;
    createdAt: string;
    user: { id: string; name: string; email: string };
  }[];
}

export interface ReceivedResourcesReport {
  receiver: { id: string; name: string; email: string } | null;
  summary: { totalReceivedFiles: number; totalReceivedFolders: number; totalReceivedResources: number };
  resources: { files: any[]; folders: any[] };
}

export interface OperationsSummaryReport {
  period: { startDate: string; endDate: string };
  totalOperations: number;
  summary: { action: string; count: number }[];
}

export interface TopActionReport {
  action: string;
  count: number;
  percentage: number;
}

export interface TopActionsResponse {
  period: { startDate: string; endDate: string };
  limitApplied: number;
  totalOperationsInPeriod: number;
  topActions: TopActionReport[];
}

export interface OperationsByPeriodResponse {
  groupingPeriod: 'DAILY' | 'MONTHLY' | 'YEARLY';
  dateRange: { startDate: string; endDate: string };
  totalOperations: number;
  summary: { period: string; count: number }[];
}