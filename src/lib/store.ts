import { create } from "zustand";

export type Role = "admin" | "employee";
export type WorkMode = "presencial" | "teletrabajo" | "movil";

export type WeeklySchedule = Record<number, ShiftSegment[]>; // 0..6 (0=Dom)

export interface Address {
  street: string;
  floor: string;
  postalCode: string;
  city: string;
}

export interface User {
  id: string;
  name: string;
  lastName: string;
  secondLastName: string;
  nif: string;
  email: string;
  companyEmail: string;
  phone: string;
  address: Address;
  role: Role;
  department: string;
  weeklyHours: number;
  vacationDaysTotal: number;
  schedule: WeeklySchedule;
  avatar?: string; // base64 data URL
  avatarColor?: string; // hex/oklch for differentiating users
  consent?: boolean;
  passwordHash?: string; // SHA-256 hex del password
  permissions?: {
    bulk_add?: boolean;
    edit_shifts?: boolean;
    export?: boolean;
    manage_users?: boolean;
    manage_absences?: boolean;
    manage_config?: boolean;
    magic_balance?: boolean;
  };
}

export type ShiftStatus = "in_progress" | "finished";
export type SegmentType = "work" | "break";

export interface ShiftSegment {
  id: string;
  type: SegmentType;
  start: string; // HH:mm
  end: string;   // HH:mm
}

export interface Shift {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  start: string; // ISO
  end: string | null; // ISO
  notes?: string;
  status: ShiftStatus;
  segments?: ShiftSegment[];
  workMode?: WorkMode;
  actorId?: string; // who created/last edited
}

export type AbsenceStatus = "pending" | "approved" | "rejected";
export interface Absence {
  id: string;
  userId: string;
  reason: string;
  startDate: string;
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

export type HolidayScope = "national" | "regional" | "local" | "company";
export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  scope?: HolidayScope;
  color?: string;
  label?: string;
}

export type VacationKind = "vacation" | "sick" | "personal" | "other";
export interface VacationRange {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  notes?: string;
  kind?: VacationKind;
  color?: string;
  label?: string;
}

export interface FreeDay {
  id: string;
  userId: string;
  date: string;
  notes?: string;
}

export interface CompanyConfig {
  weeklyHours: number;
  annualHours: number;
  contractType: string;
  vacationDays: number;
  workDays: number[];
}

export interface AppearanceSettings {
  sidebarColor: string;
  backgroundColor: string;
  cardColor: string;
  sidebarOnBg: string;
  sidebarOverBg: string;
  primaryBtnBg: string;
  secondaryBtnHover: string;
}

export interface AuditEntry {
  id: string;
  ts: string;
  actorId: string | null;
  userId: string | null;
  action: string;
  details?: string;
}

interface AppState {
  loaded: boolean;
  currentUserId: string;
  sessionUserId: string | null;
  sessionCount: number;
  devMode: boolean;
  devPassword: string;
  devModeLastActivity: number; // ms epoch

  users: User[];
  shifts: Shift[];
  absences: Absence[];
  departments: Department[];
  holidays: Holiday[];
  vacations: VacationRange[];
  freeDays: FreeDay[];
  absenceTypes: string[];
  companyLogo: string; // base64 data URL
  config: CompanyConfig;
  auditLog: AuditEntry[];

  setCurrentUser: (id: string) => void;
  login: (fields: { name?: string; lastName?: string; secondLastName?: string; email?: string; nif: string }) => Promise<User | null>;
  logout: () => void;
  toggleDevMode: (password: string) => boolean;
  pingDevActivity: () => void;
  checkDevTimeout: () => void;
  forcePasswordChangeUserId: string | null;
  updatePassword: (userId: string, newPassword: string) => Promise<boolean>;

  addUser: (u: Omit<User, "id">) => void;
  updateUser: (id: string, u: Partial<User>) => void;
  deleteUser: (id: string) => void;

  startShift: (userId: string) => void;
  endShift: (userId: string) => void;
  addShift: (s: Omit<Shift, "id">) => void;
  addShiftsBulk: (s: Omit<Shift, "id">[]) => void;
  updateShift: (id: string, s: Partial<Shift>) => void;
  deleteShift: (id: string) => void;

  autoFillShifts: (userId: string, fromISODate: string, toISODate: string) => number;

  addAbsence: (a: Omit<Absence, "id">) => void;
  updateAbsence: (id: string, a: Partial<Absence>) => void;
  deleteAbsence: (id: string) => void;

  addHoliday: (h: Omit<Holiday, "id">) => void;
  updateHoliday: (id: string, h: Partial<Holiday>) => void;
  deleteHoliday: (id: string) => void;
  addVacation: (v: Omit<VacationRange, "id">) => void;
  updateVacation: (id: string, v: Partial<VacationRange>) => void;
  deleteVacation: (id: string) => void;
  addFreeDay: (f: Omit<FreeDay, "id">) => void;
  deleteFreeDay: (id: string) => void;

