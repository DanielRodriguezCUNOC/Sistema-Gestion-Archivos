export interface ActivityUser {
  _id?: string;
  name?: string;
  email?: string;
}

export interface ActivityLogItem {
  _id: string;
  action: string;
  resourceType: 'FILE' | 'FOLDER' | 'USER';
  resourceName: string;
  details?: Record<string, any>;
  createdAt: string;
  userId?: ActivityUser;
}