import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { APP_ROUTES } from '@core/config/app-routes';
import {
  DietType,
  FreshnessTag,
  ListingWriteBody,
  MealType,
} from '@core/models/listing-api.model';
import { ListingService } from '@core/services/listing.service';
import { ToastService } from '@core/services/toast.service';
import { FbButton } from '@shared/ui/button/button';
import { FbInput, FbSelectOption } from '@shared/ui/input/input';
import { FbMap } from '@shared/ui/map/fb-map';
import { FbLatLng, FbMapConfig } from '@shared/ui/map/fb-map.model';
import { environment } from '@env/environment';

@Component({
  selector: 'app-create-listing',
  imports: [ReactiveFormsModule, FbMap, FbInput, FbButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="page-title">{{ editId() ? 'Edit' : 'Create' }} Food Listing</h3>
    <p class="page-subtitle">Tell volunteers exactly what's available and when.</p>

    <div class="grid gap-4 xl:grid-cols-3">
      <form [formGroup]="form" class="card-fb p-5 xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="col-span-2">
          <app-input
            label="Title"
            formControlName="title"
            placeholder="e.g. Surplus Wedding Catering"
            [required]="true"
            hint="A short summary volunteers see first."
            [error]="err('title')"
          />
        </div>
        <div class="col-span-2 sm:col-span-1">
          <app-input
            label="Food Type"
            formControlName="foodType"
            placeholder="e.g. Mixed Veg Meals"
            [required]="true"
            hint="e.g. mixed veg meals, sandwiches, rice & curry."
            [error]="err('foodType')"
          />
        </div>
        <div class="col-span-2 sm:col-span-1">
          <label class="small-label mb-2 block">Diet</label>
          <div class="flex gap-2">
            <button type="button" class="btn-fb-outline flex-1 !px-2" [class.selected]="form.controls.dietType.value === 'Veg'" (click)="form.controls.dietType.setValue('Veg')">🥦 Veg</button>
            <button type="button" class="btn-fb-outline flex-1 !px-2" [class.selected]="form.controls.dietType.value === 'NonVeg'" (click)="form.controls.dietType.setValue('NonVeg')">🍗 Non-Veg</button>
          </div>
        </div>
        <div class="col-span-2 sm:col-span-1">
          <app-input type="select" label="Meal Type" [options]="mealOptions" formControlName="mealType" />
        </div>
        <div class="col-span-2 sm:col-span-1">
          <app-input
            type="number"
            label="Quantity (meals)"
            formControlName="quantityMeals"
            placeholder="e.g. 50"
            [required]="true"
            hint="Approximate number of meals available."
            [error]="err('quantityMeals')"
          />
        </div>
        <div class="col-span-2 sm:col-span-1">
          <app-input
            type="select"
            label="Freshness"
            [options]="freshnessOptions"
            formControlName="freshnessTag"
            [required]="true"
            hint="How recently the food was prepared or packed."
          />
        </div>
        <div class="col-span-2 sm:col-span-1">
          <label class="small-label mb-2 block">Pickup deadline<span class="text-red-500"> *</span></label>
          <input type="datetime-local" class="fb-field w-full" formControlName="pickupDeadline" />
          @if (err('pickupDeadline')) {
            <p class="text-red-500 text-xs mt-1.5">{{ err('pickupDeadline') }}</p>
          } @else {
            <p class="fb-help">Latest time a volunteer can collect it.</p>
          }
        </div>
        <div class="col-span-2">
          <app-input
            label="Pickup Address"
            formControlName="pickupAddress"
            placeholder="e.g. C.G. Road, Navrangpura"
            [required]="true"
            hint="Where the volunteer should come to collect."
            [error]="err('pickupAddress')"
          />
        </div>
        <div class="col-span-2">
          <label class="small-label mb-2 block">Pickup location <span class="text-red-500">*</span></label>
          <app-fb-map
            class="block"
            [config]="locationConfig()"
            (locationChange)="onLocationPicked($event)"
          />
          @if (locationError()) {
            <p class="text-red-500 text-xs mt-1.5">{{ locationError() }}</p>
          } @else {
            <p class="fb-help">Drag the pin or tap the map to mark the exact pickup spot.</p>
          }
        </div>
        <div class="col-span-2">
          <div class="map-placeholder !h-28 cursor-pointer" (click)="photoInput.click()">
            <i class="fa-solid fa-cloud-arrow-up text-2xl mb-1"></i>
            <div class="text-sm">{{ photoName() || 'Click to upload a photo of the food' }}</div>
          </div>
          <input #photoInput type="file" accept="image/jpeg,image/png" hidden (change)="onPhoto($event)" />
        </div>
        <div class="col-span-2">
          <app-button type="button" icon="fa-solid fa-paper-plane" [block]="true" [loading]="submitting()" (clicked)="submit()">
            {{ editId() ? 'Update' : 'Submit' }} Listing
          </app-button>
        </div>
      </form>

      <div class="card-fb p-5">
        <div class="flex items-center gap-3 mb-3">
          <div class="stat-icon !mb-0" style="background:linear-gradient(135deg,var(--fb-success),var(--fb-success-deep))">
            <i class="fa-solid fa-lightbulb"></i>
          </div>
          <div class="font-bold">Tips for a great listing</div>
        </div>
        <ul class="text-sm space-y-2 m-0 p-0 list-none">
          <li class="flex gap-2"><i class="fa-solid fa-circle-check mt-1 text-success"></i><span>Add a clear photo so volunteers know what to expect.</span></li>
          <li class="flex gap-2"><i class="fa-solid fa-circle-check mt-1 text-success"></i><span>Give an accurate meal count and a realistic pickup deadline.</span></li>
          <li class="flex gap-2"><i class="fa-solid fa-circle-check mt-1 text-success"></i><span>Pin the exact pickup spot on the map.</span></li>
        </ul>
      </div>
    </div>
  `,
})
export class CreateListing {
  private readonly listingService = inject(ListingService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  /** Bound from the `?edit=<id>` query param (withComponentInputBinding). */
  readonly edit = input<string>();
  protected readonly editId = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly mealOptions: FbSelectOption[] = [
    { value: 'Breakfast', label: 'Breakfast' },
    { value: 'Lunch', label: 'Lunch' },
    { value: 'Dinner', label: 'Dinner' },
    { value: 'Snacks', label: 'Snacks' },
  ];

  protected readonly freshnessOptions: FbSelectOption[] = [
    { value: 'JustCooked', label: 'Just Cooked' },
    { value: 'FewHoursOld', label: 'A Few Hours Old' },
    { value: 'Packaged', label: 'Packaged' },
  ];

  /** Pickup location pinned on the map (null until chosen). */
  protected readonly pickupLocation = signal<FbLatLng | null>(null);
  private photoFile: File | null = null;
  protected readonly photoName = signal('');

  /** Per-field validation messages shown beneath each input. */
  protected readonly fieldErrors = signal<Record<string, string>>({});
  protected readonly locationError = signal('');

  protected err(field: string): string {
    return this.fieldErrors()[field] ?? '';
  }

  protected readonly locationConfig = computed<FbMapConfig>(() => ({
    mode: 'picker',
    height: 220,
    zoom: 15,
    initialLocation: this.pickupLocation() ?? environment.mapDefaultCenter,
    clickToPlace: true,
    placeholderText: 'Pin the pickup location',
  }));

  protected readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true }),
    foodType: new FormControl('', { nonNullable: true }),
    dietType: new FormControl<DietType>('Veg', { nonNullable: true }),
    mealType: new FormControl<MealType>('Lunch', { nonNullable: true }),
    quantityMeals: new FormControl('', { nonNullable: true }),
    freshnessTag: new FormControl<FreshnessTag>('JustCooked', { nonNullable: true }),
    pickupDeadline: new FormControl('', { nonNullable: true }),
    pickupAddress: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const id = this.edit();
      if (!id) {
        return;
      }
      this.editId.set(id);
      this.listingService.getById(id).subscribe({
        next: (l) => {
          this.form.patchValue({
            title: l.title,
            foodType: l.foodType,
            dietType: l.dietType ?? 'Veg',
            mealType: l.mealType ?? 'Lunch',
            quantityMeals: String(l.quantityMeals),
            freshnessTag: l.freshnessTag,
            pickupDeadline: this.toLocalInput(l.pickupDeadlineUtc),
            pickupAddress: l.pickupAddress,
          });
          this.pickupLocation.set({ lat: l.latitude, lng: l.longitude });
        },
        error: (err: Error) =>
          this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not load listing'),
      });
    });
  }

  protected onLocationPicked(pos: FbLatLng): void {
    this.pickupLocation.set(pos);
  }

  protected onPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.photoFile = input.files?.[0] ?? null;
    this.photoName.set(this.photoFile ? this.photoFile.name : '');
  }

  protected submit(): void {
    const v = this.form.getRawValue();
    const quantity = Number.parseInt(v.quantityMeals.trim(), 10);
    const location = this.pickupLocation();

    // Collect per-field errors — shown inline under each input AND summarised in a toast.
    const errors: Record<string, string> = {};
    if (!v.title.trim()) {
      errors['title'] = 'Title is required';
    }
    if (!v.foodType.trim()) {
      errors['foodType'] = 'Food type is required';
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors['quantityMeals'] = 'Enter a valid number of meals';
    }
    if (!v.pickupDeadline) {
      errors['pickupDeadline'] = 'Pickup deadline is required';
    }
    if (!v.pickupAddress.trim()) {
      errors['pickupAddress'] = 'Pickup address is required';
    }
    this.fieldErrors.set(errors);
    this.locationError.set(location ? '' : 'Pin the pickup location on the map');

    const firstError = Object.values(errors)[0] ?? this.locationError();
    if (firstError || !location) {
      this.toast.show('fa-solid fa-triangle-exclamation', firstError || 'Pin the pickup location on the map');
      return;
    }

    const body: ListingWriteBody = {
      title: v.title.trim(),
      foodType: v.foodType.trim(),
      dietType: v.dietType,
      mealType: v.mealType,
      quantityMeals: quantity,
      freshnessTag: v.freshnessTag,
      preparedAtUtc: null,
      pickupDeadlineUtc: new Date(v.pickupDeadline).toISOString(),
      pickupAddress: v.pickupAddress.trim(),
      latitude: location.lat,
      longitude: location.lng,
    };

    const id = this.editId();
    this.submitting.set(true);
    const request$ = id ? this.listingService.update(id, body) : this.listingService.create(body);

    request$.subscribe({
      next: (listing) => {
        if (this.photoFile) {
          this.listingService.uploadImage(listing.id, this.photoFile).subscribe({
            next: () => this.done(!!id),
            error: () => this.done(!!id, 'Listing saved, but the photo upload failed'),
          });
        } else {
          this.done(!!id);
        }
      },
      error: (err: Error) => {
        this.submitting.set(false);
        this.toast.show('fa-solid fa-triangle-exclamation', err.message || 'Could not save the listing');
      },
    });
  }

  private done(wasEdit: boolean, warning?: string): void {
    this.submitting.set(false);
    if (warning) {
      this.toast.show('fa-solid fa-triangle-exclamation', warning);
    } else {
      this.toast.show('fa-solid fa-circle-check', wasEdit ? 'Listing updated' : 'Listing posted — nearby volunteers notified!');
    }
    this.router.navigate([APP_ROUTES.appView('listings')]);
  }

  /** ISO UTC → value for a `datetime-local` input (local time, no seconds). */
  private toLocalInput(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
