import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle, Bug, Calculator, Droplets, Filter, FlaskConical, Search, ShieldCheck } from "lucide-react";
import "./styles.css";
import catalogo from "./data/biocidas.json";

const productos = catalogo.productos || [];

const CAMPOS = {
  litros_preparado: { label: "Litros de caldo a preparar", unidad: "L", defecto: 5 },
  superficie_m2: { label: "Superficie a tratar", unidad: "m²", defecto: 100 },
  volumen_m3: { label: "Volumen del recinto", unidad: "m³", defecto: 100 },
  metros_lineales: { label: "Metros lineales", unidad: "m", defecto: 50 },
  hectareas: { label: "Superficie", unidad: "ha", defecto: 1 },
  litros_agua_a_tratar: { label: "Litros de agua a tratar", unidad: "L", defecto: 1000 },
  tiempo_aplicacion_segundos: { label: "Tiempo de aplicación", unidad: "s", defecto: 10 }
};

const PRIORIDAD_CALCULO = [
  "dilucion_agua",
  "superficie",
  "tratamiento_agua",
  "volumen_m3",
  "cobertura_superficie",
  "estaciones_cebo",
  "inyeccion",
  "superficie_hectarea",
  "lineal_m",
  "aplicacion_directa_tiempo"
];

function normalizar(texto = "") {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function titleCase(texto = "") {
  return String(texto)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\p{L}/gu, (l) => l.toUpperCase());
}

function uniq(array) {
  return Array.from(new Set(array.filter(Boolean)));
}

function formatoNumero(valor, decimales = 2) {
  if (!Number.isFinite(valor)) return "-";
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: decimales }).format(valor);
}

function unidadProducto(unidad = "") {
  if (unidad.includes("/")) return unidad.split("/")[0];
  if (unidad.includes("m2/unidad") || unidad.includes("m3/unidad") || unidad.includes("m_lineales/unidad")) return "unidad(es)";
  return unidad || "unidad(es)";
}

function getPlagas() {
  return uniq(productos.flatMap((p) => p.plagas_diana_inferidas || [])).sort((a, b) => a.localeCompare(b));
}

function getCategorias() {
  return uniq(productos.map((p) => p.categoria)).sort((a, b) => a.localeCompare(b));
}

function getEntornos() {
  const entornos = uniq(productos.flatMap((p) => p.entornos_uso_inferidos || []));
  return entornos.length ? entornos.sort((a, b) => a.localeCompare(b)) : ["general"];
}

