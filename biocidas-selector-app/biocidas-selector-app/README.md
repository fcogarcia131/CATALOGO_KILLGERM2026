# Selector de Biocidas

App web en React para seleccionar biocidas a partir de una plaga y calcular la cantidad de producto según el volumen de caldo preparado.

## Funciones

- Clasificación por tipo de plaga.
- Filtrado por categoría: insecticidas, rodenticidas, desinfectantes y biocidas para madera.
- Selección de producto.
- Cálculo automático para productos diluibles en agua.
- Visualización de dosis original, plazo de seguridad, formulado, registro sanitario y método de aplicación.
- Aviso de verificación obligatoria con etiqueta/FDS.

## Instalación

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Datos

El archivo principal está en:

```txt
src/data/biocidas.json
```

La app espera que cada producto pueda contener:

```json
{
  "producto": "",
  "categoria": "",
  "plagas_diana_inferidas": [],
  "tipo_calculo": "dilucion_agua",
  "dosis_original": "",
  "dosis_normalizada": [
    {
      "entrada": "litros_preparado",
      "valor_min": 5,
      "valor_max": 10,
      "unidad": "ml/L"
    }
  ]
}
```

## Nota de seguridad

La app ayuda al cálculo, pero no sustituye la etiqueta, ficha de datos de seguridad ni autorización oficial del biocida.
