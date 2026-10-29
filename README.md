# Cursenda

Portal de cursos subvencionados. Los alumnos buscan cursos y piden plaza, y las academias
gestionan sus cursos y solicitudes desde su panel.

Está en [gbarnicoat.uk](https://gbarnicoat.uk).

## Qué tiene

- **Alumnos:** buscador de cursos, ficha de cada curso y formulario para pedir plaza.
- **Centros:** panel con sus cursos, solicitudes, notas de contacto, estadísticas, plan y facturas.
- **Admin:** gestión de todas las academias, cursos y solicitudes.

## Cómo está hecho

- Web: React + Vite
- Servidor: Node con Express
- Base de datos: SQLite

## Para trabajar en local

```bash
npm install
npm run dev:server   # servidor en http://localhost:3000
npm run dev          # web en http://localhost:5173
```

En local se crea una base de datos de prueba (`cursenda.db`) que no se sube al repo.

## Subirlo al servidor

Todo lo del servidor está en [`deploy/`](deploy/README.md).
