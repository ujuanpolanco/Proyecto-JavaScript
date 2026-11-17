/**
 * Modelo de categoría y validaciones.
 *
 * Estructura (JSON) de una categoría:
 * {
 *   "id": "CAT-000001",
 *   "name": "Universidad"
 * }
 *
 * Una tarea guarda el id de su categoría en "categoryId" (o null si no tiene).
 */
import { normalize } from '../utils/filter.js';

// Largo mínimo y máximo del nombre de una categoría
export const CATEGORY_NAME_MIN = 2;
export const CATEGORY_NAME_MAX = 30;

/**
 * Valida el nombre de una categoría.
 * existingNames: nombres de las OTRAS categorías, para no repetir
 * ("Hogar" y "hogar" cuentan como el mismo nombre).
 * Devuelve { valid, errors }, donde errors puede tener un mensaje para name.
 */
export function validateCategoryInput({ name } = {}, existingNames = []) {
  const errors = {};
  const cleanName = String(name ?? '').trim();

  if (!cleanName) {
    errors.name = 'Escribe el nombre de la categoría.';
  } else if (cleanName.length < CATEGORY_NAME_MIN) {
    errors.name = `El nombre debe tener al menos ${CATEGORY_NAME_MIN} caracteres.`;
  } else if (cleanName.length > CATEGORY_NAME_MAX) {
    errors.name = `El nombre no puede superar ${CATEGORY_NAME_MAX} caracteres.`;
  } else if (existingNames.some((other) => normalize(other) === normalize(cleanName))) {
    errors.name = 'Ya existe una categoría con ese nombre.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// Crea el objeto de una categoría
export function createCategory({ id, name }) {
  return { id, name: String(name).trim() };
}

/** Comprueba que un objeto leído de localStorage tenga la forma de una categoría. */
export function isValidStoredCategory(category) {
  return Boolean(category && typeof category.id === 'string' && typeof category.name === 'string');
}
