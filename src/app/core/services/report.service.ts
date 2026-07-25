import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '@core/config/api-endpoints';
import { ApiService } from '@core/http/api.service';
import { DonorReport, RecipientReport } from '@core/models/report.model';

/** Donor / recipient monthly stats + chart data. */
@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly api = inject(ApiService);

  donor(id: string | number): Observable<DonorReport> {
    return this.api.get<DonorReport>(API_ENDPOINTS.reports.donor(id));
  }

  recipient(id: string | number): Observable<RecipientReport> {
    return this.api.get<RecipientReport>(API_ENDPOINTS.reports.recipient(id));
  }
}
