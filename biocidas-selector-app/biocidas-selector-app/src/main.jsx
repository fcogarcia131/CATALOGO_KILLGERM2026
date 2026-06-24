import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Search, FlaskConical, AlertTriangle, Bug, Droplets } from "lucide-react";
import "./styles.css";
import catalogo from "./data/biocidas.json";

const productos = catalogo.productos || [];

function normalizar(texto = "") {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function titleCase(texto) {
  return String(texto || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function getPlagas() {
  const set = new Set();
  productos.forEach((p) => {
    (p.plagas_diana_inferidas || []).forEach((plaga) => {
      if (plaga) set.add(plaga);
    });
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function getCategorias() {
  return Array.from(new Set(productos.map((p) => p.categoria).filter(Boolean))).sort();
}

function getOpcionesDilucion(producto) {
  return (producto.dosis_normalizada || []).filter(
    (d) => d.tipo_calculo === "dilucion_agua" && d.entrada === "litros_preparado"
  );
}

function calcularDilucion(opcion, litros) {
  const valorMin = Number(opcion.valor_min ?? opcion.valor ?? 0);
  const valorMax = Number(opcion.valor_max ?? opcion.valor_min ?? opcion.valor ?? 0);
  const unidad = opcion.unidad || "";

  if (!litros || litros <= 0 || !valorMin) return null;

  const min = litros * valorMin;
  const max = litros * valorMax;

  const unidadProducto = unidad.split("/")[0] || "unidad";

  if (Math.abs(min - max) < 0.0001) {
    return `${formatNumber(min)} ${unidadProducto}`;
  }

  return `${formatNumber(min)} - ${formatNumber(max)} ${unidadProducto}`;
}

function formatNumber(num) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2
  }).format(num);
}

function ProductoCard({ producto, selected, onClick }) {
  const opcionesDilucion = getOpcionesDilucion(producto);
  const esDiluible = opcionesDilucion.length > 0;

  return (
    <button className={`product-card ${selected ? "selected" : ""}`} onClick={onClick}>
      <div className="product-card-header">
        <strong>{producto.producto}</strong>
        {esDiluible && <span className="pill water">Diluible</span>}
      </div>

      <div className="meta">
        <span>{titleCase(producto.categoria)}</span>
        <span>{titleCase(producto.tipo_calculo)}</span>
      </div>

      <p>{producto.dosis_original || "Dosis no extraída"}</p>
    </button>
  );
}

function DetalleProducto({ producto }) {
  const [litros, setLitros] = useState(5);
  const [opcionIndex, setOpcionIndex] = useState(0);

  if (!producto) {
    return (
      <section className="detail empty">
        <Bug size={44} />
        <h2>Selecciona una plaga y un producto</h2>
        <p>La dosis y el cálculo aparecerán aquí.</p>
      </section>
    );
  }

  const opcionesDilucion = getOpcionesDilucion(producto);
  const opcion = opcionesDilucion[opcionIndex] || opcionesDilucion[0];
  const resultado = opcion ? calcularDilucion(opcion, Number(litros)) : null;

  return (
    <section className="detail">
      <div className="detail-title">
        <FlaskConical />
        <div>
          <h2>{producto.producto}</h2>
          <p>{titleCase(producto.categoria)} · {titleCase(producto.formulado)}</p>
        </div>
      </div>

      <div className="info-grid">
        <Info label="Dosis original" value={producto.dosis_original} />
        <Info label="Plazo de seguridad" value={producto.plazo_seguridad} />
        <Info label="Registro sanitario" value={producto.numero_registro_sanitario} />
        <Info label="Método de aplicación" value={producto.metodo_aplicacion} />
      </div>

      {opcionesDilucion.length > 0 ? (
        <div className="calculator">
          <h3><Droplets size={18} /> Cálculo por volumen de caldo</h3>

          {opcionesDilucion.length > 1 && (
            <label>
              Tipo de dosis
              <select value={opcionIndex} onChange={(e) => setOpcionIndex(Number(e.target.value))}>
                {opcionesDilucion.map((op, idx) => (
                  <option key={idx} value={idx}>
                    {op.dosis_base || `${op.valor_min}-${op.valor_max} ${op.unidad}`}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Volumen de caldo a preparar, en litros
            <input
              type="number"
              min="0"
              step="0.1"
              value={litros}
              onChange={(e) => setLitros(e.target.value)}
            />
          </label>

          <div className="result">
            <span>Cantidad de producto</span>
            <strong>{resultado || "Introduce un volumen válido"}</strong>
          </div>

          {opcion && (
            <p className="formula">
              Fórmula: litros preparados × {opcion.valor_min === opcion.valor_max
                ? `${opcion.valor_min} ${opcion.unidad}`
                : `${opcion.valor_min}-${opcion.valor_max} ${opcion.unidad}`}
            </p>
          )}
        </div>
      ) : (
        <div className="calculator muted">
          <h3>Cálculo automático no disponible por volumen de caldo</h3>
          <p>Este producto usa otro tipo de cálculo: {titleCase(producto.tipo_calculo)}.</p>
        </div>
      )}

      <div className="warning">
        <AlertTriangle size={18} />
        <span>Verificar siempre etiqueta, FDS y autorización antes del uso profesional.</span>
      </div>
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div className="info">
      <span>{label}</span>
      <strong>{value || "No disponible"}</strong>
    </div>
  );
}

function App() {
  const plagas = useMemo(() => getPlagas(), []);
  const categorias = useMemo(() => getCategorias(), []);

  const [plaga, setPlaga] = useState(plagas[0] || "");
  const [categoria, setCategoria] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);

  const filtrados = useMemo(() => {
    return productos.filter((p) => {
      const coincidePlaga = !plaga || (p.plagas_diana_inferidas || []).some(
        (x) => normalizar(x) === normalizar(plaga)
      );

      const coincideCategoria = categoria === "todas" || p.categoria === categoria;

      const coincideBusqueda =
        !busqueda ||
        normalizar(p.producto).includes(normalizar(busqueda)) ||
        normalizar(p.dosis_original).includes(normalizar(busqueda));

      return coincidePlaga && coincideCategoria && coincideBusqueda;
    });
  }, [plaga, categoria, busqueda]);

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">NC Plagas</p>
          <h1>Selector y calculadora de biocidas</h1>
          <p>
            Selecciona una plaga, elige un producto y calcula la cantidad necesaria
            según el volumen de caldo preparado.
          </p>
        </div>
      </header>

      <section className="layout">
        <aside className="sidebar">
          <div className="panel">
            <label>
              Plaga
              <select
                value={plaga}
                onChange={(e) => {
                  setPlaga(e.target.value);
                  setSeleccionado(null);
                }}
              >
                {plagas.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}
              </select>
            </label>

            <label>
              Categoría
              <select
                value={categoria}
                onChange={(e) => {
                  setCategoria(e.target.value);
                  setSeleccionado(null);
                }}
              >
                <option value="todas">Todas</option>
                {categorias.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
              </select>
            </label>

            <label>
              Buscar producto o dosis
              <div className="search-box">
                <Search size={16} />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Ej. K-Othrine, 50ml..."
                />
              </div>
            </label>
          </div>

          <div className="products-list">
            <div className="list-header">
              <strong>{filtrados.length} productos</strong>
            </div>

            {filtrados.map((p) => (
              <ProductoCard
                key={`${p.id}-${p.pagina_catalogo}-${p.producto}`}
                producto={p}
                selected={seleccionado?.id === p.id && seleccionado?.producto === p.producto}
                onClick={() => setSeleccionado(p)}
              />
            ))}

            {filtrados.length === 0 && (
              <div className="no-results">No hay productos para este filtro.</div>
            )}
          </div>
        </aside>

        <DetalleProducto producto={seleccionado} />
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
