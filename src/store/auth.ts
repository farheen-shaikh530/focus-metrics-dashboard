// src/store/auth.ts
import { create } from "zustand";

export type User = { email: string; name?: string; picture?: string };

type State = {
  user: User | null;
  users: Record<string, string>; // local demo sign-up (email -> pwd)
};
type Actions = {
  hydrate: () => void;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loginWithGoogle: (idToken: string) => Promise<void>;
};

const USERS_KEY = "auth.users";
const SESSION_KEY = "auth.user";

const readUsers = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "{}"); } catch { return {}; }
};
const writeUsers = (u: Record<string, string>) =>
  localStorage.setItem(USERS_KEY, JSON.stringify(u));

const readSession = (): User | null => {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
};
const writeSession = (u: User | null) =>
  localStorage.setItem(SESSION_KEY, JSON.stringify(u));

export const useAuth = create<State & Actions>((set, get) => ({
  user: null,
  users: {},

  hydrate: () => set({ users: readUsers(), user: readSession() }),

  register: async (email, password) => {
    const users = { ...get().users, [email]: password };
    writeUsers(users);
    const user: User = { email };
    writeSession(user);
    set({ users, user });
  },

  login: async (email, password) => {
    const saved = get().users[email];
    if (!saved || saved !== password) throw new Error("Invalid credentials");
    const user: User = { email };
    writeSession(user);
    set({ user });
  },

  logout: () => {
    writeSession(null);
    set({ user: null });
  },

  loginWithGoogle: async (idToken: string) => {
    const res = await fetch("http://127.0.0.1:8000/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
      credentials: "include",
    });
    if (!res.ok) throw new Error("Google auth failed");
    const data = await res.json(); // { user: { email, name, picture } }
    const user: User = data.user || {};
    writeSession(user);
    set({ user });
  },
}))