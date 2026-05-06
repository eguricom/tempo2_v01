## Objetivo

Ampliar la app de fichajes para mostrar franjas en las tablas, basar los lotes en el horario semanal del usuario (con viernes corto), añadir un cuadre mágico iterativo, vistas por semana/mes/año, reajuste de totales, etiquetado y color para festivos/vacaciones, avatar de usuario, modo desarrollador desactivado por defecto con reglas, y cumplimiento de los requisitos de inspección laboral / RGPD.

---

## 1. Tablas de jornadas: mostrar franjas

- En `src/routes/jornadas.tsx` (vista lista) añadir una columna o subfila "Franjas" que renderiza chips con cada `ShiftSegment`:
  - Trabajo: chip color `primary`.
  - Descanso: chip color `muted` con icono pausa.
  - Formato `HH:MM–HH:MM` y duración entre paréntesis.
- Reutilizar el mismo componente de chips en `ShiftsCalendar.tsx` para el popover/celda.

## 2. Lote basado en horario del usuario

- `BulkShiftDialog.tsx`:
  - Nuevo modo "Usar horario del usuario" (toggle, activado por defecto).
  - Cuando está activo, las franjas no se editan en el diálogo: para cada día seleccionado se toman las franjas de `user.weeklySchedule[dayOfWeek]` (ya existe en `store.ts`). Esto resuelve automáticamente el viernes corto.
  - Si un día no tiene horario definido, se omite y se reporta en el toast.
  - El editor manual de franjas sigue disponible si se desactiva el toggle.
- Mantener jitter aleatorio y filtro de festivos/vacaciones/días libres.

## 3. Cuadre mágico iterativo en el listado

- En `src/routes/jornadas.tsx`, junto al "Total horas" del grupo semana, añadir botón "🎲 Cuadre mágico" (solo visible en modo dev).
- Cada click llama a `magicBalanceWeek` con un parámetro nuevo `randomness` (slider 0–30 min) que introduce aleatoriedad por segmento al ajustar; así clicks sucesivos producen variaciones distintas centradas en 37.5h + jitter.
- Refactorizar `src/lib/balance.ts`:
  - `magicBalanceWeek(user, shifts, opts: { targetMin?, jitterMin? })`.
  - El total objetivo = `targetMin + random(0, jitterMin)`.
  - Repartir delta proporcionalmente con micro-jitter ±jitterMin/n por franja.
- Slider de aleatoriedad junto al botón (persistente en estado local).

## 4. Vistas Semana / Mes / Año (en lugar de "agrupar por")

Sustituir agrupación actual por **vistas** (tabs) en jornadas:

- **Semana** (nueva): rejilla con columnas Lun..Dom, una fila por semana.
  - Cada celda muestra las franjas del día (chips compactos).
  - A la derecha: total semana + botón "🎲 cuadre mágico" + slider aleatoriedad (solo dev).
  - Click repetido sobre el botón regenera franjas y refresca la fila.
  - Festivos/vacaciones: la celda aparece pintada con su color y etiqueta.
- **Mes**: heatmap/calendario mensual con totales diarios (reutiliza `ShiftsCalendar`).
- **Año**: matriz 12×31 con código de color por horas trabajadas.

Componentes nuevos:
- `src/components/JornadasWeekView.tsx`
- `src/components/JornadasMonthView.tsx`
- `src/components/JornadasYearView.tsx`

## 5. Editar el total semanal/mensual/anual

- En cada vista, el "Total" es editable (input HH:MM).
- Al confirmar, se llama a `rebalanceShifts(shifts, newTotalMin, jitterMin)` en `balance.ts`:
  - Distribuye proporcionalmente la diferencia entre todos los segmentos `work` del periodo.
  - Mantiene proporcionalidad relativa entre días (viernes seguirá siendo más corto).
  - Aplica jitter para no quedar en valores redondos.
- Solo disponible en modo dev.

## 6. Festivos y vacaciones: colores y etiquetas

- Ampliar `Holiday` en `store.ts` con:
  - `scope: "national" | "regional" | "local" | "company"`.
  - `color?: string` (hex/oklch elegido por el usuario).
  - `label?: string` (texto libre).
- Ampliar `Vacation` con `kind: "vacation" | "sick" | "personal" | "other"` y `color?`.
- En `src/routes/vacaciones.tsx`:
  - Selector de color (input color nativo) y de etiqueta/scope al crear/editar.
- En las vistas de jornadas y `ShiftsCalendar.tsx` aplicar `style={{ backgroundColor: color }}` y mostrar badge con la etiqueta.

## 7. Avatar de usuario (subir JPG)

- En `src/routes/usuarios.tsx`, en la ficha:
  - `<input type="file" accept="image/jpeg,image/png">`.
  - Convertir a base64 (≤ 1MB, comprobar tamaño) y guardar en `user.avatar` (campo nuevo en `store.ts`).
  - Vista previa con `<Avatar>`.
- Mostrar el avatar en la cabecera, sidebar y selectores de usuario.

## 8. Modo desarrollador (cambios de reglas)

