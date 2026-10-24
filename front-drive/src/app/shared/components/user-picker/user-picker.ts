import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, HostListener, inject, input, output, signal } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { UserOption } from '../../utils/user-option.interface';
import { ReportsService } from '../../../features/dashboard/services/reports.service';

@Component({
  selector: 'app-user-picker',
  imports: [],
  templateUrl: './user-picker.html',
  styleUrl: './user-picker.css',
})
export class UserPicker {
  private readonly http = inject(HttpClient);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly reportsService = inject(ReportsService);

  placeholder = input('Buscar usuario por nombre o correo...');
  userSelected = output<UserOption | null>();

  query = signal('');
  open = signal(false);
  selected = signal<UserOption | null>(null);

  results = toSignal(
    toObservable(this.query).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) =>
        q.trim().length < 2
          ? of([] as UserOption[])
          : this.reportsService.searchUsers(q).pipe(
            catchError((err) => {
              console.error('Error buscando usuarios:', err.status, err.error);
              return of([] as UserOption[]);
            }),
          ),
      ),
    ),
    { initialValue: [] as UserOption[] },
  );

  onInput(value: string): void {
    this.query.set(value);
    this.open.set(true);
  }

  select(user: UserOption): void {
    this.selected.set(user);
    this.query.set('');
    this.open.set(false);
    this.userSelected.emit(user);
  }

  clear(): void {
    this.selected.set(null);
    this.userSelected.emit(null);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target)) this.open.set(false);
  }

}