  addDepartment: (d: Omit<Department, "id">) => void;
  deleteDepartment: (id: string) => void;
  addAbsenceType: (name: string) => void;
  deleteAbsenceType: (name: string) => void;
  updateCompanyLogo: (logo: string) => void;
  updateConfig: (c: Partial<CompanyConfig>) => void;

  appearance: Partial<AppearanceSettings>;
  updateAppearance: (a: Partial<AppearanceSettings>) => void;

  logAudit: (action: string, details?: string, userId?: string | null) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const emptySchedule = (): WeeklySchedule => ({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] });

const standardSchedule = (): WeeklySchedule => {
  const weekDay = (): ShiftSegment[] => [
    { id: uid(), type: "work", start: "08:30", end: "14:00" },
    { id: uid(), type: "break", start: "14:00", end: "16:00" },
    { id: uid(), type: "work", start: "16:00", end: "18:30" },
  ];
  const friday = (): ShiftSegment[] => [
    { id: uid(), type: "work", start: "08:30", end: "14:00" },
  ];
  return { 0: [], 1: weekDay(), 2: weekDay(), 3: weekDay(), 4: weekDay(), 5: friday(), 6: [] };
};

const emptyAddress = (): Address => ({ street: "", floor: "", postalCode: "", city: "" });

const commonAddress: Address = { street: "Calle Zalaeta 4", floor: "", postalCode: "15002", city: "A Coruña" };

const seedUsers: User[] = [
  { id: "u1", name: "Elena Mariana", lastName: "Rodríguez", secondLastName: "de Abásolo", nif: "12345678M", email: "elena@molotov.es", companyEmail: "elena@molotov.es", phone: "981 142 254", address: commonAddress, role: "admin", department: "Gerencia", weeklyHours: 37.5, vacationDaysTotal: 22, schedule: standardSchedule(), avatarColor: "#6366f1", consent: true, permissions: { bulk_add: true, edit_shifts: true, export: true, manage_users: true, manage_absences: true, manage_config: true, magic_balance: true } },
  { id: "u2", name: "Eduardo", lastName: "Gutiérrez", secondLastName: "Ríos", nif: "12345678M", email: "arte.02@molotov.es", companyEmail: "arte.02@molotov.es", phone: "981 142 254", address: commonAddress, role: "employee", department: "Diseño", weeklyHours: 37.5, vacationDaysTotal: 22, schedule: standardSchedule(), avatarColor: "#10b981", consent: true, permissions: { bulk_add: true, edit_shifts: true, export: true, manage_users: true, manage_absences: true, manage_config: true, magic_balance: true } },
  { id: "u3", name: "Xan", lastName: "Domínguez", secondLastName: "García", nif: "12345678M", email: "xan@molotov.es", companyEmail: "xan@molotov.es", phone: "981 142 254", address: commonAddress, role: "employee", department: "Dirección Creativa", weeklyHours: 37.5, vacationDaysTotal: 22, schedule: standardSchedule(), avatarColor: "#f59e0b", consent: true, permissions: { bulk_add: true, edit_shifts: true, export: true, manage_users: true, manage_absences: true, manage_config: true, magic_balance: true } },
];

