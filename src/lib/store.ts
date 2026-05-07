import { create } from "zustand";
import { persist } from "zustand/middleware";

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

export interface AuditEntry {
  id: string;
  ts: string;
  actorId: string | null;
  userId: string | null;
  action: string;
  details?: string;
}

interface AppState {
  currentUserId: string;
  sessionUserId: string | null;
  devMode: boolean;
  devPassword: string;

  users: User[];
  shifts: Shift[];
  absences: Absence[];
  departments: Department[];
  holidays: Holiday[];
  vacations: VacationRange[];
  freeDays: FreeDay[];
  config: CompanyConfig;
  auditLog: AuditEntry[];

  setCurrentUser: (id: string) => void;
  login: (name: string, lastName: string, nif: string) => User | null;
  logout: () => void;
  toggleDevMode: (password: string) => boolean;

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
  updateConfig: (c: Partial<CompanyConfig>) => void;

  logAudit: (action: string, details?: string, userId?: string | null) => void;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const emptySchedule = (): WeeklySchedule => ({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] });

const standardSchedule = (): WeeklySchedule => {
  const longDay = (): ShiftSegment[] => [
    { id: uid(), type: "work", start: "09:00", end: "13:00" },
    { id: uid(), type: "break", start: "13:00", end: "14:00" },
    { id: uid(), type: "work", start: "14:00", end: "17:30" },
  ];
  const friday = (): ShiftSegment[] => [
    { id: uid(), type: "work", start: "09:00", end: "15:00" },
  ];
  return { 0: [], 1: longDay(), 2: longDay(), 3: longDay(), 4: longDay(), 5: friday(), 6: [] };
};

const emptyAddress = (): Address => ({ street: "", floor: "", postalCode: "", city: "" });

const seedUsers: User[] = [
  { id: "u1", name: "Ana", lastName: "García", nif: "00000001A", email: "ana@empresa.com", companyEmail: "ana@empresa.com", phone: "", address: emptyAddress(), role: "admin", department: "Dirección", weeklyHours: 37.5, vacationDaysTotal: 22, schedule: standardSchedule(), consent: true },
  { id: "u2", name: "Carlos", lastName: "Ruiz", nif: "00000002B", email: "carlos@empresa.com", companyEmail: "carlos@empresa.com", phone: "", address: emptyAddress(), role: "employee", department: "Ventas", weeklyHours: 37.5, vacationDaysTotal: 22, schedule: standardSchedule(), consent: true },
  { id: "u3", name: "Laura", lastName: "Méndez", nif: "00000003C", email: "laura@empresa.com", companyEmail: "laura@empresa.com", phone: "", address: emptyAddress(), role: "employee", department: "Administración", weeklyHours: 35, vacationDaysTotal: 22, schedule: standardSchedule(), consent: true },
];

const seedDepartments: Department[] = [
  { id: "d1", name: "Administración", color: "#93c5fd" },
  { id: "d2", name: "Dirección", color: "#c4b5fd" },
  { id: "d3", name: "Ventas", color: "#86efac" },
  { id: "d4", name: "Servicio técnico", color: "#fdba74" },
  { id: "d5", name: "Otro", color: "#d4d4d8" },
];

function normalize(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function eachDateBetween(fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  const d = new Date(fromISO + "T00:00:00");
  const end = new Date(toISO + "T00:00:00");
  if (d > end) return out;
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUserId: "u1",
      sessionUserId: null,
      devMode: false,
      devPassword: "molo",

      users: seedUsers,
      shifts: [],
      absences: [],
      departments: seedDepartments,
      holidays: [],
      vacations: [],
      freeDays: [],
      auditLog: [],
      config: {
        weeklyHours: 37.5,
        annualHours: 1723,
        contractType: "Jornada completa",
        vacationDays: 22,
        workDays: [1, 2, 3, 4, 5],
      },

      setCurrentUser: (id) => set({ currentUserId: id }),

      login: (name, lastName, nif) => {
        const n = normalize(name);
        const l = normalize(lastName);
        const id = nif.trim().toUpperCase();
        const user = get().users.find(
          (u) => normalize(u.name) === n && normalize(u.lastName) === l && u.nif.trim().toUpperCase() === id,
        );
        if (!user) return null;
        set({ sessionUserId: user.id, currentUserId: user.id });
        get().logAudit("login", `Sesión iniciada`, user.id);
        return user;
      },
      logout: () => {
        const uid = get().sessionUserId;
        get().logAudit("logout", `Sesión cerrada`, uid);
        set({ sessionUserId: null });
      },
      toggleDevMode: (password) => {
        if (password !== get().devPassword) return false;
        set((s) => ({ devMode: !s.devMode }));
        get().logAudit("dev_mode_toggle", `Modo desarrollador → ${get().devMode ? "ON" : "OFF"}`);
        return true;
      },

      logAudit: (action, details, userId) =>
        set((s) => ({
          auditLog: [
            { id: uid(), ts: new Date().toISOString(), actorId: s.sessionUserId, userId: userId ?? null, action, details },
            ...s.auditLog,
          ].slice(0, 5000),
        })),

      addUser: (u) => {
        set((s) => ({ users: [...s.users, { ...u, id: uid() }] }));
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
          const date = now.toISOString().slice(0, 10);
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
          const dow = new Date(date + "T00:00:00").getDay();
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
            notes: "Autocompletado desde horario",
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
      updateConfig: (c) => set((s) => ({ config: { ...s.config, ...c } })),
    }),
    {
      name: "tempo-store-v4",
      version: 4,
      migrate: (persisted: unknown) => {
        const p = (persisted ?? {}) as Partial<AppState> & Record<string, unknown>;
        const users = Array.isArray(p.users) ? (p.users as Partial<User>[]) : seedUsers;
        const fixedUsers: User[] = users.map((u) => ({
          id: u.id ?? uid(),
          name: u.name ?? "",
          lastName: (u as { lastName?: string }).lastName ?? "",
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
          consent: (u as { consent?: boolean }).consent ?? false,
        }));
        return {
          ...p,
          users: fixedUsers,
          holidays: (p as { holidays?: Holiday[] }).holidays ?? [],
          vacations: (p as { vacations?: VacationRange[] }).vacations ?? [],
          freeDays: (p as { freeDays?: FreeDay[] }).freeDays ?? [],
          auditLog: (p as { auditLog?: AuditEntry[] }).auditLog ?? [],
          sessionUserId: (p as { sessionUserId?: string | null }).sessionUserId ?? null,
          devMode: (p as { devMode?: boolean }).devMode ?? false,
          devPassword: (p as { devPassword?: string }).devPassword ?? "molo",
        };
      },
    },
  ),
);

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
