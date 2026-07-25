import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ListingStatus, STATUS_LABELS } from '@core/models/listing.model';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="cls()">{{ STATUS_LABELS[status()] }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<ListingStatus>();
  protected readonly STATUS_LABELS = STATUS_LABELS;
  protected readonly cls = computed(() => `badge-fb badge-${this.status()}`);
}