const seedHolidays: Holiday[] = [
  // ======== 2024 ========
  { id: "h24-01", date: "2024-01-01", name: "Año Nuevo", scope: "national", color: "#ef4444" },
  { id: "h24-02", date: "2024-01-06", name: "Epifanía del Señor", scope: "national", color: "#ef4444" },
  { id: "h24-03", date: "2024-03-28", name: "Jueves Santo", scope: "national", color: "#ef4444" },
  { id: "h24-04", date: "2024-03-29", name: "Viernes Santo", scope: "national", color: "#ef4444" },
  { id: "h24-05", date: "2024-05-01", name: "Día del Trabajo", scope: "national", color: "#ef4444" },
  { id: "h24-06", date: "2024-08-15", name: "Asunción de la Virgen", scope: "national", color: "#ef4444" },
  { id: "h24-07", date: "2024-10-12", name: "Fiesta Nacional de España", scope: "national", color: "#ef4444" },
  { id: "h24-08", date: "2024-11-01", name: "Todos los Santos", scope: "national", color: "#ef4444" },
  { id: "h24-09", date: "2024-12-06", name: "Día de la Constitución", scope: "national", color: "#ef4444" },
  { id: "h24-10", date: "2024-12-08", name: "Inmaculada Concepción", scope: "national", color: "#ef4444" },
  { id: "h24-11", date: "2024-12-25", name: "Natividad del Señor", scope: "national", color: "#ef4444" },
  // Galicia 2024
  { id: "h24-12", date: "2024-04-01", name: "Lunes de Pascua", scope: "regional", color: "#f97316" },
  { id: "h24-13", date: "2024-05-17", name: "Día das Letras Galegas", scope: "regional", color: "#f97316" },
  { id: "h24-14", date: "2024-07-25", name: "Día de Galicia / Santiago Apóstol", scope: "regional", color: "#f97316" },
  // A Coruña 2024
  { id: "h24-15", date: "2024-06-24", name: "San Juan", scope: "local", color: "#3b82f6" },

  // ======== 2025 ========
  { id: "h25-01", date: "2025-01-01", name: "Año Nuevo", scope: "national", color: "#ef4444" },
  { id: "h25-02", date: "2025-01-06", name: "Epifanía del Señor", scope: "national", color: "#ef4444" },
  { id: "h25-03", date: "2025-04-17", name: "Jueves Santo", scope: "national", color: "#ef4444" },
  { id: "h25-04", date: "2025-04-18", name: "Viernes Santo", scope: "national", color: "#ef4444" },
  { id: "h25-05", date: "2025-05-01", name: "Día del Trabajo", scope: "national", color: "#ef4444" },
  { id: "h25-06", date: "2025-08-15", name: "Asunción de la Virgen", scope: "national", color: "#ef4444" },
  { id: "h25-07", date: "2025-10-12", name: "Fiesta Nacional de España", scope: "national", color: "#ef4444" },
  { id: "h25-08", date: "2025-11-01", name: "Todos los Santos", scope: "national", color: "#ef4444" },
  { id: "h25-09", date: "2025-12-06", name: "Día de la Constitución", scope: "national", color: "#ef4444" },
  { id: "h25-10", date: "2025-12-08", name: "Inmaculada Concepción", scope: "national", color: "#ef4444" },
  { id: "h25-11", date: "2025-12-25", name: "Natividad del Señor", scope: "national", color: "#ef4444" },
  // Galicia 2025
  { id: "h25-12", date: "2025-04-21", name: "Lunes de Pascua", scope: "regional", color: "#f97316" },
  { id: "h25-13", date: "2025-05-17", name: "Día das Letras Galegas", scope: "regional", color: "#f97316" },
  { id: "h25-14", date: "2025-07-25", name: "Día de Galicia / Santiago Apóstol", scope: "regional", color: "#f97316" },
  // A Coruña 2025
  { id: "h25-15", date: "2025-06-24", name: "San Juan", scope: "local", color: "#3b82f6" },

  // ======== 2026 ========
  { id: "h26-01", date: "2026-01-01", name: "Año Nuevo", scope: "national", color: "#ef4444" },
  { id: "h26-02", date: "2026-01-06", name: "Epifanía del Señor", scope: "national", color: "#ef4444" },
  { id: "h26-03", date: "2026-04-02", name: "Jueves Santo", scope: "national", color: "#ef4444" },
  { id: "h26-04", date: "2026-04-03", name: "Viernes Santo", scope: "national", color: "#ef4444" },
  { id: "h26-05", date: "2026-05-01", name: "Día del Trabajo", scope: "national", color: "#ef4444" },
  { id: "h26-06", date: "2026-08-15", name: "Asunción de la Virgen", scope: "national", color: "#ef4444" },
  { id: "h26-07", date: "2026-10-12", name: "Fiesta Nacional de España", scope: "national", color: "#ef4444" },
  { id: "h26-08", date: "2026-11-01", name: "Todos los Santos", scope: "national", color: "#ef4444" },
  { id: "h26-09", date: "2026-12-06", name: "Día de la Constitución", scope: "national", color: "#ef4444" },
  { id: "h26-10", date: "2026-12-08", name: "Inmaculada Concepción", scope: "national", color: "#ef4444" },
  { id: "h26-11", date: "2026-12-25", name: "Natividad del Señor", scope: "national", color: "#ef4444" },
  // Galicia 2026
  { id: "h26-12", date: "2026-04-06", name: "Lunes de Pascua", scope: "regional", color: "#f97316" },
  { id: "h26-13", date: "2026-05-17", name: "Día das Letras Galegas", scope: "regional", color: "#f97316" },
  { id: "h26-14", date: "2026-07-25", name: "Día de Galicia / Santiago Apóstol", scope: "regional", color: "#f97316" },
  // A Coruña 2026
  { id: "h26-15", date: "2026-06-24", name: "San Juan", scope: "local", color: "#3b82f6" },
];

const seedDepartments: Department[] = [
  { id: "d1", name: "Gerencia", color: "#c4b5fd" },
  { id: "d2", name: "Diseño", color: "#86efac" },
  { id: "d3", name: "Dirección Creativa", color: "#93c5fd" },
  { id: "d4", name: "Otro", color: "#d4d4d8" },
];

