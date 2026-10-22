import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fileSize',
  standalone: true
})
export class FileSizePipe implements PipeTransform {
  transform(bytes: number = 0, precision: number = 2): string {
    if (isNaN(parseFloat(String(bytes))) || !isFinite(bytes)) return '?';
    if (bytes === 0) return '0 Bytes';

    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const amountOf2s = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, amountOf2s)).toFixed(precision)} ${units[amountOf2s]}`;
  }
}