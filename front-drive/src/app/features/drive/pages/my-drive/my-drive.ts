import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { FileSizePipe } from '../../../../shared/pipes/file-size.pipe';
import { DriveService } from '../../services/drive.service';
import { FormsModule } from '@angular/forms';
import { FileItem, Folder, ShareResourceDto } from '../../../../core/models/drive.model';
import { DropTargetDirective } from '../../../../shared/directives/drop-target.directive';
import { ShareModal } from '../../../../shared/components/share-modal/share-modal';

@Component({
  selector: 'app-my-drive',
  imports: [CommonModule, FileSizePipe, FormsModule, DropTargetDirective, ShareModal],
  templateUrl: './my-drive.html',
  styleUrl: './my-drive.css',
})
export class MyDrive {

  readonly driveService = inject(DriveService);

  //* Estados de modales y formulares
  isCreateFolderModalOpen = signal(false);
  newFolderName = signal('');
  isRenameModalOpen = signal(false);
  itemToRename = signal<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);
  newName = signal('');
  isProcessing = signal(false);
  isUploading = signal(false);
  activeMenuId = signal<string | null>(null);
  itemToShare = signal<{ id: string, name: string, isFolder: boolean } | null>(null);
  isEditModalOpen = signal(false);
  editedFile = signal<{ id: string; filename: string; version: number } | null>(null);
  editContent = signal('');
  isSavingEdit = signal(false);

  openShareModal(id: string, name: string, isFolder: boolean): void {
    this.itemToShare.set({ id, name, isFolder });
    this.activeMenuId.set(null);
  }

  onShareConfirm(data: ShareResourceDto): void {
    const item = this.itemToShare();
    if (!item) return;

    const request$ = item.isFolder
      ? this.driveService.shareFolder(item.id, data)
      : this.driveService.shareFile(item.id, data);

    request$.subscribe({
      next: () => this.itemToShare.set(null),
      error: (err) => {
        console.error('Error al compartir recurso', err);
        this.itemToShare.set(null);
      }
    })
  }

  //* Método para inicializar el drag
  onDragStart(event: DragEvent, fileId: string): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', fileId);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  //* Método para procesar el drop interceptado por la directiva
  moveItem(fileId: string, targetFolderId: string | null): void {
    //* Evitamos llamadas innecesarias si se suelta en la misma carpeta actual
    if (targetFolderId === this.driveService.currentFolderId()) return;

    this.isProcessing.set(true);
    this.driveService.moveFile(fileId, { targetFolderId }).subscribe({
      next: () => {
        this.isProcessing.set(false);
        //* La vista se recarga automáticamente por el tap() en el DriveService
      },
      error: (err) => {
        console.error('Error al mover archivo', err);
        this.isProcessing.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.driveService.loadFolderContent(null);
  }

  navigateTo(folderId: string | null): void {
    this.driveService.loadFolderContent(folderId);
  }

  //* Crear carpeta
  openCreateFolderModal(): void {
    this.newFolderName.set('');
    this.isCreateFolderModalOpen.set(true);
  }

  closeCreateFolderModal(): void {
    this.isCreateFolderModalOpen.set(false);
  }

  confirmCreateFolder(): void {
    const name = this.newFolderName().trim();
    if (!name) return;

    this.isProcessing.set(true);
    this.driveService.createFolder({ name, parentFolderId: this.driveService.currentFolderId() })
      .subscribe({
        next: () => {
          this.closeCreateFolderModal();
          this.isProcessing.set(false);
        },
        error: () => this.isProcessing.set(false)
      });
  }

  //* Renombrar 
  openRenameFileModal(file: FileItem): void {
    this.itemToRename.set({ id: file.id, name: file.filename, type: 'file' });
    this.newName.set(file.filename);
    this.isRenameModalOpen.set(true);
  }

  openRenameFolderModal(folder: Folder): void {
    this.itemToRename.set({ id: folder.id, name: folder.name, type: 'folder' });
    this.newName.set(folder.name);
    this.isRenameModalOpen.set(true);
  }

  closeRenameModal(): void {
    this.isRenameModalOpen.set(false);
    this.itemToRename.set(null);
  }

  confirmRename(): void {
    const name = this.newName().trim();
    const item = this.itemToRename();
    if (!name || !item) return;

    this.isProcessing.set(true);
    const request$ = item.type === 'folder'
      ? this.driveService.renameFolder(item.id, { name })
      : this.driveService.renameFile(item.id, { filename: name });

    request$
      .subscribe({
        next: () => {
          this.closeRenameModal();
          this.isProcessing.set(false);
        },
        error: () => this.isProcessing.set(false)
      });
  }

  isTextEditable(file: FileItem): boolean {
    const lower = file.filename.toLowerCase();
    return lower.endsWith('.txt') || lower.endsWith('.md');
  }

  openEditModal(file: FileItem): void {
    if (!this.isTextEditable(file)) {
      return;
    }

    this.activeMenuId.set(null);
    this.isProcessing.set(true);
    this.driveService.getEditableFileContent(file.id).subscribe({
      next: (response) => {
        this.editedFile.set({
          id: response.id,
          filename: response.filename,
          version: response.version,
        });
        this.editContent.set(response.content);
        this.isEditModalOpen.set(true);
        this.isProcessing.set(false);
      },
      error: (err) => {
        console.error('Error al abrir editor', err);
        this.isProcessing.set(false);
      },
    });
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.editedFile.set(null);
    this.editContent.set('');
  }

  saveEditedFile(): void {
    const file = this.editedFile();
    if (!file) {
      return;
    }

    this.isSavingEdit.set(true);
    this.driveService.updateFileContent(file.id, {
      content: this.editContent(),
      version: file.version,
    }).subscribe({
      next: (response) => {
        this.isSavingEdit.set(false);
        this.closeEditModal();
        if (response?.version) {
          file.version = response.version;
        }
      },
      error: (err) => {
        this.isSavingEdit.set(false);
        if (err?.status === 409) {
          alert('Conflicto de versión: el archivo fue modificado por otro usuario. Recarga y vuelve a intentar.');
          return;
        }
        console.error('Error al guardar cambios de archivo', err);
      },
    });
  }

  //* Se ejecuta cuando se selecciona un archivo para subir
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    //* Si no hay archivos seleccionados se cancela todo 
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.isUploading.set(true);

    //* Se llama al servicio para subir el archivo
    this.driveService.uploadFile(file).subscribe({
      next: () => {
        this.isUploading.set(false);
        input.value = '';
      },

      error: (err) => {
        console.error('Error al subir archivo', err);
        this.isUploading.set(false);
        input.value = '';
      }
    })
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-trigger') && !target.closest('.action-menu')) this.activeMenuId.set(null);
  }

  toggleMenu(event: Event, id: string): void {
    event.stopPropagation();
    this.activeMenuId.set(this.activeMenuId() === id ? null : id);
  }

  //* Accione para el menu contextual de cada archivo
  deleteFile(fileId: string): void {
    this.isProcessing.set(true);
    this.activeMenuId.set(null);
    this.driveService.deleteFile(fileId).subscribe({
      next: () => this.isProcessing.set(false),
      error: () => this.isProcessing.set(false)
    });
  }

  deleteFolder(folderId: string): void {
    this.isProcessing.set(true);
    this.activeMenuId.set(null);
    this.driveService.deleteFolder(folderId).subscribe({
      next: () => this.isProcessing.set(false),
      error: () => this.isProcessing.set(false)
    });
  }

  downloadFile(fileId: string, filename: string): void {
    this.activeMenuId.set(null);
    this.driveService.downloadFile(fileId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error al descargar archivo', err)
    })
  }
}
