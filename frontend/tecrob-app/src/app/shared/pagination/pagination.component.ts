import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-3 rounded-xl bg-white px-4 py-3 shadow sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-tecrob-grayText">
        Mostrando {{ firstItem }}-{{ lastItem }} de {{ totalItems }}
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <label class="mr-1 flex items-center gap-2 text-sm text-tecrob-grayText">
          Filas:
          <select [value]="pageSize" (change)="changePageSize($event)"
                  class="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-tecrob-red focus:outline-none">
            <option *ngFor="let size of pageSizes" [value]="size">{{ size }}</option>
          </select>
        </label>
        <button type="button" (click)="selectPage(currentPage - 1)" [disabled]="currentPage <= 1"
                class="rounded-lg border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40">
          Anterior
        </button>
        <span class="min-w-24 text-center text-sm text-tecrob-grayText">
          Página {{ currentPage }} de {{ totalPages }}
        </span>
        <button type="button" (click)="selectPage(currentPage + 1)" [disabled]="currentPage >= totalPages"
                class="rounded-lg border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40">
          Siguiente
        </button>
      </div>
    </div>
  `
})
export class PaginationComponent {
  @Input({ required: true }) totalItems = 0;
  @Input() currentPage = 1;
  @Input() pageSize = 10;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  readonly pageSizes = [10, 25, 50];
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get firstItem(): number {
    return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get lastItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  selectPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.pageChange.emit(page);
    }
  }

  changePageSize(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value);
    if (this.pageSizes.includes(size)) {
      this.pageSizeChange.emit(size);
    }
  }
}
