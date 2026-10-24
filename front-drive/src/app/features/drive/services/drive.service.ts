import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, forkJoin, Observable, of, tap, throwError } from 'rxjs';
import {
  Folder,
  FileItem,
  FilesStackItem,
  FolderContentResponse,
  CreateFolderDto,
  ShareResourceDto,
  ShareUserSearchResult,
  RenameFileDto,
  RenameFolderDto,
  MoveFileDto,
  EditableFileContentResponse,
  UpdateFileContentDto,
} from '../../../core/models/drive.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DriveService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly currentFolderId = signal<string | null>(null);
  readonly currentFolder = signal<{ id: string; name: string; parentFolderId: string | null } | null>(null);
  readonly filesStack = signal<FilesStackItem[]>([]);
  readonly folders = signal<Folder[]>([]);
  readonly files = signal<FileItem[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly sortBy = signal<string>('name');
  readonly sortOrder = signal<'asc' | 'desc'>('asc');

  readonly hasContent = computed(() => this.folders().length > 0 || this.files().length > 0);
  readonly trashedFolders = signal<Folder[]>([]);
  readonly trashedFiles = signal<FileItem[]>([]);
  readonly sharedFolders = signal<Folder[]>([]);
  readonly sharedFiles = signal<any[]>([]);

  loadFolderContent(
    folderId?: string | null,
    search?: string,
    sortBy: string = 'name',
    order: 'asc' | 'desc' = 'asc'
  ): void {
    this.isLoading.set(true);
    let params = new HttpParams();

    const sanitizedFolderId = folderId && folderId !== 'undefined' && folderId !== 'null' ? folderId : null;

    if (sanitizedFolderId) {
      params = params.set('folderId', sanitizedFolderId);
    }
    if (search && search.trim() !== '') {
      params = params.set('search', search.trim());
    }
    params = params.set('sortBy', sortBy);
    params = params.set('order', order);

    this.http
      .get<FolderContentResponse>(`${this.baseUrl}/folders/content`, { params })
      .pipe(
        tap({
          next: (response) => {
            this.currentFolderId.set(sanitizedFolderId);
            this.currentFolder.set(response.currentFolder);
            this.filesStack.set(response.filesStack || []);

            const mappedFolders: Folder[] = (response.subfolders || []).map((f: any) => ({
              ...f,
              id: f.id || f._id,
              _id: f._id || f.id,
            }));

            const mappedFiles: FileItem[] = (response.files || []).map((file: any) => ({
              ...file,
              id: file.id || file._id,
              _id: file._id || file.id,
            }));

            this.folders.set(mappedFolders);
            this.files.set(mappedFiles);
            this.isLoading.set(false);
          },
          error: () => {
            this.isLoading.set(false);
          },
        })
      )
      .subscribe();
  }


  //* Crea una nueva carpeta 
  createFolder(dto: CreateFolderDto): Observable<Folder> {
    const payload = {
      name: dto.name,
      parentFolderId: dto.parentFolderId !== undefined ? dto.parentFolderId : this.currentFolderId(),
    };
    return this.http.post<Folder>(`${this.baseUrl}/folders`, payload).pipe(
      tap(() => {
        this.loadFolderContent(this.currentFolderId(), this.searchQuery(), this.sortBy(), this.sortOrder());
      })
    );
  }


  //* Envía una carpeta a la papelera

  deleteFolder(folderId: string): Observable<any> {
    if (!folderId || folderId === 'undefined' || folderId === 'null' || typeof folderId !== 'string') {
      return throwError(() => new Error('ID no válido'));
    }
    return this.http.delete(`${this.baseUrl}/folders/${folderId}`).pipe(
      tap(() => {
        this.loadFolderContent(this.currentFolderId(), this.searchQuery(), this.sortBy(), this.sortOrder());
      })
    );
  }

  restoreFolder(folderId: string): Observable<any> {
    if (!folderId || folderId === 'undefined' || folderId === 'null' || typeof folderId !== 'string') {
      return throwError(() => new Error('ID no válido'));
    }
    return this.http.patch(`${this.baseUrl}/folders/trash/${folderId}/restore`, {});
  }

  hardDeleteFolder(folderId: string): Observable<any> {
    if (!folderId || folderId === 'undefined' || folderId === 'null' || typeof folderId !== 'string') {
      return throwError(() => new Error('ID no válido'));
    }
    return this.http.delete(`${this.baseUrl}/folders/trash/${folderId}/hard`);
  }

  getTrashedFolders(): Observable<Folder[]> {
    return this.http.get<Folder[]>(`${this.baseUrl}/folders/trash`);
  }

  shareFolder(folderId: string, dto: ShareResourceDto): Observable<any> {
    if (!folderId || folderId === 'undefined' || folderId === 'null' || typeof folderId !== 'string') {
      return throwError(() => new Error('ID no válido'));
    }
    return this.http.post(`${this.baseUrl}/folders/${folderId}/share`, dto);
  }

  revokeShareFolder(folderId: string, targetUserId: string): Observable<any> {
    if (!folderId || folderId === 'undefined' || folderId === 'null' || typeof folderId !== 'string') {
      return throwError(() => new Error('ID no válido'));
    }
    return this.http.delete(`${this.baseUrl}/folders/${folderId}/share/${targetUserId}`);
  }

  uploadFile(file: File, folderId?: string | null): Observable<FileItem> {
    const formData = new FormData();
    formData.append('file', file);
    const targetFolder = folderId !== undefined ? folderId : this.currentFolderId();
    if (targetFolder && targetFolder !== 'undefined' && targetFolder !== 'null') {
      formData.append('folderId', targetFolder);
    }

    return this.http.post<FileItem>(`${this.baseUrl}/files/upload`, formData).pipe(
      tap(() => {
        this.loadFolderContent(this.currentFolderId(), this.searchQuery(), this.sortBy(), this.sortOrder());
      })
    );
  }

  deleteFile(fileId: string): Observable<any> {
    if (!fileId || fileId === 'undefined' || fileId === 'null' || typeof fileId !== 'string') {
      return throwError(() => new Error('ID no válido'));
    }
    return this.http.delete(`${this.baseUrl}/files/${fileId}`).pipe(
      tap(() => {
        this.loadFolderContent(this.currentFolderId(), this.searchQuery(), this.sortBy(), this.sortOrder());
      })
    );
  }

  restoreFile(fileId: string): Observable<any> {
    if (!fileId || fileId === 'undefined' || fileId === 'null' || typeof fileId !== 'string') {
      return throwError(() => new Error('ID no válido'));
    }
    return this.http.patch(`${this.baseUrl}/files/trash/${fileId}/restore`, {});
  }

  hardDeleteFile(fileId: string): Observable<any> {
    if (!fileId || fileId === 'undefined' || fileId === 'null' || typeof fileId !== 'string') {
      return throwError(() => new Error('ID no válido'));
    }
    return this.http.delete(`${this.baseUrl}/files/trash/${fileId}/hard`);
  }

  getTrashedFiles(): Observable<FileItem[]> {
    return this.http.get<FileItem[]>(`${this.baseUrl}/files/trash`);
  }


  //* Renombra un archivo

  renameFile(fileId: string, dto: RenameFileDto): Observable<any> {
    return this.http.patch(`${this.baseUrl}/files/${fileId}/rename`, dto).pipe(
      tap(() => {
        this.loadFolderContent(this.currentFolderId(), this.searchQuery(), this.sortBy(), this.sortOrder());
      })
    );
  }

  renameFolder(folderId: string, dto: RenameFolderDto): Observable<any> {
    return this.http.patch(`${this.baseUrl}/folders/${folderId}/rename`, dto).pipe(
      tap(() => {
        this.loadFolderContent(this.currentFolderId(), this.searchQuery(), this.sortBy(), this.sortOrder());
      }),
    );
  }


  //* Mueve un archivo a otra carpeta

  moveFile(fileId: string, dto: MoveFileDto): Observable<any> {
    return this.http.patch(`${this.baseUrl}/files/${fileId}/move`, dto).pipe(
      tap(() => {
        this.loadFolderContent(this.currentFolderId(), this.searchQuery(), this.sortBy(), this.sortOrder());
      })
    );
  }


  //* Comparte un archivo

  shareFile(fileId: string, dto: ShareResourceDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/files/${fileId}/share`, dto);
  }

  searchUsers(query: string): Observable<ShareUserSearchResult[]> {
    const params = new HttpParams().set('q', query.trim());
    return this.http.get<ShareUserSearchResult[]>(`${this.baseUrl}/users/search`, { params });
  }


  //* Revoca permisos de un archivo compartido

  revokeShareFile(fileId: string, targetUserId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/files/${fileId}/share/${targetUserId}`);
  }


  //* Actualiza el contenido de un archivo de texto/markdown

  getEditableFileContent(fileId: string): Observable<EditableFileContentResponse> {
    return this.http.get<EditableFileContentResponse>(`${this.baseUrl}/files/${fileId}/content`);
  }

  updateFileContent(fileId: string, dto: UpdateFileContentDto): Observable<any> {
    return this.http.put(`${this.baseUrl}/files/${fileId}/content`, dto).pipe(
      tap(() => {
        this.loadFolderContent(this.currentFolderId(), this.searchQuery(), this.sortBy(), this.sortOrder());
      }),
    );
  }


  //* Descarga un archivo por su ID

  downloadFile(fileId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/files/download/${fileId}`, {
      responseType: 'blob',
    });
  }


  //* Visualiza un archivo por su ID (inline)

  viewFile(fileId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/files/view/${fileId}`, {
      responseType: 'blob',
    });
  }


  //* Busca archivos por nombre

  searchFiles(name: string): Observable<FileItem[]> {
    const params = new HttpParams().set('name', name);
    return this.http.get<FileItem[]>(`${this.baseUrl}/files/search`, { params });
  }


  loadTrash(): void {
    this.isLoading.set(true);
    forkJoin({
      folders: this.getTrashedFolders(),
      files: this.getTrashedFiles()
    }).subscribe({
      next: (result) => {
        const mappedFolders: Folder[] = (result.folders || []).map((f: any) => ({
          ...f,
          id: f.id || f._id,
          _id: f._id || f.id,
        }));

        const mappedFiles: FileItem[] = (result.files || []).map((file: any) => ({
          ...file,
          id: file.id || file._id,
          _id: file._id || file.id,
        }));

        this.trashedFolders.set(mappedFolders);
        this.trashedFiles.set(mappedFiles);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  emptyTrash(): Observable<any> {
    const folderDeletions = this.trashedFolders().map(folder => {
      const id = folder.id || folder._id;
      return id ? this.hardDeleteFolder(id).pipe(catchError(() => of(null))) : of(null);
    });

    const fileDeletions = this.trashedFiles().map(file => {
      const id = file.id || file._id;
      return id ? this.hardDeleteFile(id).pipe(catchError(() => of(null))) : of(null);
    });

    const allDeletions = [...folderDeletions, ...fileDeletions];

    if (allDeletions.length === 0) return of(null);

    return forkJoin(allDeletions).pipe(
      tap(() => {
        this.loadTrash();
      })
    );
  }

  //* Cargar los recursos compartidos con el usuario actual
  loadSharedWithMe(): void {
    this.isLoading.set(true);
    this.http.get<{ folders: Folder[], files: any[] }>(`${this.baseUrl}/shares/shared-with-me`)
      .subscribe({
        next: (response) => {
          this.sharedFolders.set(response.folders || []);
          this.sharedFiles.set(response.files || []);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error al cargar elementos compartidos', err);
          this.isLoading.set(false);
        }
      });
  }
}
