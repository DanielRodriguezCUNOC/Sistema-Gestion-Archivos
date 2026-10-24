import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { extractErrorMessage } from '../../../shared/utils/http.error.js';
import {
  AdminUser,
  AdminUserListQuery,
  CreateAdminUserDto,
  UserStatusFilter,
} from '../../models/admin-user.model.js';
import { AdminUsersService } from './admin-users.service.js';

export interface Feedback {
  type: 'success' | 'error';
  text: string;
}

@Injectable()
export class UserManagementState {
  private readonly api = inject(AdminUsersService);

  readonly limit = 10;

  //* Datos
  readonly users = signal<AdminUser[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly totalPages = signal(1);

  //* Filtros
  readonly search = signal('');
  readonly status = signal<UserStatusFilter>('all');

  //* Estado de UI
  readonly isLoading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly feedback = signal<Feedback | null>(null);
  readonly updatingUserId = signal<string | null>(null);
  readonly pendingDeactivation = signal<AdminUser | null>(null);

  //* Creación
  readonly isCreateOpen = signal(false);
  readonly isCreating = signal(false);
  readonly createError = signal<string | null>(null);

  readonly rangeStart = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.limit + 1));
  readonly rangeEnd = computed(() => Math.min(this.page() * this.limit, this.total()));
  readonly hasPrevious = computed(() => this.page() > 1);
  readonly hasNext = computed(() => this.page() < this.totalPages());

  private readonly query = computed<AdminUserListQuery>(() => ({
    search: this.search(),
    status: this.status(),
    page: this.page(),
    limit: this.limit,
  }));

  private readonly reload$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();
  private feedbackTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    //* switchMap cancela la petición anterior si llega otra
    this.reload$
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.loadError.set(null);
        }),
        switchMap(() =>
          this.api.list(this.query()).pipe(
            catchError((err) => {
              this.loadError.set(extractErrorMessage(err, 'No se pudo cargar la lista de usuarios'));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((res) => {
        this.isLoading.set(false);
        if (!res) return;

        //* Si la página quedó vacía
        if (res.items.length === 0 && res.page > 1) {
          this.page.set(res.totalPages);
          this.load();
          return;
        }

        this.users.set(res.items);
        this.total.set(res.total);
        this.totalPages.set(res.totalPages);
      });

    this.searchInput$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        this.search.set(term);
        this.page.set(1);
        this.load();
      });
  }

  load(): void {
    this.reload$.next();
  }

  //* Listado y filtros
  onSearchInput(term: string): void {
    this.searchInput$.next(term.trim());
  }

  setStatus(status: UserStatusFilter): void {
    if (status === this.status()) return;
    this.status.set(status);
    this.page.set(1);
    this.load();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.page.set(page);
    this.load();
  }

  //* Cambio de estado
  requestStatusChange(user: AdminUser): void {
    if (user.isCurrentUser || this.updatingUserId()) return;

    if (user.isActive) {
      this.pendingDeactivation.set(user);
    } else {
      this.applyStatus(user, true);
    }
  }

  confirmDeactivation(): void {
    const user = this.pendingDeactivation();
    if (!user) return;
    this.pendingDeactivation.set(null);
    this.applyStatus(user, false);
  }

  cancelDeactivation(): void {
    this.pendingDeactivation.set(null);
  }

  private applyStatus(user: AdminUser, isActive: boolean): void {
    this.updatingUserId.set(user.id);

    this.api.updateStatus(user.id, isActive).subscribe({
      next: (updated) => {
        this.updatingUserId.set(null);
        this.showFeedback('success', `${updated.name} fue ${updated.isActive ? 'activado' : 'desactivado'}`);
        this.load();
      },
      error: (err) => {
        this.updatingUserId.set(null);
        this.showFeedback('error', extractErrorMessage(err, 'No se pudo cambiar el estado del usuario'));
      },
    });
  }

  //* Creación de usuario
  openCreate(): void {
    this.createError.set(null);
    this.isCreateOpen.set(true);
  }

  closeCreate(): void {
    if (this.isCreating()) return;
    this.isCreateOpen.set(false);
    this.createError.set(null);
  }

  createUser(dto: CreateAdminUserDto): void {
    this.isCreating.set(true);
    this.createError.set(null);

    this.api.create(dto).subscribe({
      next: (created) => {
        this.isCreating.set(false);
        this.isCreateOpen.set(false);
        this.showFeedback('success', `Usuario ${created.name} creado correctamente`);
        this.load();
      },
      error: (err) => {
        this.isCreating.set(false);
        this.createError.set(extractErrorMessage(err, 'No se pudo crear el usuario'));
      },
    });
  }

  dismissFeedback(): void {
    clearTimeout(this.feedbackTimer);
    this.feedback.set(null);
  }

  private showFeedback(type: Feedback['type'], text: string): void {
    clearTimeout(this.feedbackTimer);
    this.feedback.set({ type, text });
    this.feedbackTimer = setTimeout(() => this.feedback.set(null), 4000);
  }
}
