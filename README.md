# Cuaderno LSA — Archivo personal y diccionario de Lengua de Señas Argentina

Aplicación web personal para registrar, organizar y estudiar las señas que
aprendés en tu curso de **Lengua de Señas Argentina (LSA)**. Funciona como un
“cuaderno digital”: agregás cada seña con su video/GIF, la clasíficas por clase
y categoría, y después podés buscarla y filtrarla.

Toda la información (incluidos los videos y GIF) se guarda **localmente en tu
navegador** con IndexedDB, así que persiste aunque cierres y vuelvas a abrir la
página. No hay servidor ni base de datos externa.

## Funciones

- **Inicio**: resumen del progreso (total de señas, clases registradas, última
  clase) y últimas señas agregadas, con acceso rápido para crear una nueva.
- **Clases**: señas agrupadas cronológicamente por clase, cada una con su
  número/nombre y fecha, en una cuadrícula responsive.
- **Diccionario**: todas las señas, con **búsqueda instantánea** por nombre y
  filtros combinados por categoría, clase y rango de fechas.
- **Agregar seña**: formulario simple para cargar nombre, categoría (o crear una
  nueva), clase, fecha, GIF/video, descripción, notas y fuente.
- **Detalle**: al hacer clic en una seña se abre una vista ampliada con el video
  grande y **controles**, más todos sus datos, y botones para **editar** y
  **eliminar**.
- **Medios**: las miniaturas reproducen el video en bucle, silenciado y sin
  controles; en el detalle se ve grande y con controles. También admite GIF.
- **Responsive**: la cantidad de columnas se adapta a la pantalla y pasa a una
  sola columna en el celular.
- **Datos de ejemplo**: la primera vez se cargan 6 señas de muestra (HOLA,
  GRACIAS, ADIÓS, CASA, MAMÁ, PAPÁ) con GIF de demostración.

## Cómo ejecutarlo localmente

No requiere instalar nada ni compilar. Tenés dos opciones:

**Opción A — abrir el archivo directamente**

1. Descomprimí el proyecto.
2. Hacé doble clic en `index.html` para abrirlo en tu navegador.

**Opción B — servidor local (recomendado)**

Un servidor local evita cualquier restricción del navegador y se comporta igual
que en producción:

```bash
# Con Python 3 (ya viene en la mayoría de las computadoras)
cd cuaderno-lsa
python3 -m http.server 8000
```

Luego abrí `http://localhost:8000` en el navegador.

```bash
# Alternativa con Node.js
npx serve .
```

## Cómo publicarlo online

Al ser un sitio estático (solo HTML, CSS y JS), podés subir la carpeta tal cual
a cualquier hosting estático gratuito:

- **GitHub Pages**: subí los archivos a un repositorio y activá Pages.
- **Netlify / Vercel / Cloudflare Pages**: arrastrá la carpeta o conectá el repo.

> Nota: los datos se guardan en el navegador de cada dispositivo. Si abrís la
> app publicada en otra computadora, empieza vacía (con los datos de ejemplo).

## Estructura del proyecto

Las responsabilidades están separadas con claridad:

```
cuaderno-lsa/
├─ index.html          # Estructura de la página y carga de scripts
├─ css/
│  └─ styles.css       # Estilos (interfaz tipo cuaderno de estudio)
└─ js/
   ├─ db.js            # Almacenamiento: capa IndexedDB (señas + medios)
   ├─ store.js         # Lógica de datos: estado, CRUD, búsqueda, filtros
   ├─ seed.js          # Datos de ejemplo (solo la primera vez)
   ├─ seed-media.js    # GIF de muestra (generados automáticamente)
   ├─ render.js        # Componentes de interfaz (tarjetas, medios)
   ├─ views.js         # Vistas completas (Inicio, Clases, Diccionario…)
   └─ app.js           # Control: enrutado, eventos y ciclo de vida
```

- **Interfaz**: `render.js` + `views.js` + `styles.css`
- **Lógica**: `store.js` + `app.js`
- **Almacenamiento de datos**: `db.js` (IndexedDB)

## Modelo de datos

Cada seña tiene un identificador único y esta forma:

```js
{
  id,          // identificador único
  nombre,      // "HOLA"
  categoria,   // "Saludos"
  clase,       // "Clase 1"
  fecha,       // "2026-09-05" (ISO)
  media,       // { type, name, blob }  → GIF o video
  descripcion, // cómo se realiza la seña
  notas,       // notas personales
  fuente,      // enlace al video original (opcional)
  createdAt, updatedAt
}
```

## Copia de seguridad y uso en varios dispositivos

Los datos viven en el navegador de cada dispositivo (IndexedDB), por lo que **no
se sincronizan solos** entre computadoras o celulares. Para llevar tus señas de
un dispositivo a otro usá la copia de seguridad, en la pantalla **Inicio**:

1. En el dispositivo con tus datos: **Inicio → Exportar copia**. Se descarga un
   archivo `lsa-copia-AAAA-MM-DD...json` que contiene todas las señas, sus
   videos/GIF y las categorías.
2. Pasá ese archivo al otro dispositivo (mail, nube, USB, etc.).
3. En el otro dispositivo, abrí la app y hacé **Inicio → Importar copia**, elegí
   el archivo. Tus señas aparecen al instante.

La importación combina por identificador: si volvés a importar el mismo archivo
no se generan duplicados. Conviené exportar una copia cada tanto como respaldo.

## Diccionario publicado en el sitio (carga permanente)

Además de los datos locales de cada navegador, el sitio publica un
**diccionario permanente** que se carga automáticamente al abrir la página:

- `data/diccionario.json` — las señas con sus textos (liviano, ~127 KB).
- `media/` — cada GIF/PNG/video como archivo suelto (se cargan con lazy loading).

Al iniciar, `js/remote.js` descarga `data/diccionario.json` y lo importa la
primera vez o cuando la copia publicada cambia (control por `exportedAt`).
Así cualquier visitante ve el diccionario completo sin importar nada, y las
señas locales que agregues conviven con las publicadas.

### Cómo actualizar el diccionario publicado

1. En la app, **Inicio → Exportar copia** (archivo `lsa-copia-*.json`).
2. En la raíz del repositorio, ejecutá:

   ```
   node scripts/build-remote.js "ruta/al/lsa-copia-XXXX.json"
   ```

   Eso regenera `data/diccionario.json` y agrega a `media/` solo los medios
   nuevos (los existentes se reutilizan).
3. Commiteá y pusheá: GitHub Pages se redpliega solo en unos minutos.

> Nota: la copia exportada pesa cientos de MB porque embebe los medios en
> base64. Nunca la subas al repositorio (GitHub rechaza archivos de más de
> 100 MB); usala solo como entrada del script.

> ¿Querés sincronización automática en la nube? Eso requiere agregar un servicio
> externo (por ejemplo Firebase o Supabase) con inicio de sesión; es un proyecto
> mayor. La copia de seguridad cubre el caso de uso personal sin costo ni cuentas.

## Consejos de uso

- Para agregar una seña: **Agregar seña → completás el formulario → subís el
  GIF/video → Guardar**. La seña aparece automáticamente en su clase y en el
  diccionario. No hace falta tocar el código.
- Los videos cortos (`.mp4`, `.webm`) son ideales para las miniaturas en bucle.
- Para reiniciar la app a cero, borrá los datos del sitio desde el navegador
  (Configuración → Datos de sitios) y volverán a cargarse los ejemplos.