export function normalize(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode("Tempo2024!" + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function validatePassword(password: string, user: User): string | null {
  if (password.length < 12) return "Mínimo 12 caracteres";
  if (!/[A-Z]/.test(password)) return "Debe contener al menos una mayúscula";
  if (!/[a-z]/.test(password)) return "Debe contener al menos una minúscula";
  if (!/[0-9]/.test(password)) return "Debe contener al menos un número";
  if (!/[^A-Za-z0-9\s]/.test(password)) return "Debe contener al menos un carácter especial";
  const lower = password.toLowerCase();
  if (lower.includes(user.name.toLowerCase())) return "No puede contener tu nombre";
  if (lower.includes(user.lastName.toLowerCase())) return "No puede contener tu apellido";
  if (lower.includes(user.nif.toLowerCase())) return "No puede contener tu NIF";
  if (lower.includes(user.email.toLowerCase().split("@")[0])) return "No puede contener tu email";
  if (user.companyEmail && lower.includes(user.companyEmail.toLowerCase().split("@")[0])) return "No puede contener tu email corporativo";
  return null;
}

// Rate limiting: in-memory only, not persisted
const loginLockouts = new Map<string, { count: number; until: number }>();

function eachDateBetween(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  const d = new Date(fromISO + "T12:00:00");
  const end = new Date(toISO + "T12:00:00");
  if (d > end) return out;
  while (d <= end) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function isHoliday(date: string, holidays: Holiday[]): Holiday | undefined {
  return holidays.find((h) => h.date === date);
}

export function isVacation(date: string, userId: string, vacations: VacationRange[]): VacationRange | undefined {
  return vacations.find((v) => v.userId === userId && date >= v.startDate && date <= v.endDate);
}

export function isFreeDay(date: string, userId: string, freeDays: FreeDay[]): FreeDay | undefined {
  return freeDays.find((f) => f.userId === userId && f.date === date);
}

/** Allow manual editing/adding only for the last 7 days (rolling) when dev mode is off. */
export function canEditShiftDate(dateISO: string, devMode: boolean): boolean {
  if (devMode) return true;
  const d = new Date(dateISO + (dateISO.length === 10 ? "T00:00:00" : ""));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((today.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
  return diffDays >= 0 && diffDays <= 7;
}

function generateSeedShifts(): Shift[] {
  const out: Shift[] = [];
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  for (const user of seedUsers) {
    const dates = eachDateBetween("2024-01-01", todayStr);
    for (const date of dates) {
      if (seedHolidays.some((h) => h.date === date)) continue;
      const dow = new Date(date + "T12:00:00").getDay();
      const tmpl = user.schedule?.[dow] ?? [];
      const works = tmpl.filter((s) => s.type === "work");
      if (works.length === 0) continue;
      const ordered = [...tmpl].sort((a, b) => a.start.localeCompare(b.start));
      const segs = ordered.map((s) => ({ ...s, id: uid() }));
      const startTime = ordered[0].start;
      const endTime = ordered[ordered.length - 1].end;
      out.push({
        id: uid(),
        userId: user.id,
        date,
        start: new Date(`${date}T${startTime}:00`).toISOString(),
        end: new Date(`${date}T${endTime}:00`).toISOString(),
        status: "finished",
        segments: segs,
        actorId: user.id,
      });
    }
  }
  return out;
}

function savePasswordHash(userId: string, hash: string) {
  try {
    const all = JSON.parse(localStorage.getItem("tempo-pwd") || "{}");
    all[userId] = hash;
    localStorage.setItem("tempo-pwd", JSON.stringify(all));
    const set = JSON.parse(localStorage.getItem("tempo-set-pwd") || "[]");
    if (!set.includes(userId)) set.push(userId);
    localStorage.setItem("tempo-set-pwd", JSON.stringify(set));
  } catch {}
}

function applyPasswordHashes(users: User[]): User[] {
  try {
    const raw = localStorage.getItem("tempo-pwd");
    if (!raw) return users;
    const hashes = JSON.parse(raw) as Record<string, string>;
    return users.map((u) => (hashes[u.id] ? { ...u, passwordHash: hashes[u.id] } : u));
  } catch {
    return users;
  }
}

function saveUsersToLocal(users: User[]) {
  try {
    localStorage.setItem("tempo-users", JSON.stringify(users));
  } catch {}
}

let _hydrating = true;
let _saveTimer: ReturnType<typeof setTimeout> | null = null;

const initialUsers = applyPasswordHashes(seedUsers);

// Intentar cargar desde localStorage en la inicialización
function loadInitialState(): Partial<AppState> {
  try {
    const saved = localStorage.getItem("tempo-store-v6");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        if (parsed.users) parsed.users = applyPasswordHashes(parsed.users as User[]);
        return parsed;
      }
    }
  } catch {}
  return {};
}

const initialState = loadInitialState();

export const useAppStore = create<AppState>()((set, get) => ({
  loaded: false,
  currentUserId: initialState.currentUserId ?? "u1",
  sessionUserId: null,
  sessionCount: 0,
  devMode: initialState.devMode ?? false,
  devPassword: import.meta.env.VITE_DEV_PASSWORD ?? "molo",
  devModeLastActivity: 0,
  forcePasswordChangeUserId: null,

  users: (initialState.users as User[]) ?? initialUsers,
  shifts: (initialState.shifts as Shift[]) ?? generateSeedShifts(),
  absences: [],
  departments: seedDepartments,
  holidays: seedHolidays,
  vacations: [],
  freeDays: [],
  absenceTypes: ["Vacaciones", "Enfermedad", "Asuntos propios", "Permiso retribuido", "Otro"],
  companyLogo: "",
  auditLog: [],
      config: {
        weeklyHours: 37.5,
        annualHours: 1723,
        contractType: "Jornada completa",
        vacationDays: 22,
        workDays: [1, 2, 3, 4, 5],
      },

      appearance: initialState.appearance ?? {},

      setCurrentUser: (id) => set({ currentUserId: id }),

      login: async (fields) => {
        const passwordValue = fields.nif.trim();
        if (!passwordValue) return null;

        // Load server data first so users are available for matching
        if (!get().loaded) {
          try {
            const res = await fetch(apiUrl("/api/data.php"), { cache: "no-store" });
            if (res.ok) {
              const data = await res.json();
              if (data && typeof data === "object" && Array.isArray(data.users)) {
                const clean: Record<string, unknown> = { loaded: true };
                for (const k of ALLOWED_KEYS) {
                  if (k in data) clean[k] = data[k];
                }
                if (clean.users) clean.users = applyPasswordHashes(clean.users as User[]);
                useAppStore.setState(clean);
              }
            }
          } catch {}
        }

        // Try server-side JWT login first (only when a real email is provided)
        if (fields.email && fields.email.includes("@")) {
          try {
            const loginRes = await fetch(apiUrl("/api/data.php?action=login"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: fields.email, password: passwordValue }),
            });
            if (loginRes.ok) {
              const loginData = await loginRes.json();
              if (loginData.token) {
                sessionStorage.setItem("tempo-jwt", loginData.token);
                sessionStorage.setItem("tempo-user-id", loginData.user.id);
                // Reload full data with token
                await loadFromServer({ preferServer: true });
                const updated = useAppStore.getState();
                const user = updated.users.find((u) => u.id === loginData.user.id);
                if (user) {
                  get().logAudit("login", `Sesión iniciada`, user.id);
                  set({ sessionUserId: user.id, currentUserId: user.id, forcePasswordChangeUserId: null });
                  return user;
                }
              }
            }
          } catch {
            // Server login not available, fall through to client-side
          }
        }

        // Client-side fallback (backward compat)
        const lockKey = fields.email?.toLowerCase() || (fields.name + "|" + fields.lastName).toLowerCase() || "unknown";
        const now = Date.now();
        const lock = loginLockouts.get(lockKey);
        if (lock && lock.until > now) {
          get().logAudit("login_blocked", "Cuenta temporalmente bloqueada por muchos intentos");
          return null;
        }

        const user = get().users.find((u) => {
          let matched = false;
          if (fields.email) {
            if (normalize(u.email) !== normalize(fields.email) && normalize(u.companyEmail || "") !== normalize(fields.email)) return false;
            matched = true;
          }
          if (fields.name) {
            if (normalize(u.name) !== normalize(fields.name)) return false;
            matched = true;
          }
          if (fields.lastName) {
            if (normalize(u.lastName) !== normalize(fields.lastName)) return false;
            matched = true;
          }
          if (fields.secondLastName) {
            if (normalize(u.secondLastName || "") !== normalize(fields.secondLastName)) return false;
            matched = true;
          }
          return matched;
        });

        if (!user) {
          const existing = loginLockouts.get(lockKey);
          const count = (existing?.count ?? 0) + 1;
          if (count >= 5) {
            loginLockouts.set(lockKey, { count, until: now + 15 * 60 * 1000 });
          } else {
            loginLockouts.set(lockKey, { count, until: 0 });
          }
          get().logAudit("login_failed", "Intento fallido", undefined);
          return null;
        }

        let validPassword = false;
        if (user.passwordHash) {
          const hash = await hashPassword(passwordValue);
          validPassword = hash === user.passwordHash;
        }
        if (!validPassword) {
          validPassword = user.nif.trim() === passwordValue;
        }

        if (!validPassword) {
          const existing = loginLockouts.get(lockKey);
          const count = (existing?.count ?? 0) + 1;
          if (count >= 5) {
            loginLockouts.set(lockKey, { count, until: now + 15 * 60 * 1000 });
          } else {
            loginLockouts.set(lockKey, { count, until: 0 });
          }
          get().logAudit("login_failed", "Intento fallido", user.id);
          return null;
        }

        loginLockouts.delete(lockKey);

        sessionStorage.setItem("tempo-user-id", user.id);

        const needsChange = !user.passwordHash;
        get().logAudit("login", `Sesión iniciada`, user.id);
        if (needsChange) {
          set({ sessionUserId: user.id, currentUserId: user.id, forcePasswordChangeUserId: user.id });
        } else {
          set({ sessionUserId: user.id, currentUserId: user.id, forcePasswordChangeUserId: null });
        }
        forceSave();
        return user;
      },
      logout: () => {
        const uid = get().sessionUserId;
        get().logAudit("logout", `Sesión cerrada`, uid);
        sessionStorage.removeItem("tempo-jwt");
        sessionStorage.removeItem("tempo-user-id");
        set((s) => ({ sessionUserId: null, sessionCount: s.sessionCount + 1 }));
      },
      updatePassword: async (userId, newPassword) => {
        const hash = await hashPassword(newPassword);
        savePasswordHash(userId, hash);
        set((s) => ({
          users: s.users.map((u) => (u.id === userId ? { ...u, passwordHash: hash } : u)),
          forcePasswordChangeUserId: null,
        }));
        get().logAudit("password_change", "Contraseña actualizada", userId);
        forceSave();
        return true;
      },
      toggleDevMode: (password) => {
        if (password !== get().devPassword) return false;
        set((s) => ({ devMode: !s.devMode, devModeLastActivity: !s.devMode ? Date.now() : 0 }));
        get().logAudit("dev_mode_toggle", `Admin mode → ${get().devMode ? "ON" : "OFF"}`);
        return true;
      },
      pingDevActivity: () => {
        if (get().devMode) set({ devModeLastActivity: Date.now() });
      },
      checkDevTimeout: () => {
        const s = get();
        if (!s.devMode) return;
        if (Date.now() - s.devModeLastActivity > 15 * 60 * 1000) {
          set({ devMode: false, devModeLastActivity: 0 });
          s.logAudit("dev_mode_timeout", "Auto-desactivado por inactividad (15 min)");
        }
      },

      logAudit: (action, details, userId) =>
        set((s) => ({
          auditLog: [
            { id: uid(), ts: new Date().toISOString(), actorId: s.sessionUserId, userId: userId ?? null, action, details },
            ...s.auditLog,
          ].slice(0, 5000),
        })),

      addUser: (u) => {
        set((s) => ({ users: [...s.users, { ...u, id: uid(), permissions: { bulk_add: true, edit_shifts: true, export: true, manage_users: true, manage_absences: true, manage_config: true, magic_balance: true } }] }));
        get().logAudit("user_create", u.name);
      },
      updateUser: (id, u) => {
        set((s) => ({ users: s.users.map((x) => (x.id === id ? { ...x, ...u } : x)) }));
        get().logAudit("user_update", id, id);
      },
      deleteUser: (id) => {
        set((s) => ({ users: s.users.filter((x) => x.id !== id) }));
        get().logAudit("user_delete", id, id);
      },

      startShift: (userId) => {
        set((s) => {
          const now = new Date();
          const y = now.getFullYear();
          const m = String(now.getMonth() + 1).padStart(2, "0");
          const d = String(now.getDate()).padStart(2, "0");
          const date = `${y}-${m}-${d}`;
          return {
            shifts: [
              ...s.shifts,
              { id: uid(), userId, date, start: now.toISOString(), end: null, status: "in_progress", actorId: s.sessionUserId ?? userId },
            ],
          };
        });
        get().logAudit("shift_start", undefined, userId);
      },
      endShift: (userId) => {
        set((s) => ({
          shifts: s.shifts.map((sh) =>
            sh.userId === userId && sh.status === "in_progress"
              ? { ...sh, end: new Date().toISOString(), status: "finished" }
              : sh,
          ),
        }));
        get().logAudit("shift_end", undefined, userId);
      },
      addShift: (sh) => {
        const actorId = get().sessionUserId ?? null;
        set((s) => ({ shifts: [...s.shifts, { ...sh, id: uid(), actorId: sh.actorId ?? actorId ?? sh.userId }] }));
        get().logAudit("shift_add", sh.date, sh.userId);
      },
      addShiftsBulk: (arr) => {
        const actorId = get().sessionUserId ?? null;
        set((s) => ({ shifts: [...s.shifts, ...arr.map((sh) => ({ ...sh, id: uid(), actorId: sh.actorId ?? actorId ?? sh.userId }))] }));
        get().logAudit("shift_bulk_add", `${arr.length} jornadas`);
      },
      updateShift: (id, sh) => {
        set((s) => ({ shifts: s.shifts.map((x) => (x.id === id ? { ...x, ...sh } : x)) }));
        get().logAudit("shift_update", id);
        try { localStorage.setItem("tempo-store-v6", JSON.stringify(stateToJSON())); } catch {}
      },
      deleteShift: (id) => {
        set((s) => ({ shifts: s.shifts.filter((x) => x.id !== id) }));
        get().logAudit("shift_delete", id);
      },

      autoFillShifts: (userId, fromISO, toISO) => {
        const state = get();
        const user = state.users.find((u) => u.id === userId);
        if (!user) return 0;
        const existingDates = new Set(
          state.shifts.filter((s) => s.userId === userId).map((s) => s.start.slice(0, 10)),
        );
        const created: Shift[] = [];
        for (const date of eachDateBetween(fromISO, toISO)) {
          if (existingDates.has(date)) continue;
          if (isHoliday(date, state.holidays)) continue;
          if (isVacation(date, userId, state.vacations)) continue;
          if (isFreeDay(date, userId, state.freeDays)) continue;
          const dow = new Date(date + "T12:00:00").getDay();
          const tmpl = user.schedule?.[dow] ?? [];
          const works = tmpl.filter((s) => s.type === "work");
          if (works.length === 0) continue;
          const ordered = [...tmpl].sort((a, b) => a.start.localeCompare(b.start));
          const segs = ordered.map((s) => ({ ...s, id: uid() }));
          const startTime = ordered[0].start;
          const endTime = ordered[ordered.length - 1].end;
          created.push({
            id: uid(),
            userId,
            date,
            start: new Date(`${date}T${startTime}:00`).toISOString(),
            end: new Date(`${date}T${endTime}:00`).toISOString(),
            status: "finished",
            segments: segs,
            actorId: state.sessionUserId ?? userId,
          });
        }
        if (created.length) {
          set((s) => ({ shifts: [...s.shifts, ...created] }));
          get().logAudit("shift_autofill", `${created.length} jornadas`, userId);
        }
        return created.length;
      },

      addAbsence: (a) => set((s) => ({ absences: [...s.absences, { ...a, id: uid() }] })),
      updateAbsence: (id, a) => set((s) => ({ absences: s.absences.map((x) => (x.id === id ? { ...x, ...a } : x)) })),
      deleteAbsence: (id) => set((s) => ({ absences: s.absences.filter((x) => x.id !== id) })),

      addHoliday: (h) => {
        set((s) => ({ holidays: [...s.holidays.filter((x) => x.date !== h.date), { ...h, id: uid() }] }));
        get().logAudit("holiday_add", `${h.date} ${h.name}`);
      },
      updateHoliday: (id, h) => set((s) => ({ holidays: s.holidays.map((x) => (x.id === id ? { ...x, ...h } : x)) })),
      deleteHoliday: (id) => {
        set((s) => ({ holidays: s.holidays.filter((x) => x.id !== id) }));
        get().logAudit("holiday_delete", id);
      },
      addVacation: (v) => set((s) => ({ vacations: [...s.vacations, { ...v, id: uid() }] })),
      updateVacation: (id, v) => set((s) => ({ vacations: s.vacations.map((x) => (x.id === id ? { ...x, ...v } : x)) })),
      deleteVacation: (id) => set((s) => ({ vacations: s.vacations.filter((x) => x.id !== id) })),
      addFreeDay: (f) => set((s) => ({ freeDays: [...s.freeDays.filter((x) => !(x.date === f.date && x.userId === f.userId)), { ...f, id: uid() }] })),
      deleteFreeDay: (id) => set((s) => ({ freeDays: s.freeDays.filter((x) => x.id !== id) })),

      addDepartment: (d) => set((s) => ({ departments: [...s.departments, { ...d, id: uid() }] })),
      deleteDepartment: (id) => set((s) => ({ departments: s.departments.filter((x) => x.id !== id) })),
      addAbsenceType: (name) => set((s) => ({ absenceTypes: s.absenceTypes.includes(name) ? s.absenceTypes : [...s.absenceTypes, name] })),
      deleteAbsenceType: (name) => set((s) => ({ absenceTypes: s.absenceTypes.filter((x) => x !== name) })),
      updateCompanyLogo: (logo) => set({ companyLogo: logo }),
      updateConfig: (c) => set((s) => ({ config: { ...s.config, ...c } })),
      updateAppearance: (a) => set((s) => ({ appearance: { ...s.appearance, ...a } })),
    }),
  );

function migrateLocalStorage(): Partial<AppState> {
  try {
    const raw = localStorage.getItem("tempo-store-v5");
    if (!raw) return {};
    const p = JSON.parse(raw) as Partial<AppState> & Record<string, unknown>;
    const users = Array.isArray(p.users) ? (p.users as Partial<User>[]) : [];
    const fixedUsers: User[] = users.map((u) => ({
      id: u.id ?? uid(),
      name: u.name ?? "",
      lastName: (u as { lastName?: string }).lastName ?? "",
      secondLastName: (u as { secondLastName?: string }).secondLastName ?? "",
      nif: (u as { nif?: string }).nif ?? "",
      email: u.email ?? "",
      companyEmail: (u as { companyEmail?: string }).companyEmail ?? u.email ?? "",
      phone: (u as { phone?: string }).phone ?? "",
      address: (u as { address?: Address }).address ?? emptyAddress(),
      role: (u.role as Role) ?? "employee",
      department: u.department ?? "Otro",
      weeklyHours: u.weeklyHours ?? 37.5,
      vacationDaysTotal: u.vacationDaysTotal ?? 22,
      schedule: (u as { schedule?: WeeklySchedule }).schedule ?? emptySchedule(),
      avatar: (u as { avatar?: string }).avatar,
      avatarColor: (u as { avatarColor?: string }).avatarColor,
      consent: (u as { consent?: boolean }).consent ?? false,
      passwordHash: (u as { passwordHash?: string }).passwordHash,
    }));
    return {
      ...p,
      users: fixedUsers,
      holidays: (p as { holidays?: Holiday[] }).holidays ?? [],
      vacations: (p as { vacations?: VacationRange[] }).vacations ?? [],
      freeDays: (p as { freeDays?: FreeDay[] }).freeDays ?? [],
      absenceTypes: (p as { absenceTypes?: string[] }).absenceTypes ?? ["Vacaciones", "Enfermedad", "Asuntos propios", "Permiso retribuido", "Otro"],
      companyLogo: (p as { companyLogo?: string }).companyLogo ?? "",
      auditLog: (p as { auditLog?: AuditEntry[] }).auditLog ?? [],
      sessionUserId: (p as { sessionUserId?: string | null }).sessionUserId ?? null,
      devMode: (p as { devMode?: boolean }).devMode ?? false,
      devModeLastActivity: 0,
      devPassword: (p as { devPassword?: string }).devPassword ?? "molo",
    };
  } catch {
    return {};
  }
}

export function stateToJSON() {
  const s = useAppStore.getState();
  return {
    currentUserId: s.currentUserId,
    users: s.users,
    shifts: s.shifts,
    absences: s.absences,
    departments: s.departments,
    holidays: s.holidays,
    vacations: s.vacations,
    freeDays: s.freeDays,
    absenceTypes: s.absenceTypes,
    companyLogo: s.companyLogo,
    config: s.config,
    auditLog: s.auditLog,
    devMode: s.devMode,
    appearance: s.appearance,
  };
}

const ALLOWED_KEYS = new Set([
  "currentUserId", "users", "shifts", "absences", "departments",
  "holidays", "vacations", "freeDays", "absenceTypes", "companyLogo", "config", "auditLog", "devMode", "appearance",
]);

export function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_URL ?? "";
  return base + path;
}

