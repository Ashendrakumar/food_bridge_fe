import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="text-center py-12 px-5 text-muted">
      <i [class]="icon()" class="text-4xl mb-3 block opacity-50"></i>
      <div class="text-sm">{{ text() }}</div>
    </div>
  `,
})
export class EmptyState {
  readonly icon = input('fa-solid fa-inbox');
  readonly text = input('Nothing here yet');
}
