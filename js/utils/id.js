/**
 * Estándar de identificadores del proyecto.
 * Responsable: Marlon
 *
 *   TSK-L-000001  → tarea creada por el usuario (L = local), consecutivo.
 *   TSK-A-000123  → tarea importada de la API (A = API), usa el id original.
 *
 * Usar el id original en las importadas evita importar dos veces la misma tarea.
 */
// Cantidad de dígitos del número del ID (000001)
const PAD = 6;

// Prefijos: L = creada por el usuario, A = importada de la API
export const ID_PREFIX = Object.freeze({
  LOCAL: 'TSK-L-',
  API: 'TSK-A-',
});

// Arma un ID local. Ejemplo: localId(3) da 'TSK-L-000003'
export function localId(sequence) {
  return ID_PREFIX.LOCAL + String(sequence).padStart(PAD, '0');
}

// Arma un ID importado. Ejemplo: apiId(12) da 'TSK-A-000012'
export function apiId(externalId) {
  return ID_PREFIX.API + String(externalId).padStart(PAD, '0');
}

/** Devuelve el número consecutivo de un id local, o 0 si no lo es. */
export function localSequence(id) {
  // Si no es un ID local, devuelve 0
  if (typeof id !== 'string' || !id.startsWith(ID_PREFIX.LOCAL)) return 0;
  // Quita el prefijo y convierte el resto en número
  const n = Number.parseInt(id.slice(ID_PREFIX.LOCAL.length), 10);
  return Number.isFinite(n) ? n : 0;
}