function getJwtToken(): string | null {
  return sessionStorage.getItem("tempo-jwt");
}

export function authHeaders(): Record<string, string> {
  const token = getJwtToken();
  if (token) {
    return {
      "Authorization": `Bearer ${token}`,
      "X-Auth-Token": `Bearer ${token}`,
    };
  }
  return {};
}

export async function loadFromServer(options?: { preferServer?: boolean }) {
  const token = getJwtToken();
  const sid = sessionStorage.getItem("tempo-user-id");

  // 1. localStorage primero (si no se pide servidor explícitamente)
  if (!options?.preferServer) {
    const saved = localStorage.getItem("tempo-store-v6");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          if (parsed.users) parsed.users = applyPasswordHashes(parsed.users as User[]);
          if (sid) parsed.sessionUserId = sid;
          useAppStore.setState({ ...parsed, loaded: true });
          _hydrating = false;
          // Sincronizar con servidor en segundo plano
          forceSave();
          return;
        }
      } catch {}
    }
  }

  // 2. Servidor
  try {
    const res = await fetch(apiUrl("/api/data.php"), {
      headers: token ? authHeaders() : {},
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === "object" && Array.isArray(data.users) && data.users.length > 0) {
        const clean: Record<string, unknown> = { loaded: true };
        for (const k of ALLOWED_KEYS) {
          if (k in data) clean[k] = data[k];
        }
        if (clean.users) clean.users = applyPasswordHashes(clean.users as User[]);
        if (sid) clean.sessionUserId = sid;
        useAppStore.setState(clean);
        _hydrating = false;
        return;
      }
    }
    if (token) {
      sessionStorage.removeItem("tempo-jwt");
      sessionStorage.removeItem("tempo-user-id");
    }
  } catch {}

  // 3. Seeds como último recurso
  useAppStore.setState({ loaded: true });
  _hydrating = false;
}

