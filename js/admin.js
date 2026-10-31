let prendasAdmin = [];
let ventasAdmin = [];
let proveedoresAdmin = [];
let usuariosAdmin = [];

document.addEventListener("DOMContentLoaded", () => {
  // 1. Guardia de Seguridad: Validar que sea ADMINISTRADOR
  verificarPermisosAdmin();

  // 2. Cargar datos de todos los módulos
  cargarModuloPrendas();
  cargarModuloVentas();
  cargarModuloProveedores();
  cargarModuloUsuarios();

  // 3. Event listeners
  document.getElementById("formPrenda").addEventListener("submit", registrarPrenda);
  document.getElementById("formVenta").addEventListener("submit", registrarVenta);
  document.getElementById("formProveedor").addEventListener("submit", registrarProveedor);
  
  // Filtros combinados de tabla prendas
  document.getElementById("searchPrendas").addEventListener("input", filtrarTablaPrendas);
  const filterEstado = document.getElementById("filterEstadoAdmin");
  if (filterEstado) {
    filterEstado.addEventListener("change", filtrarTablaPrendas);
  }

  // Upload Preview
  document.getElementById("foto").addEventListener("change", previewFoto);
});

// Guardia de Seguridad: Si no es admin, fuera a index.html
function verificarPermisosAdmin() {
  const sesionStr = localStorage.getItem("sesion_usuario_marcale");
  
  if (!sesionStr) {
    alert("Acceso denegado: Debes iniciar sesión con tu cuenta de administrador.");
    window.location.href = "index.html";
    return;
  }

  const usuario = JSON.parse(sesionStr);
  if (usuario.rol !== "admin") {
    alert(`Acceso denegado: La cuenta ${usuario.email} no tiene permisos de administrador.`);
    window.location.href = "index.html";
    return;
  }

  document.getElementById("adminGreeting").innerText = `Hola, ${usuario.nombre_completo}`;
}

// Menú Lateral Móvil (Hamburguesa)
function toggleSidebar() {
  document.getElementById("adminSidebar").classList.toggle("show");
}

// Navegación entre Módulos SPA
function mostrarModulo(idModulo, botonMenu = null) {
  document.querySelectorAll(".module-pane").forEach(pane => pane.classList.remove("active"));
  
  const panel = document.getElementById(`pane-${idModulo}`);
  if (panel) panel.classList.add("active");

  document.querySelectorAll(".menu-item").forEach(item => item.classList.remove("active"));
  if (botonMenu) {
    botonMenu.classList.add("active");
  } else {
    const btn = Array.from(document.querySelectorAll(".menu-item")).find(b => b.innerText.toLowerCase().includes(idModulo));
    if (btn) btn.classList.add("active");
  }

  document.getElementById("adminSidebar").classList.remove("show");
}

