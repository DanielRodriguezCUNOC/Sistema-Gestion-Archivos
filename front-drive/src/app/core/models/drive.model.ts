export type PermissionLevel = 'read' | 'write' | 'comment' | 'edit';

export interface SharedUser {
  userId: string;
  permission: PermissionLevel;
}

export interface Folder {
  id: string;
  name: string;
  owner: string;
  parentFolderId: string | null;
  isTrash: boolean;
  deletedAt: string | null;
  sharedWith: SharedUser[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FileItem {
  id: string;
  filename: string;
  length: number;
  uploadDate: string;
  contentType?: string;
  folderId: string | null;
  deletedAt?: string | null;
}

export interface FilesStackItem {
  id: string;
  name: string;
}

export interface FolderContentResponse {
  currentFolder: {
    id: string;
    name: string;
    parentFolderId: string | null;
  } | null;
  filesStack: FilesStackItem[];
  subfolders: Folder[];
  files: FileItem[];
}

export interface CreateFolderDto {
  name: string;
  parentFolderId?: string | null;
}

export interface ShareResourceDto {
  targetUserId: string;
  permission: PermissionLevel;
}

export interface RenameFileDto {
  filename: string;
}

export interface MoveFileDto {
  targetFolderId?: string | null;
}

export interface UpdateFileContentDto {
  content: string;
  version: number;
}
