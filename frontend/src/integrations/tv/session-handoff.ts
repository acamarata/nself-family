/**
 * TV session handoff — exchanges family JWT for a TV session token.
 * Implements the versioned handoff contract between nFamily and nTV.
 */

const HANDOFF_VERSION = 1;
const SESSION_KEY = 'nfamily_tv_session';

export interface TVSession {
  session_token: string;
  family_id: string;
  user_id: string;
  entitlements: string[];
  expires_at: string;
  handoff_version: number;
}

export interface HandoffRequest {
  family_jwt: string;
  family_id: string;
  user_id: string;
  target_content_id?: string;
}

export interface HandoffResponse {
  success: boolean;
  session?: TVSession;
  error?: string;
}

/**
 * Manages TV session lifecycle — handoff, expiry, and re-auth.
 */
export class TVSessionManager {
  private session: TVSession | null = null;

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Initiate session handoff to TV.
   * @param request - Handoff parameters
   * @returns Handoff response
   */
  async handoff(request: HandoffRequest): Promise<HandoffResponse> {
    try {
      // In production this would call the TV backend
      // For now, create a local session contract
      const session: TVSession = {
        session_token: `tv_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        family_id: request.family_id,
        user_id: request.user_id,
        entitlements: [],
        expires_at: new Date(Date.now() + 4 * 3600_000).toISOString(), // 4 hours
        handoff_version: HANDOFF_VERSION,
      };

      this.session = session;
      this.saveToStorage();

      return { success: true, session };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  /**
   * Check if current session is still valid.
   * @returns True if session exists and not expired
   */
  isValid(): boolean {
    if (!this.session) return false;
    return new Date(this.session.expires_at) > new Date();
  }

  /**
   * Get current session.
   * @returns Current TV session or null
   */
  getSession(): TVSession | null {
    if (!this.isValid()) {
      this.session = null;
      this.clearStorage();
      return null;
    }
    return this.session;
  }

  /**
   * End the TV session.
   */
  endSession(): void {
    this.session = null;
    this.clearStorage();
  }

  /**
   * Get the handoff contract version.
   * @returns Contract version number
   */
  getVersion(): number {
    return HANDOFF_VERSION;
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) this.session = JSON.parse(raw);
    } catch {
      this.session = null;
    }
  }

  private saveToStorage(): void {
    try {
      if (this.session) localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
    } catch {
      // Silently fail
    }
  }

  private clearStorage(): void {
    localStorage.removeItem(SESSION_KEY);
  }
}
