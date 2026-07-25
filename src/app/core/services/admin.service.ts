import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '@core/config/api-endpoints';
import { ApiService, QueryParams } from '@core/http/api.service';
import { AdminAccount, AdminDashboardStats } from '@core/models/admin.model';
import { Dispute } from '@core/models/dispute.model';
import { Listing, ListingStatus } from '@core/models/listing.model';
import { AdminReport } from '@core/models/report.model';

/** Admin console endpoints (stats, listings, accounts, disputes, reports). */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  dashboardStats(): Observable<AdminDashboardStats> {
    return this.api.get<AdminDashboardStats>(API_ENDPOINTS.admin.dashboardStats);
  }

  listings(status?: ListingStatus): Observable<Listing[]> {
    const params: QueryParams = { status };
    return this.api.get<Listing[]>(API_ENDPOINTS.admin.listings, params);
  }

  accounts(status?: AdminAccount['status']): Observable<AdminAccount[]> {
    const params: QueryParams = { status };
    return this.api.get<AdminAccount[]>(API_ENDPOINTS.admin.accounts, params);
  }

  verifyAccount(id: string | number): Observable<AdminAccount> {
    return this.api.post<AdminAccount>(API_ENDPOINTS.admin.verifyAccount(id));
  }

  /** Suspend / reinstate an account. */
  suspendAccount(id: string | number, suspended = true): Observable<AdminAccount> {
    return this.api.post<AdminAccount>(API_ENDPOINTS.admin.suspendAccount(id), { suspended });
  }

  disputes(): Observable<Dispute[]> {
    return this.api.get<Dispute[]>(API_ENDPOINTS.admin.disputes);
  }

  resolveDispute(id: string | number, resolution?: string): Observable<Dispute> {
    return this.api.post<Dispute>(API_ENDPOINTS.admin.resolveDispute(id), { resolution });
  }

  reports(): Observable<AdminReport> {
    return this.api.get<AdminReport>(API_ENDPOINTS.admin.reports);
  }
}
