import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, finalize, of, switchMap } from 'rxjs';
import { ShareResourceDto, ShareUserSearchResult } from '../../../core/models/drive.model';
import { DriveService } from '../../../features/drive/services/drive.service';

@Component({
  selector: 'app-share-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './share-modal.html',
  styleUrl: './share-modal.css',
})
export class ShareModal {

  private readonly driveService = inject(DriveService);
  private readonly search$ = new Subject<string>();

  @Input() itemName = '';
  @Input() isFolder = false;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<ShareResourceDto>();

  isProcessing = signal(false);
  isSearching = signal(false);
  isSuggestionsOpen = signal(false);
  suggestions = signal<ShareUserSearchResult[]>([]);
  userQuery = signal('');
  selectedUser = signal<ShareUserSearchResult | null>(null);

  formData: ShareResourceDto = {
    targetUserId: '',
    permission: 'read',
  }

  constructor() {
    this.search$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.trim().length < 2) {
            this.suggestions.set([]);
            this.isSuggestionsOpen.set(false);
            return of([] as ShareUserSearchResult[]);
          }

          this.isSearching.set(true);
          return this.driveService.searchUsers(query).pipe(
            finalize(() => this.isSearching.set(false)),
          );
        }),
      )
      .subscribe((users) => {
        this.suggestions.set(users);
        this.isSuggestionsOpen.set(users.length > 0);
      });
  }

  onUserQueryChange(value: string): void {
    this.userQuery.set(value);

    if (!this.selectedUser() || this.selectedUser()?.email !== value) {
      this.selectedUser.set(null);
      this.formData.targetUserId = '';
    }

    this.search$.next(value);
  }

  selectUser(user: ShareUserSearchResult): void {
    this.selectedUser.set(user);
    this.userQuery.set(user.email);
    this.formData.targetUserId = user.id;
    this.isSuggestionsOpen.set(false);
  }

  onUserInputBlur(): void {
    setTimeout(() => this.isSuggestionsOpen.set(false), 150);
  }

  onUserInputFocus(): void {
    if (this.suggestions().length > 0) {
      this.isSuggestionsOpen.set(true);
    }
  }

  onSubmit(): void {
    if (this.formData.targetUserId) {
      this.isProcessing.set(true);
      this.confirm.emit(this.formData);
    }
  }
}