/* ========================================================
   MODULO 1 Y 2: PRENDAS Y DASHBOARD
======================================================== */
async function cargarModuloPrendas() {
  const tbody = document.getElementById("tablaPrendasBody");
  try {
    const { data, error } = await supabaseClient
      .from("prendas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    prendasAdmin = data || [];

    actualizarKPIs();
    filtrarTablaPrendas(); // Renderiza aplicando el filtro (por defecto 'disponible')
    actualizarSelectPrendasParaVenta(prendasAdmin);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:red;">Error: ${err.message}</td></tr>`;
  }
}

function renderizarTablaPrendas(lista) {
  const tbody = document.getElementById("tablaPrendasBody");
  tbody.innerHTML = "";

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">No hay prendas registradas con ese estado.</td></tr>`;
    return;
  }

  lista.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${item.imagen_url}" class="thumb-img" alt="${item.nombre}" onerror="this.src='https://via.placeholder.com/40'"></td>
      <td><strong>${item.codigo_prenda}</strong></td>
      <td>
        <div style="font-weight: 600;">${item.nombre}</div>
        <small style="color: var(--text-muted);">${item.marca || 'Americana'} • Talla ${item.talla_etiqueta}</small>
      </td>
      <td><strong>${parseFloat(item.precio).toFixed(2)} Bs.</strong></td>
      <td>
        <select class="status-select" onchange="cambiarEstadoPrenda('${item.id}', this.value)">
          <option value="disponible" ${item.estado === 'disponible' ? 'selected' : ''}>Disponible</option>
          <option value="reservado" ${item.estado === 'reservado' ? 'selected' : ''}>Reservado</option>
          <option value="vendido" ${item.estado === 'vendido' ? 'selected' : ''}>Vendido</option>
        </select>
      </td>
      <td>
        <button class="btn-del" onclick="eliminarPrenda('${item.id}', '${item.codigo_prenda}')">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filtrarTablaPrendas() {
  const q = document.getElementById("searchPrendas").value.toLowerCase().trim();
  const selectFiltro = document.getElementById("filterEstadoAdmin");
  const estadoSeleccionado = selectFiltro ? selectFiltro.value : "disponible";

  const filtrados = prendasAdmin.filter(p => {
    const coincideEstado = (estadoSeleccionado === "todos" || p.estado === estadoSeleccionado);
    const coincideTexto = (
      p.codigo_prenda.toLowerCase().includes(q) ||
      p.nombre.toLowerCase().includes(q) ||
      (p.marca && p.marca.toLowerCase().includes(q))
    );
    return coincideEstado && coincideTexto;
  });

  renderizarTablaPrendas(filtrados);
}

async function registrarPrenda(e) {
  e.preventDefault();
  const btn = document.getElementById("btnGuardarPrenda");
  btn.disabled = true;
  btn.innerText = "Subiendo foto...";

  try {
    const file = document.getElementById("foto").files[0];
    if (!file) throw new Error("Selecciona una fotografía para la prenda.");

    const codigoGenerado = "LE-" + Math.floor(100 + Math.random() * 900);
    const fileExt = file.name.split('.').pop();
    const filePath = `prendas/${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("prendas-le")
      .upload(filePath, file);

    if (uploadError) throw new Error(`Error en Storage: ${uploadError.message}`);

    const { data: urlData } = supabaseClient.storage
      .from("prendas-le")
      .getPublicUrl(filePath);

    const nuevaPrenda = {
      codigo_prenda: codigoGenerado,
      categoria_mano: document.getElementById("categoriaMano").value,
      nombre: document.getElementById("nombre").value.trim(),
      tipo_prenda: document.getElementById("tipoPrenda").value,
      marca: document.getElementById("marca").value.trim() || "Americana",
      talla_etiqueta: document.getElementById("talla").value,
      precio: parseFloat(document.getElementById("precio").value),
      imagen_url: urlData.publicUrl,
      estado: "disponible"
    };

    const { error: insertError } = await supabaseClient
      .from("prendas")
      .insert([nuevaPrenda]);

    if (insertError) throw insertError;

    alert(`¡Prenda registrada con éxito con código ${codigoGenerado}!`);
    document.getElementById("formPrenda").reset();
    document.getElementById("imgPreview").style.display = "none";
    document.getElementById("uploadPlaceholder").style.display = "flex";
    cargarModuloPrendas();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "Publicar Prenda";
  }
}

async function cambiarEstadoPrenda(id, estado) {
  try {
    const { error } = await supabaseClient.from("prendas").update({ estado }).eq("id", id);
    if (error) throw error;
    
    const item = prendasAdmin.find(p => p.id === id);
    if (item) item.estado = estado;
    
    actualizarKPIs();
    actualizarSelectPrendasParaVenta(prendasAdmin);
    filtrarTablaPrendas(); // Si cambia a vendido, se quitará de la vista 'disponible' automáticamente
  } catch (err) {
    alert(`Error: ${err.message}`);
    cargarModuloPrendas();
  }
}

async function eliminarPrenda(id, codigo) {
  if (!confirm(`¿Deseas eliminar la prenda ${codigo}?`)) return;
  try {
    const { error } = await supabaseClient.from("prendas").delete().eq("id", id);
    if (error) throw error;
    prendasAdmin = prendasAdmin.filter(p => p.id !== id);
    actualizarKPIs();
    filtrarTablaPrendas();
    actualizarSelectPrendasParaVenta(prendasAdmin);
  } catch (err) {
    alert(err.message);
  }
}

function previewFoto() {
  const file = document.getElementById("foto").files[0];
  const placeholder = document.getElementById("uploadPlaceholder");
  const imgPreview = document.getElementById("imgPreview");

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imgPreview.src = e.target.result;
      imgPreview.style.display = "block";
      placeholder.style.display = "none";
    };
    reader.readAsDataURL(file);
  }
}

/* ========================================================
   MODULO 3: VENTAS REALIZADAS
======================================================== */
async function cargarModuloVentas() {
  const tbody = document.getElementById("tablaVentasBody");
  try {
    const { data, error } = await supabaseClient
      .from("ventas")
      .select("*")
      .order("fecha_venta", { ascending: false });

    if (error) throw error;
    ventasAdmin = data || [];
    renderizarTablaVentas(ventasAdmin);
    actualizarKPIs();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:red;">Error: ${err.message}</td></tr>`;
  }
}

function renderizarTablaVentas(lista) {
  const tbody = document.getElementById("tablaVentasBody");
  tbody.innerHTML = "";

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">No hay ventas registradas todavía.</td></tr>`;
    return;
  }

  lista.forEach(v => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${v.codigo_venta}</strong></td>
      <td>${v.cliente_nombre}</td>
      <td>${v.codigo_prenda || ''} - ${v.nombre_prenda}</td>
      <td><strong>${parseFloat(v.monto_cobrado).toFixed(2)} Bs.</strong></td>
      <td><span style="font-size:0.75rem;">${v.metodo_pago}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function actualizarSelectPrendasParaVenta(prendas) {
  const select = document.getElementById("ventasPrendaSelect");
  select.innerHTML = `<option value="">Seleccione una prenda disponible...</option>`;

  // Mostrar únicamente prendas en estado "disponible"
  prendas.filter(p => p.estado === "disponible").forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.dataset.codigo = p.codigo_prenda;
    opt.dataset.nombre = p.nombre;
    opt.dataset.precio = p.precio;
    opt.innerText = `${p.codigo_prenda} - ${p.nombre} (${p.precio} Bs.)`;
    select.appendChild(opt);
  });

  select.onchange = () => {
    const seleccionada = select.options[select.selectedIndex];
    if (seleccionada.dataset.precio) {
      document.getElementById("ventasMonto").value = seleccionada.dataset.precio;
    }
  };
}

