import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  Folder,
  FileItem,
  FilesStackItem,
  FolderContentResponse,
  CreateFolderDto,
  ShareResourceDto,
  RenameFileDto,
  MoveFileDto,
  UpdateFileContentDto,
} from '../../../core/models/drive.model';

@Injectable({
  providedIn: 'root',
})
export class DriveService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api';

  //* Signals para manejar el estado de la aplicación
  readonly currentFolderId = signal<string | null>(null);
  readonly currentFolder = signal<{ id: string; name: string; parentFolderId: string | null } | null>(null);
  readonly filesStack = signal<FilesStackItem[]>([]);
  readonly folders = signal<Folder[]>([]);
  readonly files = signal<FileItem[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly sortBy = signal<string>('name');
  readonly sortOrder = signal<'asc' | 'desc'>('asc');

  //* Propiedad computada para determinar si hay contenido en la carpeta actual
  readonly hasContent = computed(() => this.folders().length > 0 || this.files().length > 0);

  /*
   * Carga el contenido de una carpeta
   *  o resultados de búsqueda
   */
  loadFolderContent(
    folderId?: string | null,
    search?: string,
    sortBy: string = 'name',
    order: 'asc' | 'desc' = 'asc'
  ): void {
    this.isLoading.set(true);
    let params = new HttpParams();

    if (folderId) {
      params = params.set('folderId', folderId);
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
            this.currentFolderId.set(folderId || null);
            this.currentFolder.set(response.currentFolder);
            this.filesStack.set(response.filesStack || []);
            this.folders.set(response.subfolders || []);
            this.files.set(response.files || []);
            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('Error al cargar contenido de la carpeta', err);
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
    return this.http.delete(`${this.baseUrl}/folders/${folderId}`).pipe(
      tap(() => {
        this.loadFolderContent(this.currentFolderId(), this.searchQuery(), this.sortBy(), this.sortOrder());
      })
    );
  }


  //* Restaura una carpeta de la papelera

  restoreFolder(folderId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/folders/trash/${folderId}/restore`, {});
  }


  //* Elimina permanentemente una carpeta de la papelera

  hardDeleteFolder(folderId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/folders/trash/${folderId}/hard`);
  }


  //* Obtiene carpetas en la papelera

  getTrashedFolders(): Observable<Folder[]> {
    return this.http.get<Folder[]>(`${this.baseUrl}/folders/trash`);
  }


  //* Comparte una carpeta

  shareFolder(folderId: string, dto: ShareResourceDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/folders/${folderId}/share`, dto);
  }


  //* Revoca permisos de una carpeta compartida

  revokeShareFolder(folderId: string, targetUserId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/folders/${folderId}/share/${targetUserId}`);
  }


  //* Sube un archivo (soporta .txt y .md)

  uploadFile(file: File, folderId?: string | null): Observable<FileItem> {
    const formData = new FormData();
    formData.append('file', file);
    const targetFolder = folderId !== undefined ? folderId : this.currentFolderId();
    if (targetFolder) {
      formData.append('folderId', targetFolder);
    }

    return this.http.post<FileItem>(`${this.baseUrl}/files/upload`, formData).pipe(
      tap(() => {
        this.loadFolderContent(this.currentFolderId(), this.searchQuery(), this.sortBy(), this.sortOrder());
      })
    );
  }

  //* Envía un archivo a la papelera

  deleteFile(fileId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/files/${fileId}`).pipe(
      tap(() => {
        this.loadFolderContent(this.currentFolderId(), this.searchQuery(), this.sortBy(), this.sortOrder());
      })
    );
  }

  //* Restaura un archivo de la papelera

  restoreFile(fileId: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/files/trash/${fileId}/restore`, {});
  }


  //* Elimina permanentemente un archivo de la papelera

  hardDeleteFile(fileId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/files/trash/${fileId}/hard`);
  }


  //* Obtiene archivos en la papelera

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


  //* Revoca permisos de un archivo compartido

  revokeShareFile(fileId: string, targetUserId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/files/${fileId}/share/${targetUserId}`);
  }


  //* Actualiza el contenido de un archivo de texto/markdown

  updateFileContent(fileId: string, dto: UpdateFileContentDto): Observable<any> {
    return this.http.put(`${this.baseUrl}/files/${fileId}/content`, dto);
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
}
