import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { DialogService } from '@core/services/dialog.service';
import { DIALOG_DATA } from '@shared/ui/dialog/dialog.model';
import type { DialogRef } from '@shared/ui/dialog/dialog-ref';
import { FbMap } from '@shared/ui/map/fb-map';
import { FbLatLng, FbMapConfig, FbRouteSummary, FbTravelMode } from '@shared/ui/map/fb-map.model';

/** One point on the route. The first is the origin, the last the destination. */
export interface RouteStop {
  /** Short role name — 'You', 'Pickup', 'Drop-off'. */
  role: string;
  /** Address or place name shown under the role. */
  address: string;
  at: FbLatLng;
  /** Legend/pin colour. Must be a literal colour (it is baked into an SVG pin). */
  color: string;
}

/**
 * Someone to reach on this route, listed beside the map. Used where the API gives
 * a name and number but no coordinates, so the person can't be drawn as a stop.
 */
export interface RouteContact {
  /** Section label, e.g. 'Recipient' / 'Donor'. */
  label: string;
  icon: string;
  name: string;
  mobile?: string | null;
}

/** Everything the route panel renders. Passed as the dialog's `data`. */
export interface RouteDialogData {
  /** Ordered stops: origin first, destination last, everything between is a waypoint. */
  stops: RouteStop[];
  travelMode?: FbTravelMode;
  /** Small caveat line under the contacts, e.g. why a leg is missing. */
  note?: string;
  contacts?: RouteContact[];
}

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const MAP_HEIGHT = 400;

/**
 * Body of the route-preview dialog — a multi-stop journey (you → pickup → drop-off).
 * Draws the live directions with lettered pins, then lists each stop with the real
 * distance and duration Google returned for the hop that reaches it.
 *
 * Opened through {@link openRouteDialog} rather than placed in a template: the
 * panel, header, close affordances and the "Open in Google Maps" action all come
 * from `DialogService`.
 */