async function registrarVenta(e) {
  e.preventDefault();
  const select = document.getElementById("ventasPrendaSelect");
  const opt = select.options[select.selectedIndex];
  if (!opt.value) {
    alert("Por favor selecciona una prenda.");
    return;
  }

  const btn = document.getElementById("btnGuardarVenta");
  btn.disabled = true;

  try {
    const prendaId = opt.value;
    const codigoPrenda = opt.dataset.codigo;
    const nombrePrenda = opt.dataset.nombre;
    const monto = parseFloat(document.getElementById("ventasMonto").value);
    const cliente = document.getElementById("ventasCliente").value.trim();
    const metodo = document.getElementById("ventasMetodo").value;

    const codigoVenta = "VTA-" + Math.floor(1000 + Math.random() * 9000);

    // 1. Guardar la venta en la tabla 'ventas'
    const { error: errorVenta } = await supabaseClient.from("ventas").insert([{
      codigo_venta: codigoVenta,
      cliente_nombre: cliente,
      prenda_id: prendaId,
      codigo_prenda: codigoPrenda,
      nombre_prenda: nombrePrenda,
      monto_cobrado: monto,
      metodo_pago: metodo
    }]);

    if (errorVenta) throw errorVenta;

    // 2. Marcar la prenda como "vendido" en la tabla 'prendas'
    await supabaseClient.from("prendas").update({ estado: "vendido" }).eq("id", prendaId);

    alert(`¡Venta ${codigoVenta} confirmada! La prenda se marcó como VENDIDA y salió del stock en percha.`);
    document.getElementById("formVenta").reset();
    cargarModuloVentas();
    cargarModuloPrendas();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
  }
}