function trySyncWithServer() {
  const token = getJwtToken();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(token ? authHeaders() : {}) };
  const payload = stateToJSON();
  fetch(apiUrl("/api/data.php"), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  }).catch(() => {});
}

export function forceSave() {
  const payload = stateToJSON();
  const headers: Record<string, string> = { "Content-Type": "application/json", ...authHeaders() };
  fetch(apiUrl("/api/data.php"), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  }).catch(() => {});
}

useAppStore.subscribe(() => {
  if (_hydrating) return;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => forceSave(), 800);
  const s = useAppStore.getState();
  saveUsersToLocal(s.users);
  try {
    localStorage.setItem("tempo-store-v6", JSON.stringify(stateToJSON()));
  } catch {}
});

function segMinutes(seg: ShiftSegment): number {
  const [sh, sm] = seg.start.split(":").map(Number);
  const [eh, em] = seg.end.split(":").map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

export function shiftMinutes(s: Shift): number {
  if (s.segments && s.segments.length) {
    return s.segments.filter((x) => x.type === "work").reduce((a, x) => a + segMinutes(x), 0);
  }
  if (!s.end) return 0;
  return Math.max(0, Math.round((new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000));
}

export function breakMinutes(s: Shift): number {
  if (!s.segments) return 0;
  return s.segments.filter((x) => x.type === "break").reduce((a, x) => a + segMinutes(x), 0);
}

/** Minutes worked between 22:00 and 06:00 (night work). */
export function nightMinutes(s: Shift): number {
  if (!s.segments) return 0;
  let n = 0;
  for (const seg of s.segments) {
    if (seg.type !== "work") continue;
    const [sh, sm] = seg.start.split(":").map(Number);
    const [eh, em] = seg.end.split(":").map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    // night windows in minutes: 0..360 and 1320..1440
    n += Math.max(0, Math.min(end, 360) - Math.max(start, 0));
    n += Math.max(0, Math.min(end, 1440) - Math.max(start, 1320));
  }
  return n;
}

export function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}
