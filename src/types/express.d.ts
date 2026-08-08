export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export interface ClientAccess {
  entryId: string;
  clientId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      clientAccess?: ClientAccess;
    }
  }
}

export {};
