/**
 * Consumo de la API pública del banco de tareas.
 * Responsable: Marlon
 *
 * Endpoint: https://jsonplaceholder.typicode.com/todos
 * Errores que se manejan: sin conexión, tiempo agotado, error HTTP (404, 500...),
 * respuesta que no es JSON o que no es una lista, y fallo de red.
 */
// Dirección de la API pública de donde se importan las tareas
export const API_URL = 'https://jsonplaceholder.typicode.com/todos';
const TIEMPO_LIMITE = 8000; // 8 segundos

// Error propio para distinguir los errores de la API de cualquier otro error.
export class ApiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ApiError';
  }
}

// Promesa que se rechaza cuando pasa el tiempo límite.
function esperarTiempoLimite(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new ApiError('La API tardó demasiado en responder. Intenta de nuevo.'));
    }, ms);
  });
}

/**
 * Descarga las tareas del banco y devuelve un array con
 * objetos { id, title, completed, userId }.
 */
export async function fetchTodos() {
  // Antes de pedir los datos, revisa si hay internet
  if (!navigator.onLine) {
    throw new ApiError('No hay conexión a internet. Revisa tu red e intenta de nuevo.');
  }

  // Aquí se guardará la respuesta del servidor
  let response;
  try {
    // Promise.race: gana la primera promesa que termine (la petición o el tiempo límite).
    response = await Promise.race([fetch(API_URL), esperarTiempoLimite(TIEMPO_LIMITE)]);
  } catch (error) {
    if (error instanceof ApiError) throw error; // fue el tiempo límite
    throw new ApiError('No se pudo conectar con el banco de tareas. Revisa tu conexión.');
  }

  // fetch no falla con un 404 o un 500: hay que revisar response.ok.
  if (!response.ok) {
    throw new ApiError(`El servidor respondió con un error (${response.status}). Intenta más tarde.`);
  }

  // Convierte la respuesta en datos de JavaScript
  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new ApiError('La respuesta de la API no es un JSON válido.');
  }

  // La API debe devolver una lista (array) de tareas
  if (!Array.isArray(data)) {
    throw new ApiError('La respuesta de la API no tiene el formato esperado.');
  }

  // Solo se aceptan tareas con id numérico y título de texto.
  return data
    .filter((todo) => todo && typeof todo.id === 'number' && typeof todo.title === 'string')
    // Deja solo los datos que usa la app: id, título, estado y usuario
    .map((todo) => ({
      id: todo.id,
      title: todo.title.trim(),
      completed: Boolean(todo.completed),
      userId: todo.userId,
    }));
}
