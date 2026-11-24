// Minimal types for the official KHQR generator (the package ships plain JavaScript).
declare module "bakong-khqr" {
  export const khqrData: { currency: { usd: number; khr: number } };
  export class IndividualInfo {
    constructor(bakongAccountID: string, merchantName: string, merchantCity: string, optional?: { currency?: number; amount?: number; billNumber?: string; storeLabel?: string; expirationTimestamp?: number });
  }
  export class BakongKHQR {
    generateIndividual(info: IndividualInfo): { status: { code: number; errorCode: number | null; message: string | null }; data: { qr: string; md5: string } | null };
    static verify(qr: string): { isValid: boolean };
  }
}
