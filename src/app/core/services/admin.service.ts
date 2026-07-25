import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '@core/config/api-endpoints';
import { ApiService, QueryParams } from '@core/http/api.service';
import { AdminAccount, AdminDashboard } from '@core/models/admin.model';
import { Dispute, RaiseDisputeBody } from '@core/models/dispute.model';
import { ApiListingSummary } from '@core/models/listing-api.model';
import { PlatformReport } from '@core/models/report.model';

/** Admin console endpoints (Phase 9): dashboard, moderation, disputes, platform report. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  dashboard(): Observable<AdminDashboard> {
    return this.api.get<AdminDashboard>(API_ENDPOINTS.admin.dashboard);
  }

  listings(status?: string, page = 1, pageSize = 50): Observable<ApiListingSummary[]> {
    const params: QueryParams = { status, page, pageSize };
    return this.api.get<ApiListingSummary[]>(API_ENDPOINTS.admin.listings, params);
  }

  accounts(role?: string, page = 1, pageSize = 50): Observable<AdminAccount[]> {
    const params: QueryParams = { role, page, pageSize };
    return this.api.get<AdminAccount[]>(API_ENDPOINTS.admin.accounts, params);
  }

  verifyAccount(id: string): Observable<AdminAccount> {
    return this.api.patch<AdminAccount>(API_ENDPOINTS.admin.verifyAccount(id));
  }

  suspendAccount(id: string): Observable<AdminAccount> {
    return this.api.patch<AdminAccount>(API_ENDPOINTS.admin.suspendAccount(id));
  }

  disputes(page = 1, pageSize = 50): Observable<Dispute[]> {
    const params: QueryParams = { page, pageSize };
    return this.api.get<Dispute[]>(API_ENDPOINTS.disputes.base, params);
  }

  /** Raise a dispute (any party on the listing; not admin-only). */
  raiseDispute(body: RaiseDisputeBody): Observable<Dispute> {
    return this.api.post<Dispute>(API_ENDPOINTS.disputes.base, body);
  }

  resolveDispute(id: string, resolutionNote: string): Observable<Dispute> {
    return this.api.patch<Dispute>(API_ENDPOINTS.disputes.resolve(id), { resolutionNote });
  }

  platformReport(): Observable<PlatformReport> {
    return this.api.get<PlatformReport>(API_ENDPOINTS.reports.platform);
  }
}
