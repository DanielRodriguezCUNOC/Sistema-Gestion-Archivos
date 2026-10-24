import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-file-editor-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './file-editor-modal.html',
  styleUrl: './file-editor-modal.css',
})
export class FileEditorModal {

  @Input() filename: string = '';
  @Input() content: string = '';
  @Input() isSaving: boolean = false;

  @Output() contentChange = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
}
