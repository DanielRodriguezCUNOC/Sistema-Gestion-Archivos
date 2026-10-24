import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { DriveService } from '../../services/drive.service';
import { Folder, FileItem } from '../../../../core/models/drive.model';
import { FileSizePipe } from '../../../../shared/pipes/file-size.pipe';

@Component({
  selector: 'app-trash',
  imports: [FileSizePipe],
  templateUrl: './trash.html',
  styleUrl: './trash.css',
})
export class Trash implements OnInit {

  readonly driveService = inject(DriveService);

  activeMenuId = signal<string | null>(null);
  isProcessing = signal(false);

  ngOnInit(): void {
    this.driveService.loadTrash();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-trigger') && !target.closest('.action-menu')) this.activeMenuId.set(null);
  }

  toggleMenu(event: Event, id?: string): void {
    event.stopPropagation();
    if (!id) return;
    this.activeMenuId.set(this.activeMenuId() === id ? null : id);
  }

  restoreFile(fileId?: string): void {
    if (!fileId || fileId === 'undefined' || fileId === 'null') return;
    this.activeMenuId.set(null);
    this.isProcessing.set(true);
    this.driveService.restoreFile(fileId).subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.driveService.loadTrash();
      },
      error: () => {
        this.isProcessing.set(false);
      },
    });
  }

  deleteFilePermanently(fileId?: string): void {
    if (!fileId || fileId === 'undefined' || fileId === 'null') return;
    this.activeMenuId.set(null);
    this.isProcessing.set(true);
    this.driveService.hardDeleteFile(fileId).subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.driveService.loadTrash();
      },
      error: () => {
        this.isProcessing.set(false);
      },
    });
  }

  restoreFolder(folderId?: string): void {
    if (!folderId || folderId === 'undefined' || folderId === 'null') return;
    this.activeMenuId.set(null);
    this.isProcessing.set(true);
    this.driveService.restoreFolder(folderId).subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.driveService.loadTrash();
      },
      error: () => {
        this.isProcessing.set(false);
      },
    });
  }

  deleteFolderPermanently(folderId?: string): void {
    if (!folderId || folderId === 'undefined' || folderId === 'null') return;
    this.activeMenuId.set(null);
    this.isProcessing.set(true);
    this.driveService.hardDeleteFolder(folderId).subscribe({
      next: () => {
        this.isProcessing.set(false);
        this.driveService.loadTrash();
      },
      error: () => {
        this.isProcessing.set(false);
      },
    });
  }

  emptyTrash(): void {
    if (confirm('¿Estás seguro de que deseas vaciar la papelera? Esta acción no se puede deshacer.')) {
      this.isProcessing.set(true);
      this.driveService.emptyTrash().subscribe({
        next: () => this.isProcessing.set(false),
        error: () => this.isProcessing.set(false),
      });
    }
  }
}