@Component({
  selector: 'app-route-panel',
  imports: [FbMap],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="rd-body">
      <app-fb-map [config]="mapConfig()" (routeResolved)="summary.set($event)" />

      <div class="rd-side">
        <div class="rd-total">
          <div class="rd-total-num">{{ summary()?.distanceText ?? '—' }}</div>
          <div class="rd-total-label">
            total · {{ summary()?.durationText ?? 'calculating…' }} by {{ travelModeLabel() }}
          </div>
        </div>

        <ol class="rd-stops">
          @for (s of stopViews(); track $index) {
            <li class="rd-stop">
              <span class="rd-pin" [style.background]="s.color">{{ s.letter }}</span>
              <div class="min-w-0">
                <div class="rd-role">{{ s.role }}</div>
                <div class="rd-addr">{{ s.address }}</div>
                @if (s.leg) {
                  <div class="rd-leg">
                    <i class="fa-solid fa-arrow-turn-up fa-rotate-90 mr-1"></i>{{ s.leg }}
                  </div>
                }
              </div>
            </li>
          }
        </ol>

        @for (c of contacts(); track c.label) {
          <div class="rd-details">
            <div class="font-bold text-[13px] mb-1">
              <i [class]="c.icon" class="mr-1.5 text-primary"></i>{{ c.label }}
            </div>
            <div>{{ c.name }}</div>
            @if (c.mobile) {
              <a class="fb-link" [href]="'tel:' + c.mobile">
                <i class="fa-solid fa-phone mr-1"></i>{{ c.mobile }}
              </a>
            }
          </div>
        }

        @if (data.note) {
          <div class="rd-note"><i class="fa-solid fa-circle-info mr-1.5"></i>{{ data.note }}</div>
        }
      </div>
    </div>
  `,
  styles: `
    .rd-body {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    @media (min-width: 860px) {
      .rd-body {
        grid-template-columns: 1.5fr 1fr;
      }
    }
    .rd-side {
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-width: 0;
    }
    .rd-total {
      padding: 12px 14px;
      border-radius: 14px;
      background: var(--fb-primary-soft);
      border: 1px solid var(--fb-primary);
    }
    .rd-total-num {
      font-size: 22px;
      font-weight: 800;
      line-height: 1.1;
      color: var(--fb-primary-deep);
    }
    .rd-total-label {
      font-size: 12px;
      color: var(--fb-muted);
    }
    .rd-stops {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .rd-stop {
      display: flex;
      gap: 10px;
      position: relative;
    }
    /* Connector line between consecutive pins. */
    .rd-stop:not(:last-child)::before {
      content: '';
      position: absolute;
      left: 12px;
      top: 28px;
      bottom: -14px;
      width: 2px;
      background: var(--fb-line);
    }
    .rd-pin {
      width: 26px;
      height: 26px;
      flex-shrink: 0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 12px;
      font-weight: 800;
      z-index: 1;
    }
    .rd-role {
      font-size: 13px;
      font-weight: 700;
    }
    .rd-addr {
      font-size: 12px;
      color: var(--fb-muted);
      word-break: break-word;
    }
    .rd-leg {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--fb-primary-deep);
      margin-top: 3px;
    }
    .rd-details {
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid var(--fb-line);
      background: var(--fb-bg);
      font-size: 12.5px;
    }
    .rd-note {
      font-size: 11.5px;
      color: var(--fb-muted);
      line-height: 1.5;
    }
  `,
})
export class RoutePanel {
  protected readonly data = inject<RouteDialogData>(DIALOG_DATA);

  protected readonly summary = signal<FbRouteSummary | null>(null);

  protected readonly contacts = computed(() =>
    (this.data.contacts ?? []).filter((c) => !!c.name),
  );

  protected readonly travelModeLabel = computed(() =>
    (this.data.travelMode ?? 'DRIVING').toLowerCase(),
  );

  protected readonly mapConfig = computed<FbMapConfig>(() => {
    const stops = this.data.stops;
    return {
      mode: 'route',
      height: MAP_HEIGHT,
      route: {
        origin: stops[0].at,
        destination: stops[stops.length - 1].at,
        waypoints: stops.slice(1, -1).map((s) => s.at),
      },
      travelMode: this.data.travelMode ?? 'DRIVING',
      // Our own lettered pins replace the renderer's default red ones so the
      // map and the stop list beside it agree on colour.
      suppressRouteMarkers: true,
      markers: stops.map((s, i) => ({
        position: s.at,
        label: LETTERS[i] ?? String(i + 1),
        title: `${s.role} — ${s.address}`,
        color: s.color,
      })),
      showEta: true,
      showLegend: false,
      placeholderText: 'Route preview',
    };
  });

  /** Stops decorated with their letter and the leg that *arrives* at them. */
  protected readonly stopViews = computed(() => {
    const legs = this.summary()?.legs ?? [];
    return this.data.stops.map((s, i) => ({
      ...s,
      letter: LETTERS[i] ?? String(i + 1),
      leg: i > 0 && legs[i - 1] ? `${legs[i - 1].distanceText} · ${legs[i - 1].durationText}` : '',
    }));
  });
}

export interface RouteDialogOptions extends RouteDialogData {
  heading?: string;
  subheading?: string;
}

/**
 * Open the route preview. One call from anywhere that has a `DialogService` —
 * both volunteer pages use this instead of hosting their own panel markup.
 *
 * @example
 * openRouteDialog(this.dialog, {
 *   heading: 'Route to pickup',
 *   subheading: listing.title,
 *   stops,
 *   contacts: [{ label: 'Donor', icon: 'fa-solid fa-store', name, mobile }],
 * });
 */
export function openRouteDialog(
  dialog: DialogService,
  options: RouteDialogOptions,
): DialogRef<void, RoutePanel> {
  const { heading, subheading, ...data } = options;
  return dialog.open<RouteDialogData, void, RoutePanel>({
    header: {
      title: heading ?? 'Route',
      subtitle: subheading,
      icon: 'fa-solid fa-diamond-turn-right',
    },
    content: RoutePanel,
    data,
    size: 'xl',
    actions: [
      {
        id: 'maps',
        label: 'Open in Google Maps',
        icon: 'fa-solid fa-up-right-from-square',
        variant: 'outline',
        align: 'start',
        handler: () => openInGoogleMaps(data.stops),
      },
      { id: 'close', label: 'Close', variant: 'ghost', close: true },
    ],
  });
}

/** Hand the whole multi-stop route to Google Maps for turn-by-turn navigation. */
function openInGoogleMaps(stops: readonly RouteStop[]): void {
  const path = stops.map((s) => `${s.at.lat},${s.at.lng}`).join('/');
  window.open(`https://www.google.com/maps/dir/${path}`, '_blank', 'noopener');
}