- Por defecto **desactivado** (`devMode: false` inicial en `store.ts`).
- Sin modo dev:
  - **No** se puede abrir `BulkShiftDialog`.
  - **No** aparece el botón "Cuadre mágico" ni la edición de totales.
  - **Sí** se puede añadir/editar manualmente jornadas siempre que la fecha esté entre `hoy - 7 días` y `hoy` (regla "una semana de retraso").
  - Para fechas fuera de ese rango, los botones de edición/añadir aparecen deshabilitados con tooltip explicativo.
- Helper nuevo `canEditShiftDate(date, devMode)` en `store.ts`, usado en `ShiftFormDialog`, lista, calendario y bulk-edit.

## 9. Cumplimiento inspección laboral / RGPD

Cambios concretos para tachar la checklist:

- **Registro diario íntegro**: ya se guarda `start`, `end`, `segments`. Añadir migración local que valide presencia obligatoria de `start` y `end` por día trabajado.
- **Retención 4 años**: añadir aviso en Configuración + función `purgeOlderThan(years=4)` que el admin debe lanzar manualmente; nunca purgar automáticamente.
- **Auditoría / trazabilidad**:
  - Nueva colección `auditLog` en `store.ts`: `{ id, ts, userId, actorId, action, before, after }`.
  - Cada `addShift`, `updateShift`, `deleteShift`, cambios de horario, festivos, vacaciones, modo dev → emiten un registro.
  - Página `src/routes/auditoria.tsx` (solo admins) con filtros por usuario/fecha y exportación CSV.
- **Acceso del trabajador a sus datos**:
  - Vista "Mis registros" para el usuario logueado (solo lectura) con botón "Solicitar corrección" que añade nota al admin (entrada en audit log con acción `correction_request`).
- **Transparencia**:
  - Texto informativo RGPD en login y en Configuración: qué se registra, finalidad, base legal, retención, derechos ARCO.
  - Checkbox de consentimiento informado al crear usuario.
- **Identificación inequívoca**: cada fichaje guarda `userId` y `actorId` (quién lo creó, útil para fichajes manuales por admin).
- **Teletrabajo / personal móvil**: añadir campo `workMode: "presencial" | "teletrabajo" | "movil"` por jornada (selector en form), visible en exports PDF/Excel.
- **Pausas claras**: el editor de segmentos ya distingue trabajo/descanso; añadir leyenda "tiempo de trabajo efectivo = suma de franjas tipo trabajo" en la UI y en los exports.
- **Horas extra / nocturnidad**: derivar y mostrar columnas extra en lista y export:
  - Horas extra = max(0, trabajadas - jornada teórica del día según `weeklySchedule`).
  - Nocturnas = minutos trabajados entre 22:00–06:00.
- **Modificaciones controladas**: junto a cada jornada editada mostrar icono "histórico" que abre un drawer con el log de cambios (lectura desde `auditLog`).
- **Acceso restringido**: confirmar que las rutas de admin (usuarios, vacaciones, auditoría, configuración global) solo son accesibles si el usuario tiene `role === "admin"`. Las demás vistas filtran por `currentUserId`.

## 10. Detalles técnicos / archivos afectados

- `src/lib/store.ts`: nuevos campos (`avatar`, `workMode`, `auditLog`, `Holiday.scope/color/label`, `Vacation.kind/color`), helpers `canEditShiftDate`, `logAudit`.
- `src/lib/balance.ts`: `rebalanceShifts`, `magicBalanceWeek` con `jitterMin`.
- `src/components/BulkShiftDialog.tsx`: modo "usar horario del usuario".
- `src/components/ShiftFormDialog.tsx`: gating por `canEditShiftDate`, campo `workMode`, actor en audit.
- `src/components/ShiftsCalendar.tsx`: colores/etiquetas de festivos/vacaciones.
- `src/components/SegmentChips.tsx` (nuevo): chips reutilizables.
- `src/routes/jornadas.tsx`: tabs Semana/Mes/Año, botón cuadre mágico iterativo, total editable, columna franjas, columnas horas extra/nocturnas.
- `src/routes/usuarios.tsx`: avatar, consentimiento RGPD.
- `src/routes/vacaciones.tsx`: color + etiqueta + scope.
- `src/routes/auditoria.tsx` (nuevo).
- `src/routes/mis-registros.tsx` (nuevo) o reutilizar jornadas filtrando por usuario.
- `src/lib/export.ts`: añadir columnas extra/nocturnas/workMode + leyenda.

## 11. Orden de implementación sugerido

1. Modelo y helpers (`store.ts`, `balance.ts`, `canEditShiftDate`, audit log).
2. Avatar + consentimiento en usuarios.
3. Modo dev por defecto OFF + reglas de gating.
4. Chips de franjas + columna en lista + colores festivos/vacaciones.
5. Lotes basados en horario del usuario.
6. Vistas Semana/Mes/Año con cuadre mágico iterativo y totales editables.
7. Audit log + página auditoría + vista "mis registros".
8. Cálculo horas extra/nocturnas + export ampliado.

---

¿Confirmas que avancemos con todo este alcance, o prefieres acotar a un subconjunto (por ejemplo, primero los bloques 1–6 y dejar auditoría/RGPD y vistas año/mes para después)?