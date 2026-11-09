/**
 * Persistencia en localStorage (estructura JSON).
 * Responsable: Marlon
 *
 * Clave: "tareas.v1"
 * Valor: { "version": 1, "nextSeq": 4, "tasks": [ ...tareas ] }
 *
 * nextSeq es el siguiente consecutivo para las tareas locales. No se reinicia
 * al vaciar la lista, así un id nunca se reutiliza.
 */
// Funciones para revisar las tareas guardadas y leer el número de los IDs
import { isValidStoredTask } from '../models/task.js';
import { localSequence } from '../utils/id.js';

// Nombre con el que se guardan los datos en localStorage
export const STORAGE_KEY = 'tareas.v1';

// Estado inicial cuando no hay nada guardado
const emptyState = () => ({ version: 1, nextSeq: 1, tasks: [] });

export function loadState() {
  try {
    // Lee el texto guardado en el navegador
    const raw = localStorage.getItem(STORAGE_KEY);
    // Si no hay nada guardado, empieza vacío
    if (!raw) return emptyState();

    // Convierte el texto JSON en un objeto de JavaScript
    const data = JSON.parse(raw);
    // Si los datos no tienen la forma esperada, empieza vacío
    if (!data || !Array.isArray(data.tasks)) return emptyState();

    // Se queda solo con las tareas que tienen todos sus datos correctos
    const tasks = data.tasks.filter(isValidStoredTask);
    // Busca el número de ID local más alto que ya existe
    const maxSeq = tasks.reduce((max, t) => Math.max(max, localSequence(t.id)), 0);
    // Toma el consecutivo guardado (o 1 si no es válido)
    const savedSeq = Number.isInteger(data.nextSeq) ? data.nextSeq : 1;

    // El siguiente número nunca puede ser menor que uno ya usado
    return { version: 1, nextSeq: Math.max(savedSeq, maxSeq + 1), tasks };
  } catch (error) {
    // Datos dañados o almacenamiento bloqueado: se arranca con la lista vacía.
    console.warn('[storage] No se pudieron leer las tareas guardadas:', error);
    return emptyState();
  }
}

/** Guarda el estado. Devuelve true si se guardó y false si falló (almacenamiento lleno o bloqueado). */
export function saveState(state) {
  try {
    // Convierte el estado en texto JSON y lo guarda
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error('[storage] No se pudieron guardar las tareas:', error);
    return false;
  }
}
