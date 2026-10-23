import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { FileSizePipe } from '../../../../shared/pipes/file-size.pipe';
import { DriveService } from '../../services/drive.service';

@Component({
  selector: 'app-shared',
  imports: [CommonModule, FileSizePipe],
  templateUrl: './shared.html',
  styleUrl: './shared.css',
})
export class Shared implements OnInit {
  readonly driveService = inject(DriveService);
  activeMenuId = signal<string | null>(null);

  ngOnInit(): void {
    this.driveService.loadSharedWithMe();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-trigger') && !target.closest('.action-menu')) {
      this.activeMenuId.set(null);
    }
  }

  toggleMenu(event: Event, id: string): void {
    event.stopPropagation();
    this.activeMenuId.set(this.activeMenuId() === id ? null : id);
  }

  downloadFile(fileId: string, filename: string): void {
    this.activeMenuId.set(null);
    this.driveService.downloadFile(fileId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Error al descargar:', err)
    });
  }
}
