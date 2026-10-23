import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { FileSizePipe } from '../../../../shared/pipes/file-size.pipe';
import { DriveService } from '../../services/drive.service';
import { FormsModule } from '@angular/forms';
import { FileItem } from '../../../../core/models/drive.model';
import { DropTargetDirective } from '../../../../shared/directives/drop-target.directive';

@Component({
  selector: 'app-my-drive',
  imports: [CommonModule, FileSizePipe, FormsModule, DropTargetDirective],
  templateUrl: './my-drive.html',
  styleUrl: './my-drive.css',
})
export class MyDrive {

  readonly driveService = inject(DriveService);

  //* Estados de modales y formulares
  isCreateFolderModalOpen = signal(false);
  newFolderName = signal('');
  isRenameModalOpen = signal(false);
  itemToRename = signal<FileItem | null>(null);
  newName = signal('');
  isProcessing = signal(false);
  isUploading = signal(false);
  activeMenuId = signal<string | null>(null);

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
    this.itemToRename.set(file);
    this.newName.set(file.filename);
    this.isRenameModalOpen.set(true);
  }

  closeRenameModal(): void {
    this.isRenameModalOpen.set(false);
    this.itemToRename.set(null);
  }

  confirmRename(): void {
    const name = this.newName().trim();
    const file = this.itemToRename();
    if (!name || !file) return;

    this.isProcessing.set(true);
    this.driveService.renameFile(file.id, { filename: name })
      .subscribe({
        next: () => {
          this.closeRenameModal();
          this.isProcessing.set(false);
        },
        error: () => this.isProcessing.set(false)
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
