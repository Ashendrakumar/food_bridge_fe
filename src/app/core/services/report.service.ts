import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '@core/config/api-endpoints';
import { ApiService } from '@core/http/api.service';
import {
  DonorReport,
  PlatformReport,
  RecipientReport,
  VolunteerReport,
} from '@core/models/report.model';

/** Chart-ready impact reports (Phase 8/9), role-scoped via the JWT. */
@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly api = inject(ApiService);

  donor(): Observable<DonorReport> {
    return this.api.get<DonorReport>(API_ENDPOINTS.reports.donor);
  }

  volunteer(): Observable<VolunteerReport> {
    return this.api.get<VolunteerReport>(API_ENDPOINTS.reports.volunteer);
  }

  recipient(): Observable<RecipientReport> {
    return this.api.get<RecipientReport>(API_ENDPOINTS.reports.recipient);
  }

  platform(): Observable<PlatformReport> {
    return this.api.get<PlatformReport>(API_ENDPOINTS.reports.platform);
  }
}
