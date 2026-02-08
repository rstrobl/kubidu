declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name?: string | null;
      };
      requestId?: string;
    }
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface AuthenticatedRequest extends Express.Request {
  user: AuthenticatedUser;
}
