/**
 * Modelo de tarea y validaciones.
 * Responsable: Marlon
 *
 * Estructura (JSON) de una tarea:
 * {
 *   "id": "TSK-L-000001",
 *   "title": "Preparar la presentación",
 *   "description": "Llevar el portátil",  // opcional; solo se escribe al crear la tarea
 *   "createdAt": "2026-11-04",      // fecha de registro (YYYY-MM-DD)
 *   "completed": false,
 *   "source": "local",              // "local" | "api"
 *   "externalId": 12                // solo en tareas importadas
 * }
 */
// apiId arma el ID de las tareas importadas (TSK-A-...)
import { apiId } from '../utils/id.js';

// Origen de la tarea: 'local' (creada por el usuario) o 'api' (importada)
export const SOURCE = Object.freeze({ LOCAL: 'local', API: 'api' });
// Largo mínimo y máximo del título
export const TITLE_MIN = 3;
export const TITLE_MAX = 120;
// Largo máximo de la descripción (es opcional)
export const DESCRIPTION_MAX = 300;

/**
 * Fecha de hoy en formato YYYY-MM-DD, según la hora de Colombia (o la del usuario).
 * toISOString() siempre usa la hora UTC: en Colombia (UTC-5), después de las 7 pm
 * ya daría la fecha de mañana. Por eso primero se resta la diferencia horaria
 * (getTimezoneOffset devuelve esa diferencia en minutos).
 */
export function todayISO() {
  // Fecha y hora de este momento
  const now = new Date();
  // Se ajusta a la hora local (60000 = milisegundos que tiene un minuto)
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  // slice(0, 10) se queda con 'AAAA-MM-DD' y quita la hora
  return local.toISOString().slice(0, 10);
}

/**
 * Comprueba que la fecha exista de verdad. new Date(2026, 1, 31) no falla:
 * se "pasa" al 3 de marzo. Si al construirla el día o el mes cambian,
 * la fecha no era válida.
 */
function isValidDate(value) {
  // Primero revisa el formato AAAA-MM-DD con una expresión regular
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  // Separa año, mes y día, y los convierte en números
  const [y, m, d] = value.split('-').map(Number);
  // Los meses en Date van de 0 a 11, por eso se usa m - 1
  const date = new Date(y, m - 1, d);
  // Si JavaScript cambió el día o el mes, la fecha no existía (ej.: 31 de febrero)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/**
 * Valida los datos de un formulario de tarea.
 * Devuelve { valid, errors }, donde errors puede tener un mensaje para title y createdAt.
 */
export function validateTaskInput({ title, createdAt, description } = {}) {
  // Aquí se guardan los mensajes de error de cada campo
  const errors = {};
  // Título sin espacios al inicio ni al final
  const cleanTitle = String(title ?? '').trim();

  // Validaciones del título: obligatorio, mínimo y máximo de caracteres
  if (!cleanTitle) {
    errors.title = 'Escribe el título de la tarea.';
  } else if (cleanTitle.length < TITLE_MIN) {
    errors.title = `El título debe tener al menos ${TITLE_MIN} caracteres.`;
  } else if (cleanTitle.length > TITLE_MAX) {
    errors.title = `El título no puede superar ${TITLE_MAX} caracteres.`;
  }

  // Validación de la descripción: es opcional, pero no puede pasar del máximo
  if (String(description ?? '').trim().length > DESCRIPTION_MAX) {
    errors.description = `La descripción no puede superar ${DESCRIPTION_MAX} caracteres.`;
  }

  // Validaciones de la fecha: obligatoria, que exista y que no sea futura
  if (!createdAt) {
    errors.createdAt = 'Selecciona la fecha de registro.';
  } else if (!isValidDate(createdAt)) {
    errors.createdAt = 'La fecha no es válida.';
  } else if (createdAt > todayISO()) {
    errors.createdAt = 'La fecha de registro no puede estar en el futuro.';
  }

  // Es válido si no quedó ningún error guardado
  return { valid: Object.keys(errors).length === 0, errors };
}

// Crea el objeto de una tarea hecha por el usuario
export function createLocalTask({ id, title, description, createdAt, completed }) {
  return {
    id,
    title: String(title).trim(),
    // Descripción opcional (texto vacío si no se escribió)
    description: String(description ?? '').trim(),
    // Si no viene fecha, se usa la de hoy
    createdAt: createdAt || todayISO(),
    // Boolean() asegura que el valor sea true o false
    completed: Boolean(completed),
    source: SOURCE.LOCAL,
  };
}

/** Convierte una tarea de jsonplaceholder al formato propio. */
export function createApiTask(todo) {
  return {
    id: apiId(todo.id),
    title: String(todo.title).trim(),
    createdAt: todayISO(),
    completed: Boolean(todo.completed),
    source: SOURCE.API,
    externalId: todo.id,
  };
}

// Las tareas importadas son de solo lectura: no se editan ni cambian de estado
export function isReadOnly(task) {
  return task.source === SOURCE.API;
}

/** Comprueba que un objeto leído de localStorage tenga la forma de una tarea. */
export function isValidStoredTask(task) {
  return Boolean(
    task &&
      typeof task.id === 'string' &&
      typeof task.title === 'string' &&
      // La descripción es opcional (las tareas viejas e importadas no la tienen)
      (task.description === undefined || typeof task.description === 'string') &&
      typeof task.createdAt === 'string' &&
      typeof task.completed === 'boolean' &&
      (task.source === SOURCE.LOCAL || task.source === SOURCE.API)
  );
}
