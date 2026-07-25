import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';

const THEME_KEY = 'foodbridge.theme.dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(StorageService);

  /** Hydrated from localStorage so the theme choice is global and sticky. */
  readonly darkMode = signal(this.storage.getItem<boolean>(THEME_KEY) ?? false);

  constructor() {
    // Apply + persist whenever the preference changes (runs once on init too).
    effect(() => {
      const dark = this.darkMode();
      this.document.body.classList.toggle('dark', dark);
      this.storage.setItem(THEME_KEY, dark);
    });
  }

  toggle(): void {
    this.darkMode.update((dark) => !dark);
  }
}
