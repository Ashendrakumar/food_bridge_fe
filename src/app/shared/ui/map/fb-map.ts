import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  GoogleMap,
  MapDirectionsRenderer,
  MapDirectionsService,
  MapMarker,
} from '@angular/google-maps';
import { environment } from '@env/environment';
import { GoogleMapsLoaderService } from '@core/services/google-maps-loader.service';
import { FbLatLng, FbMapConfig, FbMapMarker } from './fb-map.model';

const BRAND_PRIMARY = '#d87757';

/**
 * Reusable, configuration-driven Google Map.
 *
 * One `[config]` input drives three modes:
 *  - `markers` — drop a set of coloured, labelled pins.
 *  - `picker`  — a single draggable pin; emits `(locationChange)`.
 *  - `route`   — draws directions origin → (waypoints) → destination.
 *
 * When `environment.googleMapsApiKey` is empty (or the script fails), the
 * component degrades gracefully to a styled placeholder instead of erroring.
 */
@Component({
  selector: 'app-fb-map',
  imports: [GoogleMap, MapMarker, MapDirectionsRenderer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fb-map" [style.height.px]="height()">
      @switch (loader.state()) {
        @case ('ready') {
          <google-map
            width="100%"
            [height]="height()"
            [center]="center()"
            [zoom]="zoom()"
            [options]="mapOptions()"
            (mapClick)="onMapClick($event)"
          >
            @if (mode() === 'route' && directions()) {
              <map-directions-renderer [directions]="directions()!" />
            }

            @if (mode() === 'picker') {
              <map-marker
                [position]="pickerPosition()"
                [icon]="pinIcon(BRAND_PRIMARY, '')"
                [options]="{ draggable: true }"
                (mapDragend)="onPickerDrag($event)"
              />
            }

            @for (m of markers(); track $index) {
              <map-marker
                [position]="m.position"
                [title]="m.title ?? ''"
                [icon]="pinIcon(m.color ?? BRAND_PRIMARY, m.label ?? '')"
                [options]="{ draggable: !!m.draggable }"
              />
            }
          </google-map>
        }
        @default {
          <!-- Any non-ready state keeps the faux-map skeleton (from the HTML
               sample) visible, with a translucent status badge on top. -->
          <div class="map-placeholder-screen">
            <div class="map-note">
              @switch (loader.state()) {
                @case ('no-key') {
                  <i class="fa-solid fa-map-location-dot text-2xl mb-1"></i>
                  <div class="font-semibold text-[13px]">{{ placeholderText() }}</div>
                  <div class="text-muted text-[11px] mt-0.5">
                    Add a Google Maps API key to enable the live map.
                  </div>
                }
                @case ('error') {
                  <i class="fa-solid fa-triangle-exclamation text-2xl mb-1"></i>
                  <div class="font-semibold text-[13px]">{{ placeholderText() }}</div>
                  <div class="text-muted text-[11px] mt-0.5">
                    Map failed to load — check the API key.
                  </div>
                }
                @default {
                  <span class="map-spinner mb-1" aria-hidden="true"></span>
                  <div class="font-semibold text-[13px]">{{ placeholderText() }}</div>
                  <div class="text-muted text-[11px] mt-0.5">Loading map…</div>
                }
              }
            </div>
          </div>
        }
      }

      @if (config().showEta && (distanceLabel() || etaLabel())) {
        <div class="map-eta">
          @if (distanceLabel()) {
            <div class="font-bold text-[13px]">
              <i class="fa-solid fa-route mr-1 text-primary"></i>{{ distanceLabel() }}
            </div>
          }
          @if (etaLabel()) {
            <div class="text-muted text-[11px]">{{ etaLabel() }}</div>
          }
        </div>
      }

      @if (config().showLegend && legend().length) {
        <div class="map-legend">
          @for (item of legend(); track $index) {
            <div class="legend-row">
              <span class="dot" [style.background]="item.color"></span>{{ item.text }}
            </div>
          }
          @if (config().openInMapsLink) {
            <a
              class="btn-fb w-full mt-2 !py-1.5 !text-[11px]"
              [href]="config().openInMapsLink"
              target="_blank"
              rel="noopener"
            >
              <i class="fa-solid fa-up-right-from-square mr-1"></i>Open in Google Maps
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .fb-map {
      position: relative;
      border-radius: var(--fb-radius);
      overflow: hidden;
      border: 1px solid var(--fb-line);
      /* Faux-map backdrop (from the HTML sample) shown behind every state. */
      background:
        radial-gradient(circle at 20% 30%, rgba(30, 158, 92, 0.1), transparent 45%),
        radial-gradient(circle at 80% 75%, rgba(255, 122, 61, 0.12), transparent 45%),
        linear-gradient(135deg, #eef3ef, #f6efe9);
      background-color: #eef3ef;
    }
    /* Faux street grid — the sample's .fb-map::before. */
    .fb-map::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 0;
      background-image:
        linear-gradient(rgba(122, 111, 101, 0.12) 1px, transparent 1px),
        linear-gradient(90deg, rgba(122, 111, 101, 0.12) 1px, transparent 1px);
      background-size: 46px 46px;
    }
    /* The live map must paint above the faux grid backdrop. */
    google-map {
      position: relative;
      z-index: 1;
      display: block;
    }
    /* Placeholder shown for every non-ready state (loading / no-key / error):
       the faux-map grid stays visible with a translucent note on top. */
    .map-placeholder-screen {
      position: absolute;
      inset: 0;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .map-note {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      max-width: 260px;
      padding: 16px 20px;
      color: var(--fb-primary-deep);
      background: color-mix(in srgb, var(--fb-surface) 90%, transparent);
      backdrop-filter: blur(8px);
      border: 1px solid var(--fb-line);
      border-radius: 16px;
      box-shadow: var(--fb-shadow);
    }
    .map-spinner {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2.5px solid var(--fb-primary-soft);
      border-top-color: var(--fb-primary);
      animation: fb-map-spin 0.7s linear infinite;
    }
    @keyframes fb-map-spin {
      to {
        transform: rotate(360deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .map-spinner {
        animation-duration: 2s;
      }
    }
    .map-eta,
    .map-legend {
      position: absolute;
      z-index: 3;
      background: color-mix(in srgb, var(--fb-surface) 92%, transparent);
      backdrop-filter: blur(8px);
      border: 1px solid var(--fb-line);
      border-radius: 14px;
      box-shadow: var(--fb-shadow);
    }
    .map-eta {
      right: 16px;
      top: 16px;
      padding: 10px 14px;
      font-size: 12px;
    }
    .map-legend {
      left: 16px;
      bottom: 16px;
      padding: 12px 14px;
      max-width: 240px;
    }
    .legend-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 500;
    }
    .legend-row + .legend-row {
      margin-top: 7px;
    }
    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }
  `,
})
export class FbMap {
  protected readonly loader = inject(GoogleMapsLoaderService);
  private readonly directionsService = inject(MapDirectionsService);

  protected readonly BRAND_PRIMARY = BRAND_PRIMARY;

  readonly config = input<FbMapConfig>({});
  /** Emits the chosen coordinates in `picker` mode (drag or click). */
  readonly locationChange = output<FbLatLng>();

  protected readonly mode = computed(() => this.config().mode ?? 'markers');
  protected readonly zoom = computed(() => this.config().zoom ?? environment.mapDefaultZoom);
  protected readonly height = computed(() => this.config().height ?? 440);
  protected readonly markers = computed<FbMapMarker[]>(() => this.config().markers ?? []);
  protected readonly legend = computed(() => this.config().legend ?? []);
  protected readonly distanceLabel = computed(() => this.config().distanceLabel ?? '');
  protected readonly etaLabel = computed(() => this.config().etaLabel ?? '');
  protected readonly placeholderText = computed(
    () => this.config().placeholderText ?? 'Map preview',
  );

  protected readonly center = computed<google.maps.LatLngLiteral>(() => {
    const c = this.config().center ?? this.config().initialLocation ?? environment.mapDefaultCenter;
    return { lat: c.lat, lng: c.lng };
  });

  protected readonly mapOptions = computed<google.maps.MapOptions>(() => ({
    disableDefaultUI: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    clickableIcons: false,
    gestureHandling: 'greedy',
  }));

  /** Current picker marker position (starts at initialLocation / center). */
  protected readonly pickerPosition = signal<google.maps.LatLngLiteral>({ lat: 0, lng: 0 });

  /** Computed directions result for `route` mode. */
  protected readonly directions = signal<google.maps.DirectionsResult | null>(null);

  constructor() {
    // Kick off the API load as soon as the component is created.
    this.loader.load();

    // Keep the picker marker in sync with config until the user moves it.
    effect(() => {
      const start = this.config().initialLocation ?? this.config().center;
      if (start) {
        this.pickerPosition.set({ lat: start.lat, lng: start.lng });
      }
    });

    // Compute directions once the API is ready and we're in route mode.
    effect(() => {
      if (this.loader.state() !== 'ready' || this.mode() !== 'route') {
        return;
      }
      const route = this.config().route;
      if (!route) {
        return;
      }
      const request: google.maps.DirectionsRequest = {
        origin: route.origin,
        destination: route.destination,
        waypoints: (route.waypoints ?? []).map((p) => ({ location: p, stopover: true })),
        travelMode:
          (this.config().travelMode as google.maps.TravelMode) ??
          ('DRIVING' as google.maps.TravelMode),
      };
      this.directionsService.route(request).subscribe((res) => {
        this.directions.set(res.result ?? null);
      });
    });
  }

  protected onMapClick(event: google.maps.MapMouseEvent | google.maps.IconMouseEvent): void {
    if (this.mode() !== 'picker' || this.config().clickToPlace === false) {
      return;
    }
    const latLng = event.latLng;
    if (latLng) {
      this.setPicker({ lat: latLng.lat(), lng: latLng.lng() });
    }
  }

  protected onPickerDrag(event: google.maps.MapMouseEvent): void {
    const latLng = event.latLng;
    if (latLng) {
      this.setPicker({ lat: latLng.lat(), lng: latLng.lng() });
    }
  }

  private setPicker(pos: FbLatLng): void {
    this.pickerPosition.set(pos);
    this.locationChange.emit(pos);
  }

  /** Build a coloured teardrop pin (with an optional letter) as an SVG data URI. */
  protected pinIcon(color: string, label: string): string {
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='48' viewBox='0 0 36 48'>` +
      `<path d='M18 0C8.1 0 0 8.1 0 18c0 12.6 18 30 18 30s18-17.4 18-30C36 8.1 27.9 0 18 0z' ` +
      `fill='${color}' stroke='white' stroke-width='2'/>` +
      `<circle cx='18' cy='17.5' r='11' fill='white' opacity='0.22'/>` +
      (label
        ? `<text x='18' y='23' font-family='Arial, sans-serif' font-size='15' font-weight='700' ` +
        `fill='white' text-anchor='middle'>${label}</text>`
        : `<circle cx='18' cy='17.5' r='5' fill='white'/>`) +
      `</svg>`;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }
}
