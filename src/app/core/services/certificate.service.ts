import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '@core/config/api-endpoints';
import { ApiService } from '@core/http/api.service';
import { Certificate } from '@core/models/certificate.model';

/** Certificate endpoints (list, detail, PDF download URL). */
@Injectable({ providedIn: 'root' })
export class CertificateService {
  private readonly api = inject(ApiService);

  /** List a donor's certificates. */
  forDonor(donorId: string | number): Observable<Certificate[]> {
    return this.api.get<Certificate[]>(API_ENDPOINTS.certificates.base, { donor_id: donorId });
  }

  getById(id: string | number): Observable<Certificate> {
    return this.api.get<Certificate>(API_ENDPOINTS.certificates.byId(id));
  }

  /** Relative path to the generated PDF (open/download in the browser). */
  pdfPath(id: string | number): string {
    return API_ENDPOINTS.certificates.pdf(id);
  }
}
