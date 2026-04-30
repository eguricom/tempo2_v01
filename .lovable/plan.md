# Plan: Horario, modo desarrollador y sesión

Tres bloques independientes que se integran en el store local existente.

## 1. Horario laboral en el usuario + autorrelleno

**Modelo (`src/lib/store.ts`)**
- Añadir a `User`:
  - `nif: string`
  - `lastName: string` (primer apellido — se separa del `name`)
  - `schedule: WeeklySchedule` donde `WeeklySchedule = Record<0..6, ShiftSegment[]>` (franjas por día de la semana, mismo formato que `ShiftSegment`).
- Helper `autoFillShifts(userId, from, to)` que:
  - Recorre cada día entre `from` y `to`.
  - Si para ese día NO existe ya un `Shift` del usuario y el día tiene franjas en `schedule`, crea un `Shift` con esas `segments` (start = primera franja work, end = última franja work, status `finished`).
  - Devuelve cuántas jornadas se rellenaron.

**UI Usuarios (`src/routes/usuarios.tsx`)**
- Añadir campos en `UserForm`: NIF, primer apellido.
- Añadir un sub-bloque "Horario laboral" con un `WeeklyScheduleEditor` (nuevo componente) que reutiliza `SegmentEditor` por cada día (Lun–Dom), con toggle "día laborable".

**UI Configuración del usuario actual (`src/routes/configuracion.tsx`)**
- Nueva tarjeta "Mi horario laboral" que edita el `schedule` del `currentUser` (mismo `WeeklyScheduleEditor`).
- Nueva tarjeta "Rellenar fichajes olvidados":
  - Modo "Rango": selector de fechas (desde / hasta) + botón "Rellenar".
  - Modo "Automático desde fecha": una fecha de inicio + botón "Rellenar hasta hoy".
  - Ambos llaman a `autoFillShifts`. Toast con resultado.

## 2. Modo desarrollador

**Estado en store**
- `devMode: boolean` (default `true`, "siempre activado" al arrancar).
- `devPassword: string` (default `"molo"`).
- Acciones: `toggleDevMode(password)` valida y conmuta.

**UI**
- En `AppHeader`: botón/toggle "Modo desarrollador" siempre visible. Al pulsar abre un dialog que pide contraseña; si coincide, conmuta.
- Helper `useCanEdit()` = `devMode`.

**Gating**
- `ShiftFormDialog`, `BulkShiftDialog`, botones "Nueva jornada" / "Añadir en lote" / editar / eliminar / "Rellenar fichajes" → deshabilitados (con tooltip "Activa el modo desarrollador") cuando `devMode === false`.
- En `index.tsx` y `ShiftsCalendar`:
  - Botón "Comenzar / Finalizar jornada" siempre disponible.
  - Click en jornadas existentes: solo abre el editor si `devMode` **o** si es la jornada `in_progress` del usuario actual (única excepción permitida).
  - Crear desde día del calendario: bloqueado salvo `devMode`.

## 3. Inicio / fin de sesión local

**Estado en store**
- `sessionUserId: string | null` (persistido).
- `login(name, lastName, nif)` busca en `users` (case-insensitive, trim) y si coincide setea `sessionUserId` + `currentUserId`. Devuelve boolean.
- `logout()` pone `sessionUserId = null`.

**UI**
- En `AppHeader`: botón "Cerrar sesión" cuando hay sesión.
- Nuevo componente `LoginOverlay` montado en `__root.tsx`:
  - Si `sessionUserId == null`: renderiza un overlay fijo a pantalla completa con `backdrop-blur-xl bg-background/60` y una `Card` flotante centrada con formulario (Nombre, Primer apellido, NIF + botón "Entrar").
  - Mientras esté visible, el resto de la app queda detrás con blur fuerte (overlay sobre `body`, no se desmonta el contenido).
- Sembrar los usuarios de demo con `nif` y `lastName` (`Ana / García / 00000001A`, etc.) y mostrar una pista discreta bajo el formulario en dev.

## Archivos

Nuevos:
- `src/components/WeeklyScheduleEditor.tsx`
- `src/components/LoginOverlay.tsx`
- `src/components/DevModeToggle.tsx`

Editados:
- `src/lib/store.ts` (User, schedule, devMode, sesión, autoFillShifts)
- `src/routes/usuarios.tsx` (NIF, apellido, horario)
- `src/routes/configuracion.tsx` (mi horario + autorrelleno)
- `src/routes/index.tsx` y `src/components/ShiftsCalendar.tsx` (gating)
- `src/components/ShiftFormDialog.tsx` y `src/components/BulkShiftDialog.tsx` (gating + readonly)
- `src/components/AppHeader.tsx` (toggle dev + logout)
- `src/routes/__root.tsx` (montar `LoginOverlay`)

## Detalles técnicos

- Migración del store: bump `name` a `tempo-store-v2` con `migrate` que añade `nif`/`lastName`/`schedule` vacíos a usuarios existentes y `devMode: true`, `sessionUserId: null`.
- Validación login con zod (trim, case-insensitive en name/lastName, NIF exacto en mayúsculas).
- Autorrelleno respeta `config.workDays` solo como fallback si el usuario no tiene `schedule` definido para ese día.
- Toda la UI nueva usa tokens semánticos existentes; sin colores hardcoded.
