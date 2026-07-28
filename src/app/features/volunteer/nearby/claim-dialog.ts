import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FbDatePicker } from '@shared/ui/date-picker/date-picker';
import { DIALOG_DATA } from '@shared/ui/dialog/dialog.model';
import { formatDisplay, formatLocal } from '@shared/util/date-value';

/** What the claim dialog needs to know about the listing being claimed. */
export interface ClaimDialogData {
  pickupDeadlineUtc: string;
}

/** Matches the donor's pickup-deadline field, so both ends of the window step alike. */
const MINUTE_STEP = 15;

/**
 * Body of the "Claim this pickup" dialog: an optional pickup ETA, bounded to the
 * window the volunteer can actually commit to — no earlier than now, no later than
 * the listing's own deadline (the backend 422s outside it either way).
 *
 * The header, footer buttons and close behaviour come from `DialogService`; this
 * only owns the field and the ISO value the opener reads back off `ref.body()`.
 */
@Component({
  selector: 'app-claim-dialog',
  imports: [ReactiveFormsModule, FbDatePicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-date-picker
      mode="datetime"
      label="When will you pick it up? (optional)"
      placeholder="Right away"
      [formControl]="eta"
      [min]="min"
      [max]="max"
      [minuteStep]="MINUTE_STEP"
      [clearable]="true"
      [hint]="hint"
    />
  `,
})
export class ClaimDialog {
  private readonly data = inject<ClaimDialogData>(DIALOG_DATA);

  protected readonly MINUTE_STEP = MINUTE_STEP;

  /** Local wall-clock `YYYY-MM-DDTHH:mm`, the picker's value contract. */
  protected readonly eta = new FormControl('', { nonNullable: true });

  private readonly deadline = new Date(this.data.pickupDeadlineUtc);

  protected readonly min = formatLocal(new Date(), 'datetime');
  protected readonly max = formatLocal(this.deadline, 'datetime');

  /** Same formatter the picker uses on its own trigger, so the two agree. */
  protected readonly hint =
    'Leave empty to pick up right away. Must be before ' +
    `${formatDisplay(this.deadline, 'datetime', true)}.`;

  /** The chosen ETA as ISO UTC, or undefined for "pick up right away". */
  etaIso(): string | undefined {
    const value = this.eta.value.trim();
    return value ? new Date(value).toISOString() : undefined;
  }
}
