import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { fetchApi, getAuthToken, setAuthToken, removeAuthToken, decodeToken } from "@/lib/apiClient";

export type AppRole = "volunteer" | "coordinator" | "admin" | "organizationmanager";

export interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
}

export interface Session {
  access_token: string;
  user: User;
}

export interface UserData {
  userId?: string;
  id?: string;
  email?: string;
  name?: string;
  fullName?: string;
  role?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  primaryRole: AppRole;
  loading: boolean;
  signIn: (token: string, userData: UserData) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getPrimaryRole(roles: AppRole[]): AppRole {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("coordinator")) return "coordinator";
  if (roles.includes("organizationmanager")) return "organizationmanager";
  return "volunteer";
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const signIn = (token: string, userData: UserData) => {
    setAuthToken(token);

<<<<<<< HEAD
=======
    // Map .NET UserInfo to our User shape
>>>>>>> ea71196db2b2d45c0d03ad964ec61df1b885cd0b
    const newUser: User = {
      id: userData.userId ?? userData.id ?? "",
      email: userData.email ?? "",
      user_metadata: {
        full_name: userData.name ?? userData.fullName ?? "",
      },
    };

    const newSession: Session = {
      access_token: token,
      user: newUser,
    };

    setSession(newSession);
    setUser(newUser);

<<<<<<< HEAD
    const role = (userData.role?.toLowerCase() ?? "volunteer") as AppRole;
=======
    const role: AppRole = userData.role?.toLowerCase() as AppRole || "volunteer";
>>>>>>> ea71196db2b2d45c0d03ad964ec61df1b885cd0b
    setRoles([role]);
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          if (isMounted) setLoading(false);
          return;
        }

        const decoded = decodeToken(token) as { exp?: number } | null;
        if (!decoded || (decoded.exp && decoded.exp * 1000 < Date.now())) {
          removeAuthToken();
          if (isMounted) setLoading(false);
          return;
        }

        const userData = await fetchApi<UserData>("/auth/me");
        if (isMounted) {
          signIn(token, userData);
        }
      } catch (error) {
        console.error("Auth initialization failed", error);
        removeAuthToken();
        if (isMounted) {
          setSession(null);
          setUser(null);
          setRoles([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await fetchApi("/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout API failed, continuing client logout", e);
    } finally {
      removeAuthToken();
      setSession(null);
      setUser(null);
      setRoles([]);
    }
  };

  const primaryRole = getPrimaryRole(roles);

  return (
    <AuthContext.Provider value={{ session, user, roles, primaryRole, loading, signIn, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
