# Selector de Biocidas NC Plagas

App React/Vite para clasificar biocidas por plaga y calcular dosis de uso, incluyendo productos diluibles en agua según volumen de caldo preparado.

## Ejecutar en local

```bash
npm install
npm run dev
```

## Compilar

```bash
npm run build
```

## Despliegue correcto en GitHub Pages

Esta versión incluye:

- `vite.config.mjs` con `base: './'` para evitar errores de rutas en GitHub Pages.
- `.github/workflows/deploy.yml` para compilar y publicar automáticamente la carpeta `dist`.

Pasos:

1. Sube todo el contenido de esta carpeta al repositorio.
2. En GitHub entra en **Settings → Pages**.
3. En **Source**, selecciona **GitHub Actions**.
4. Haz commit/push a la rama `main`.
5. Espera a que termine la acción **Deploy to GitHub Pages**.
6. Abre la URL generada por GitHub Pages.

No publiques directamente el código fuente con Pages desde `/root`, porque Vite necesita compilar la app y generar la carpeta `dist`.

## Datos

El JSON está incluido en:

```txt
src/data/biocidas.json
```

## Aviso

La app es una herramienta de apoyo al cálculo. El uso profesional debe verificarse siempre con etiqueta, FDS y autorización vigente del producto.