/* ========================================================
   MODULO 4: PROVEEDORES
======================================================== */
async function cargarModuloProveedores() {
  const tbody = document.getElementById("tablaProveedoresBody");
  try {
    const { data, error } = await supabaseClient.from("proveedores").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    proveedoresAdmin = data || [];
    renderizarTablaProveedores(proveedoresAdmin);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:red;">Error: ${err.message}</td></tr>`;
  }
}

function renderizarTablaProveedores(lista) {
  const tbody = document.getElementById("tablaProveedoresBody");
  tbody.innerHTML = "";
  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center">No hay proveedores registrados.</td></tr>`;
    return;
  }
  lista.forEach(prov => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${prov.nombre_distribuidor}</strong></td>
      <td>${prov.contacto_telefono}</td>
      <td>${prov.ciudad_origen || '-'}</td>
      <td><small>${prov.tipo_paca || '-'}</small></td>
    `;
    tbody.appendChild(tr);
  });
}

async function registrarProveedor(e) {
  e.preventDefault();
  try {
    const nuevo = {
      nombre_distribuidor: document.getElementById("provNombre").value.trim(),
      contacto_telefono: document.getElementById("provTelefono").value.trim(),
      ciudad_origen: document.getElementById("provCiudad").value.trim(),
      tipo_paca: document.getElementById("provTipo").value.trim()
    };
    const { error } = await supabaseClient.from("proveedores").insert([nuevo]);
    if (error) throw error;

    alert("¡Proveedor guardado con éxito!");
    document.getElementById("formProveedor").reset();
    cargarModuloProveedores();
  } catch (err) {
    alert(err.message);
  }
}

/* ========================================================
   MODULO 5: USUARIOS REGISTRADOS
======================================================== */
async function cargarModuloUsuarios() {
  const tbody = document.getElementById("tablaUsuariosBody");
  try {
    const { data, error } = await supabaseClient.from("usuarios").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    usuariosAdmin = data || [];
    renderizarTablaUsuarios(usuariosAdmin);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:red;">Error: ${err.message}</td></tr>`;
  }
}

function renderizarTablaUsuarios(lista) {
  const tbody = document.getElementById("tablaUsuariosBody");
  tbody.innerHTML = "";
  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">No hay usuarios registrados.</td></tr>`;
    return;
  }
  lista.forEach(u => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${u.nombre_completo}</strong></td>
      <td>${u.email}</td>
      <td>${u.telefono_ws || '-'}</td>
      <td><span style="text-transform:uppercase; font-size:0.75rem; font-weight:bold;">${u.rol}</span></td>
      <td><small>${new Date(u.created_at).toLocaleDateString()}</small></td>
    `;
    tbody.appendChild(tr);
  });
}

/* ========================================================
   KPIS DEL DASHBOARD
======================================================== */
function actualizarKPIs() {
  document.getElementById("kpiTotal").innerText = prendasAdmin.length;
  document.getElementById("kpiDisponibles").innerText = prendasAdmin.filter(p => p.estado === 'disponible').length;
  document.getElementById("kpiReservadas").innerText = prendasAdmin.filter(p => p.estado === 'reservado').length;
  document.getElementById("kpiVendidas").innerText = prendasAdmin.filter(p => p.estado === 'vendido').length;

  const totalBs = ventasAdmin.reduce((acc, curr) => acc + (parseFloat(curr.monto_cobrado) || 0), 0);
  document.getElementById("kpiTotalVentasBs").innerText = `${totalBs.toFixed(2)} Bs.`;
}

function cerrarSesionAdmin() {
  if (confirm("¿Cerrar sesión de administrador?")) {
    localStorage.removeItem("sesion_usuario_marcale");
    window.location.href = "index.html";
  }
}