function getCalculos(producto) {
  const calculos = producto?.dosis_normalizada || [];
  return [...calculos].sort((a, b) => {
    const ia = PRIORIDAD_CALCULO.indexOf(a.tipo_calculo);
    const ib = PRIORIDAD_CALCULO.indexOf(b.tipo_calculo);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

function descripcionCalculo(calc, index) {
  const contexto = calc.contexto ? `${calc.contexto} · ` : "";
  const base = calc.dosis_base ? `${calc.dosis_base}` : calc.unidad ? `${calc.valor_min ?? calc.valor ?? calc.cobertura ?? ""} ${calc.unidad}` : "dosis";
  return `${index + 1}. ${contexto}${titleCase(calc.tipo_calculo)} · ${base}`;
}

function campoEntrada(calc) {
  return calc?.entrada || "litros_preparado";
}

function valorDefectoPara(calc) {
  const campo = campoEntrada(calc);
  return CAMPOS[campo]?.defecto ?? 1;
}

function calcular(calc, valorEntrada) {
  const v = Number(valorEntrada);
  if (!calc || !Number.isFinite(v) || v <= 0) return null;

  const tipo = calc.tipo_calculo;

  if (["dilucion_agua", "superficie", "superficie_hectarea", "tratamiento_agua"].includes(tipo)) {
    const minRate = Number(calc.valor_min ?? calc.valor ?? 0);
    const maxRate = Number(calc.valor_max ?? calc.valor_min ?? calc.valor ?? minRate);
    if (!minRate && !maxRate) return null;
    const min = v * minRate;
    const max = v * maxRate;
    const unidad = unidadProducto(calc.unidad);
    return {
      titulo: "Cantidad de producto",
      principal: rangoTexto(min, max, unidad),
      detalle: `Cálculo: ${formatoNumero(v)} ${CAMPOS[campoEntrada(calc)]?.unidad || ""} × ${rangoTexto(minRate, maxRate, calc.unidad || "")}`
    };
  }

  if (["cobertura_superficie", "volumen_m3", "lineal_m"].includes(tipo)) {
    const cobertura = Number(calc.cobertura || 0);
    if (!cobertura) return null;
    const unidades = Math.ceil(v / cobertura);
    return {
      titulo: "Unidades necesarias",
      principal: `${unidades} unidad${unidades === 1 ? "" : "es"}`,
      detalle: `Cálculo: redondear hacia arriba ${formatoNumero(v)} / ${formatoNumero(cobertura)} ${calc.unidad || ""}`
    };
  }

  if (tipo === "estaciones_cebo") {
    const cobertura = Number(calc.cobertura_por_estacion_m2 || 0);
    const gramos = Number(calc.gramos_por_estacion || 0);
    if (!cobertura || !gramos) return null;
    const estaciones = Math.ceil(v / cobertura);
    const total = estaciones * gramos;
    return {
      titulo: "Estaciones y cebo",
      principal: `${estaciones} estación${estaciones === 1 ? "" : "es"} · ${formatoNumero(total)} g`,
      detalle: `Cálculo: ${estaciones} estaciones × ${formatoNumero(gramos)} g/estación`
    };
  }

  if (tipo === "inyeccion") {
    const agujeros = Number(calc.agujeros_por_m2 || 0);
    const ml = Number(calc.ml_por_agujero || 0);
    if (!agujeros || !ml) return null;
    const totalAgujeros = Math.ceil(v * agujeros);
    const total = totalAgujeros * ml;
    return {
      titulo: "Inyección",
      principal: `${totalAgujeros} agujeros · ${formatoNumero(total)} ml`,
      detalle: `Cálculo: ${formatoNumero(v)} m² × ${formatoNumero(agujeros)} agujeros/m² × ${formatoNumero(ml)} ml/agujero`
    };
  }

  if (tipo === "aplicacion_directa_tiempo") {
    return {
      titulo: "Aplicación directa",
      principal: `${formatoNumero(v)} segundos`,
      detalle: "Aplicar según el tiempo indicado por etiqueta y dosis original."
    };
  }

  return null;
}

function rangoTexto(min, max, unidad) {
  if (Math.abs(min - max) < 0.000001) return `${formatoNumero(min)} ${unidad}`.trim();
  return `${formatoNumero(min)} - ${formatoNumero(max)} ${unidad}`.trim();
}

function scoreProducto(producto, plaga, entorno) {
  let score = 0;
  const calculos = getCalculos(producto);
  if ((producto.plagas_diana_inferidas || []).some((p) => normalizar(p) === normalizar(plaga))) score += 50;
  if (entorno === "todos" || entorno === "general") score += 5;
  if ((producto.entornos_uso_inferidos || []).some((e) => normalizar(e) === normalizar(entorno))) score += 15;
  if (calculos.some((c) => c.tipo_calculo === "dilucion_agua")) score += 20;
  if (producto.numero_registro_sanitario) score += 4;
  if (producto.plazo_seguridad && !String(producto.plazo_seguridad).includes("€")) score += 3;
  if (producto.dosis_original) score += 2;
  return score;
}

function ProductoCard({ producto, seleccionado, onClick, plaga, entorno }) {
  const calculos = getCalculos(producto);
  const esDiluible = calculos.some((c) => c.tipo_calculo === "dilucion_agua");
  const score = scoreProducto(producto, plaga, entorno);

  return (
    <button className={`product-card ${seleccionado ? "selected" : ""}`} onClick={onClick}>
      <div className="product-card-top">
        <strong>{producto.producto}</strong>
        <span className="score">{score} pts</span>
      </div>
      <div className="tags">
        <span>{titleCase(producto.categoria)}</span>
        {esDiluible && <span className="tag-blue">Diluible en agua</span>}
        <span>{titleCase(producto.tipo_calculo)}</span>
      </div>
      <p>{producto.dosis_original || "Dosis no extraída"}</p>
    </button>
  );
}

function ProductoDetalle({ producto }) {
  const calculos = getCalculos(producto);
  const [calcIndex, setCalcIndex] = useState(0);
  const calc = calculos[calcIndex] || calculos[0];
  const [valor, setValor] = useState(valorDefectoPara(calc));

  React.useEffect(() => {
    setCalcIndex(0);
  }, [producto?.id, producto?.producto]);

  React.useEffect(() => {
    setValor(valorDefectoPara(calc));
  }, [calcIndex, producto?.id, producto?.producto]);

  if (!producto) {
    return (
      <section className="detail empty">
        <Bug size={50} />
        <h2>Elige una plaga</h2>
        <p>Selecciona un producto para ver su dosis y calcular la cantidad de uso.</p>
      </section>
    );
  }

  const resultado = calcular(calc, valor);
  const campo = campoEntrada(calc);
  const metaCampo = CAMPOS[campo] || { label: titleCase(campo), unidad: "", defecto: 1 };

  return (
    <section className="detail">
      <div className="detail-title">
        <FlaskConical />
        <div>
          <h2>{producto.producto}</h2>
          <p>{titleCase(producto.categoria)} · {titleCase(producto.formulado || "sin formulado")}</p>
        </div>
      </div>

      <div className="info-grid">
        <Info label="Dosis de uso" value={producto.dosis_original} />
        <Info label="Registro sanitario" value={producto.numero_registro_sanitario} />
        <Info label="Plazo de seguridad" value={producto.plazo_seguridad} />
        <Info label="Aplicación" value={producto.metodo_aplicacion} />
      </div>

      {calculos.length > 0 ? (
        <div className="calculator">
          <h3><Calculator size={19} /> Calculadora de dosis</h3>

          {calculos.length > 1 && (
            <label>
              Dosis / uso a calcular
              <select value={calcIndex} onChange={(e) => setCalcIndex(Number(e.target.value))}>
                {calculos.map((c, i) => (
                  <option key={`${c.tipo_calculo}-${i}`} value={i}>{descripcionCalculo(c, i)}</option>
                ))}
              </select>
            </label>
          )}

          <label>
            {metaCampo.label} ({metaCampo.unidad})
            <input
              type="number"
              min="0"
              step="0.1"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </label>

          {resultado ? (
            <div className="result">
              <span>{resultado.titulo}</span>
              <strong>{resultado.principal}</strong>
              <small>{resultado.detalle}</small>
            </div>
          ) : (
            <div className="result soft">
              <span>Sin cálculo automático</span>
              <strong>Revisar etiqueta</strong>
              <small>La dosis no se ha podido normalizar para este producto.</small>
            </div>
          )}
        </div>
      ) : (
        <div className="calculator soft">
          <h3>Producto sin cálculo automático</h3>
          <p>Usar la dosis original y verificar etiqueta/FDS.</p>
        </div>
      )}

      <div className="warning">
        <AlertTriangle size={18} />
        <span>Herramienta de apoyo: no sustituye la etiqueta, FDS, autorización oficial ni criterio del responsable técnico.</span>
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
  const plagas = useMemo(getPlagas, []);
  const categorias = useMemo(getCategorias, []);
  const entornos = useMemo(getEntornos, []);

  const [plaga, setPlaga] = useState(plagas[0] || "");
  const [entorno, setEntorno] = useState("todos");
  const [categoria, setCategoria] = useState("todas");
  const [soloDiluibles, setSoloDiluibles] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);

  const filtrados = useMemo(() => {
    return productos
      .filter((p) => {
        const coincidePlaga = !plaga || (p.plagas_diana_inferidas || []).some((x) => normalizar(x) === normalizar(plaga));
        const coincideCategoria = categoria === "todas" || p.categoria === categoria;
        const productoEntornos = p.entornos_uso_inferidos || [];
        const coincideEntorno = entorno === "todos" || entorno === "general" || productoEntornos.length === 0 || productoEntornos.some((x) => normalizar(x) === normalizar(entorno));
        const coincideDiluible = !soloDiluibles || getCalculos(p).some((c) => c.tipo_calculo === "dilucion_agua");
        const texto = [p.producto, p.categoria, p.formulado, p.dosis_original, p.metodo_aplicacion, ...(p.plagas_diana_inferidas || [])].join(" ");
        const coincideBusqueda = !busqueda || normalizar(texto).includes(normalizar(busqueda));
        return coincidePlaga && coincideCategoria && coincideEntorno && coincideDiluible && coincideBusqueda;
      })
      .sort((a, b) => scoreProducto(b, plaga, entorno) - scoreProducto(a, plaga, entorno));
  }, [plaga, entorno, categoria, soloDiluibles, busqueda]);

  const productoActivo = seleccionado && filtrados.some((p) => p.id === seleccionado.id && p.producto === seleccionado.producto)
    ? seleccionado
    : filtrados[0] || null;

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">NC Plagas · catálogo biocidas</p>
          <h1>Selector de biocidas y calculadora de dosis</h1>
          <p>Filtra por plaga, categoría y tipo de uso. Selecciona un producto y calcula la cantidad necesaria, especialmente para productos diluibles en agua según el volumen de caldo.</p>
        </div>
        <div className="hero-card">
          <ShieldCheck />
          <strong>{productos.length}</strong>
          <span>productos cargados</span>
        </div>
      </header>

      <section className="layout">
        <aside className="sidebar">
          <div className="panel">
            <div className="panel-title"><Filter size={18} /> Filtros</div>
            <label>
              Plaga
              <select value={plaga} onChange={(e) => { setPlaga(e.target.value); setSeleccionado(null); }}>
                {plagas.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}
              </select>
            </label>
            <label>
              Entorno
              <select value={entorno} onChange={(e) => { setEntorno(e.target.value); setSeleccionado(null); }}>
                <option value="todos">Todos</option>
                {entornos.map((e) => <option key={e} value={e}>{titleCase(e)}</option>)}
              </select>
            </label>
            <label>
              Categoría
              <select value={categoria} onChange={(e) => { setCategoria(e.target.value); setSeleccionado(null); }}>
                <option value="todas">Todas</option>
                {categorias.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
              </select>
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={soloDiluibles} onChange={(e) => { setSoloDiluibles(e.target.checked); setSeleccionado(null); }} />
              Mostrar sólo productos con cálculo por volumen de caldo
            </label>
            <label>
              Buscar
              <div className="search-box"><Search size={16} /><input placeholder="Producto, dosis, formulado..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></div>
            </label>
          </div>

          <div className="list-header"><strong>{filtrados.length} productos recomendados</strong></div>
          <div className="products-list">
            {filtrados.map((p) => (
              <ProductoCard key={`${p.id}-${p.producto}-${p.pagina_catalogo}`} producto={p} plaga={plaga} entorno={entorno} seleccionado={productoActivo?.id === p.id && productoActivo?.producto === p.producto} onClick={() => setSeleccionado(p)} />
            ))}
            {filtrados.length === 0 && <div className="no-results">No hay productos para los filtros seleccionados.</div>}
          </div>
        </aside>

        <ProductoDetalle producto={productoActivo} />
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
