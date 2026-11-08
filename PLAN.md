# Plan del proyecto — Gestor de tareas

**Autor:** Marlon _(escribe aquí tu nombre completo)_ · **Entrega:** lunes 9 de noviembre de 2026

Este documento explica qué pide el ejercicio, cómo lo resuelve la aplicación y cómo comprobar que todo funciona.

---

## 1. El ejercicio

Construir una **aplicación web de gestión de tareas** con **HTML, CSS y JavaScript**, sin frameworks, usando **componentes web con Shadow DOM**. La aplicación debe guardar los datos en formato **JSON** e importar tareas desde una **API pública**.

---

## 2. Qué pide el ejercicio y cómo se cumple

| # | Requisito | Cómo lo ve el usuario |
|---|---|---|
| 1 | La lista de tareas es la vista inicial | Al abrir la aplicación aparece la lista, con el estado, la fecha de registro y el ID de cada tarea |
| 2 | Crear, actualizar y eliminar tareas | Botón **Nueva tarea**, lápiz para editar y papelera para eliminar (con confirmación) |
| 3 | Formulario en una ventana (modal) | El formulario solo aparece al crear o editar: título, fecha de registro y completado |
| 4 | Importar tareas desde una API | Botón **Importar**: abre el banco de tareas de jsonplaceholder |
| 5 | Importar una o varias tareas | Se marcan una por una o con **Seleccionar visibles**; las ya importadas aparecen deshabilitadas |
| 6 | Las tareas importadas solo se eliminan | No tienen lápiz y su círculo está deshabilitado; solo se pueden borrar |
| 7 | Marcar tareas como terminadas | Con el círculo de cada tarea, o varias a la vez con **Marcar terminadas** |
| 8 | Vaciar la lista | Botón **Vaciar lista**, con confirmación |
| 9 | Filtro por estado y buscador | Filtro Todas / Pendientes / Completadas con contadores y buscador por título o por ID |
| 10 | Estándar propio de identificadores | `TSK-L-000001` para tareas creadas y `TSK-A-000001` para importadas |
| 11 | Componentes web con Shadow DOM | Cada parte de la pantalla es un componente propio con su Shadow DOM |
| 12 | Guardar los datos en JSON | Las tareas se guardan en el navegador (`localStorage`) en formato JSON |
| 13 | Manejar errores de la API | Mensajes claros sin conexión, por tiempo agotado o por error del servidor, con botón **Reintentar** |
| 14 | Buena experiencia de usuario, accesibilidad y diseño responsivo | Confirmaciones, avisos, barra de progreso, uso con teclado, celular y modo oscuro |
| 15 | Wireframes | Cuatro bocetos en `docs/wireframes` |

---

## 3. Decisiones tomadas

El enunciado deja algunos puntos abiertos. Así se resolvieron:

1. **"Marcar terminadas"** completa las tareas pendientes **que el usuario está viendo** (según búsqueda y filtro). Así sirve para completar todas o solo algunas.
2. **Las tareas importadas no cambian de estado**, porque el enunciado dice que no se pueden actualizar.
3. **La fecha de las tareas importadas** es el día en que se importan, porque la API no trae fecha.
4. **Los IDs nunca se repiten**: el consecutivo no se reinicia aunque se vacíe la lista.

---

## 4. Cómo está organizada la aplicación

La aplicación se divide en dos partes que se comunican con eventos:

- **Interfaz (lo que ve el usuario):** lista, botones, buscador, formularios, confirmaciones y avisos.
- **Datos (lo que pasa por dentro):** validación de tareas, generación de IDs, guardado en el navegador y conexión con la API.

Cuando el usuario hace algo (por ejemplo, completar una tarea), la interfaz avisa con un evento. La parte de datos valida y guarda el cambio, y la pantalla se actualiza.

| Carpeta | Contenido |
|---|---|
| `index.html` | Página principal |
| `css/` | Colores, estilos generales y modo oscuro |
| `js/components/` | Partes de la pantalla (lista, tarea, barra de botones, ventanas, avisos) |
| `js/models/` | Qué datos tiene una tarea y cómo se validan |
| `js/store/` | Lugar central donde se crean, cambian y borran las tareas |
| `js/services/` | Guardado en el navegador y conexión con la API |
| `js/utils/` | Funciones de apoyo: IDs, búsqueda, filtros, eventos y formato de fechas |
| `docs/` | Este plan y los wireframes |

---

## 5. Etapas del trabajo

| Etapa | Qué se hizo |
|---|---|
| 1. Diseño | Wireframes de la lista, el formulario, la ventana de importar y la vista en celular |
| 2. Datos | Modelo de tarea, validaciones, IDs y guardado en el navegador |
| 3. Interfaz | Componentes web de la lista, la tarea, la barra de botones y las ventanas |
| 4. API | Importación desde jsonplaceholder con manejo de errores |
| 5. Pruebas | Lista de pruebas de la sección 6 en escritorio, celular y modo oscuro |
| 6. Documentación y entrega | Guía del usuario (README), este plan y repositorio en GitHub |

---

## 6. Pruebas para comprobar que todo funciona

| # | Prueba | Resultado esperado |
|---|---|---|
| 1 | Abrir la aplicación sin datos | Mensaje "Aún no tienes tareas" con botones para crear e importar |
| 2 | Guardar el formulario vacío | Aviso de error en el título |
| 3 | Escribir un título de 2 letras | Aviso de longitud mínima |
| 4 | Elegir una fecha futura | Aviso de fecha no válida |
| 5 | Crear una tarea válida | Aparece arriba con ID `TSK-L-…` y el aviso "Tarea creada" |
| 6 | Editar una tarea | El formulario se abre con sus datos y guarda los cambios |
| 7 | Marcar y desmarcar con el círculo | Cambian el estado, los contadores y la barra de progreso |
| 8 | Buscar "reunion" sin tilde | Encuentra "Reunión…" |
| 9 | Buscar por ID, por ejemplo `tsk-l-000001` | Encuentra esa tarea |
| 10 | Filtrar Pendientes y Completadas | Solo aparecen las de ese estado |
| 11 | Buscar algo que no existe | Mensaje "Sin resultados" con botón **Limpiar filtros** |
| 12 | Marcar terminadas | Pide confirmación e indica cuántas tareas cambiarán |
| 13 | Eliminar una tarea | Pide confirmación y la tarea desaparece |
| 14 | Vaciar la lista | Pide confirmación y la lista queda vacía; el siguiente ID no se repite |
| 15 | Recargar la página | Las tareas siguen ahí |
| 16 | Importar 3 tareas con internet | Aparecen con ID `TSK-A-…` |
| 17 | Volver a abrir Importar | Las ya importadas aparecen como "Ya importada" |
| 18 | Importar sin internet | Mensaje de error y botón **Reintentar** |
| 19 | Revisar una tarea importada | Sin lápiz y con el círculo deshabilitado; sí se puede eliminar |
| 20 | Usar solo el teclado | Todo funciona y siempre se ve dónde está el foco |
| 21 | Abrir en celular | Sin desplazamiento horizontal; las ventanas salen desde abajo |
| 22 | Activar el modo oscuro del sistema | Los colores cambian y se leen bien |

---

## 7. Entrega

1. Repositorio **privado** en GitHub llamado `ProyectoTareas_JavaScript_ApellidoNombre`.
2. Nombre completo y enlace del repositorio en el README.
3. Instructor agregado como colaborador (*Settings → Collaborators*).
4. Enlace del repositorio entregado al instructor.
