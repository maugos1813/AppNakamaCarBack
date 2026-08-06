export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
