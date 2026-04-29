import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "admin" | "employee";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  weeklyHours: number;
  vacationDaysTotal: number;
}

export type ShiftStatus = "in_progress" | "finished";

export interface Shift {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  start: string; // ISO
  end: string | null; // ISO
  notes?: string;
  status: ShiftStatus;
}

export type AbsenceStatus = "pending" | "approved" | "rejected";
export interface Absence {
  id: string;
  userId: string;
  reason: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  status: AbsenceStatus;
  notes?: string;
  consumesVacation: boolean;
}

export interface Department {
  id: string;
  name: string;
  color: string;
}

export interface CompanyConfig {
  weeklyHours: number;
  annualHours: number;
  contractType: string;
  vacationDays: number;
  workDays: number[]; // 0-6
}

interface AppState {
  currentUserId: string;
  users: User[];
  shifts: Shift[];
  absences: Absence[];
  departments: Department[];
  config: CompanyConfig;

  setCurrentUser: (id: string) => void;
  addUser: (u: Omit<User, "id">) => void;
  updateUser: (id: string, u: Partial<User>) => void;
  deleteUser: (id: string) => void;

  startShift: (userId: string) => void;
  endShift: (userId: string) => void;
  addShift: (s: Omit<Shift, "id">) => void;
  addShiftsBulk: (s: Omit<Shift, "id">[]) => void;
  updateShift: (id: string, s: Partial<Shift>) => void;
  deleteShift: (id: string) => void;

  addAbsence: (a: Omit<Absence, "id">) => void;
  updateAbsence: (id: string, a: Partial<Absence>) => void;
  deleteAbsence: (id: string) => void;

  addDepartment: (d: Omit<Department, "id">) => void;
  deleteDepartment: (id: string) => void;
  updateConfig: (c: Partial<CompanyConfig>) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const seedUsers: User[] = [
  { id: "u1", name: "Ana García", email: "ana@empresa.com", role: "admin", department: "Dirección", weeklyHours: 40, vacationDaysTotal: 22 },
  { id: "u2", name: "Carlos Ruiz", email: "carlos@empresa.com", role: "employee", department: "Ventas", weeklyHours: 40, vacationDaysTotal: 22 },
  { id: "u3", name: "Laura Méndez", email: "laura@empresa.com", role: "employee", department: "Administración", weeklyHours: 35, vacationDaysTotal: 22 },
];

const seedDepartments: Department[] = [
  { id: "d1", name: "Administración", color: "#93c5fd" },
  { id: "d2", name: "Dirección", color: "#c4b5fd" },
  { id: "d3", name: "Ventas", color: "#86efac" },
  { id: "d4", name: "Servicio técnico", color: "#fdba74" },
  { id: "d5", name: "Otro", color: "#d4d4d8" },
];

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentUserId: "u1",
      users: seedUsers,
      shifts: [],
      absences: [],
      departments: seedDepartments,
      config: {
        weeklyHours: 40,
        annualHours: 1723,
        contractType: "Jornada completa",
        vacationDays: 22,
        workDays: [1, 2, 3, 4, 5],
      },

      setCurrentUser: (id) => set({ currentUserId: id }),
      addUser: (u) => set((s) => ({ users: [...s.users, { ...u, id: uid() }] })),
      updateUser: (id, u) => set((s) => ({ users: s.users.map((x) => (x.id === id ? { ...x, ...u } : x)) })),
      deleteUser: (id) => set((s) => ({ users: s.users.filter((x) => x.id !== id) })),

      startShift: (userId) =>
        set((s) => {
          const now = new Date();
          const date = now.toISOString().slice(0, 10);
          return {
            shifts: [
              ...s.shifts,
              { id: uid(), userId, date, start: now.toISOString(), end: null, status: "in_progress" },
            ],
          };
        }),
      endShift: (userId) =>
        set((s) => ({
          shifts: s.shifts.map((sh) =>
            sh.userId === userId && sh.status === "in_progress"
              ? { ...sh, end: new Date().toISOString(), status: "finished" }
              : sh,
          ),
        })),
      addShift: (sh) => set((s) => ({ shifts: [...s.shifts, { ...sh, id: uid() }] })),
      addShiftsBulk: (arr) => set((s) => ({ shifts: [...s.shifts, ...arr.map((sh) => ({ ...sh, id: uid() }))] })),
      updateShift: (id, sh) => set((s) => ({ shifts: s.shifts.map((x) => (x.id === id ? { ...x, ...sh } : x)) })),
      deleteShift: (id) => set((s) => ({ shifts: s.shifts.filter((x) => x.id !== id) })),

      addAbsence: (a) => set((s) => ({ absences: [...s.absences, { ...a, id: uid() }] })),
      updateAbsence: (id, a) => set((s) => ({ absences: s.absences.map((x) => (x.id === id ? { ...x, ...a } : x)) })),
      deleteAbsence: (id) => set((s) => ({ absences: s.absences.filter((x) => x.id !== id) })),

      addDepartment: (d) => set((s) => ({ departments: [...s.departments, { ...d, id: uid() }] })),
      deleteDepartment: (id) => set((s) => ({ departments: s.departments.filter((x) => x.id !== id) })),
      updateConfig: (c) => set((s) => ({ config: { ...s.config, ...c } })),
    }),
    { name: "tempo-store-v1" },
  ),
);

export function shiftMinutes(s: Shift): number {
  if (!s.end) return 0;
  return Math.max(0, Math.round((new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000));
}

export function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}
