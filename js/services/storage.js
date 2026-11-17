/**
 * Persistencia en localStorage (estructura JSON).
 * Responsable: Marlon
 *
 * Clave: "tareas.v1"
 * Valor: {
 *   "version": 2,
 *   "nextSeq": 4,            // siguiente consecutivo de las tareas locales
 *   "nextCategorySeq": 3,    // siguiente consecutivo de las categorías
 *   "tasks": [ ...tareas ],
 *   "categories": [ ...categorías ]
 * }
 *
 * Los consecutivos no se reinician al vaciar la lista o borrar categorías,
 * así un id nunca se reutiliza.
 *
 * Los datos de la versión 1 (sin categorías) se siguen leyendo: se cargan
 * con la lista de categorías vacía y las tareas quedan "Sin categoría".
 */
// Funciones para revisar las tareas guardadas y leer el número de los IDs
import { isValidStoredTask } from '../models/task.js';
import { isValidStoredCategory } from '../models/category.js';
import { categorySequence, localSequence } from '../utils/id.js';

// Nombre con el que se guardan los datos en localStorage.
// Se mantiene la misma clave para no perder las tareas que ya estaban guardadas.
export const STORAGE_KEY = 'tareas.v1';
// Versión actual de la estructura guardada
const VERSION = 2;

// Estado inicial cuando no hay nada guardado
const emptyState = () => ({ version: VERSION, nextSeq: 1, nextCategorySeq: 1, tasks: [], categories: [] });

/** El siguiente consecutivo nunca puede ser menor que uno ya usado. */
function nextSequence(saved, items, sequenceOf) {
  const maxSeq = items.reduce((max, item) => Math.max(max, sequenceOf(item.id)), 0);
  const savedSeq = Number.isInteger(saved) ? saved : 1;
  return Math.max(savedSeq, maxSeq + 1);
}

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

    // Se queda solo con las categorías y las tareas que tienen sus datos correctos
    // (la versión 1 no tenía categorías: se arranca con la lista vacía)
    const categories = Array.isArray(data.categories) ? data.categories.filter(isValidStoredCategory) : [];
    const categoryIds = new Set(categories.map((category) => category.id));
    const tasks = data.tasks
      .filter(isValidStoredTask)
      // Si una tarea apunta a una categoría que ya no existe, queda "Sin categoría"
      .map((task) => ({ ...task, categoryId: categoryIds.has(task.categoryId) ? task.categoryId : null }));

    return {
      version: VERSION,
      nextSeq: nextSequence(data.nextSeq, tasks, localSequence),
      nextCategorySeq: nextSequence(data.nextCategorySeq, categories, categorySequence),
      tasks,
      categories,
    };
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
