import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FileSizePipe } from '../../../../shared/pipes/file-size.pipe';
import { DriveService } from '../../services/drive.service';

@Component({
  selector: 'app-my-drive',
  imports: [CommonModule, FileSizePipe],
  templateUrl: './my-drive.html',
  styleUrl: './my-drive.css',
})
export class MyDrive {

  readonly driveService = inject(DriveService);

  ngOnInit(): void {
    this.driveService.loadFolderContent(null);
  }

  navigateTo(folderId: string | null): void {
    this.driveService.loadFolderContent(folderId);
  }
}
