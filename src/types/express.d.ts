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

export interface ClientSession {
  id: string;
  email: string;
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      clientAccess?: ClientAccess;
      clientSession?: ClientSession;
    }
  }
}

export {};
