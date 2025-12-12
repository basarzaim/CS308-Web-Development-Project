import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getProfile } from "../services/auth";
import { mergeGuestCartIfAny, clearGuestCart } from "../stores/cart";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("access_token"));

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const userData = await getProfile();   // backend profile endpoint
          setUser(userData);
          // Merge guest cart to backend after successful login
          await mergeGuestCartIfAny();
        } catch (error) {
          console.error("Failed to load user:", error);
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = useCallback((accessToken, refreshToken) => {
    localStorage.setItem("access_token", accessToken);
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    }
    setToken(accessToken); 
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    clearGuestCart(); // Clear guest cart on logout
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(userData);
  }, []);

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthenticated, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
