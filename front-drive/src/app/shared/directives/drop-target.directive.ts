import { Directive, EventEmitter, HostBinding, HostListener, Output } from '@angular/core';

/*
* Gestiona los eventos visuales cuando un archivo pasa por encima de una carpeta y captura el ID del archivo soltado.
*/

@Directive({
  selector: '[appDropTarget]',
  standalone: true
})
export class DropTargetDirective {
  @Output() itemDropped = new EventEmitter<string>();

  @HostBinding('class.ring-2')
  @HostBinding('class.ring-indigo-500')
  @HostBinding('class.bg-indigo-50')
  isDragOver = false;

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.isDragOver = true;
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;

    //* Captura el ID del archivo configurado en el dragstart
    const itemId = event.dataTransfer?.getData('text/plain');
    if (itemId) {
      this.itemDropped.emit(itemId);
    }
  }
}