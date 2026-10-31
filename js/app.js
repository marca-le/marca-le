let prendasData = [];
const NUMERO_WHATSAPP = "59177822881"; // Reemplaza con tu número o el de la tienda

document.addEventListener("DOMContentLoaded", () => {
  verificarEstadoSesion();
  cargarCatalogo();

  // Filtros
  document.getElementById("filterMano").addEventListener("change", aplicarFiltros);
  document.getElementById("filterTipo").addEventListener("change", aplicarFiltros);
  document.getElementById("inputSearch").addEventListener("input", aplicarFiltros);

  // Formularios de Autenticación
  document.getElementById("formLogin").addEventListener("submit", procesarLogin);
  document.getElementById("formRegister").addEventListener("submit", procesarRegistro);
});

// Verificar si hay sesión activa
function verificarEstadoSesion() {
  const sesionStr = localStorage.getItem("sesion_usuario_marcale");
  const navContainer = document.getElementById("navUserActions");

  if (sesionStr) {
    const usuario = JSON.parse(sesionStr);
    
    // Si es administrador
    if (usuario.rol === "admin") {
      navContainer.innerHTML = `
        <div class="user-session-badge">
          <span class="user-name-label">👑 ${usuario.nombre_completo}</span>
          <a href="admin.html" class="admin-link-btn">Panel Admin</a>
          <button class="btn-logout" onclick="cerrarSesion()">Salir</button>
        </div>
      `;
    } else {
      // Si es cliente regular
      navContainer.innerHTML = `
        <div class="user-session-badge">
          <span class="user-name-label">👤 ${usuario.nombre_completo}</span>
          <button class="btn-logout" onclick="cerrarSesion()">Salir</button>
        </div>
      `;
    }
  } else {
    navContainer.innerHTML = `
      <button class="btn-login-open" onclick="abrirModalAuth('login')">Ingresar</button>
      <button class="btn-register-open" onclick="abrirModalAuth('register')">Registrarse</button>
    `;
  }
}

// Cargar catálogo desde Supabase
async function cargarCatalogo() {
  const grid = document.getElementById("productsGrid");
  
  try {
    // Solo consultamos prendas con estado "disponible"
    const { data, error } = await supabaseClient
      .from("prendas")
      .select("*")
      .eq("estado", "disponible") // <-- ESTA LÍNEA OCULTA LAS VENDIDAS
      .order("created_at", { ascending: false });

    if (error) throw error;

    prendasData = data || [];
    renderizarPrendas(prendasData);
  } catch (err) {
    grid.innerHTML = `<p style="color:red; text-align:center;">Error al cargar prendas: ${err.message}</p>`;
  }
}

// Renderizar tarjetas
function renderizarPrendas(lista) {
  const grid = document.getElementById("productsGrid");
  grid.innerHTML = "";

  if (lista.length === 0) {
    grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 20px;">No se encontraron prendas con esos filtros.</p>`;
    return;
  }

  // Comprobar usuario activo para personalizar el pedido
  const sesion = JSON.parse(localStorage.getItem("sesion_usuario_marcale") || "null");
  const nombreCliente = sesion ? sesion.nombre_completo : "Cliente";

  lista.forEach(item => {
    const card = document.createElement("div");
    card.className = "card-product";

    const mensajeWS = encodeURIComponent(
      `¡Hola Marca LE! Mi nombre es ${nombreCliente} y quiero consultar por esta prenda:\n` +
      `Código: ${item.codigo_prenda}\n` +
      `Prenda: ${item.nombre}\n` +
      `Talla: ${item.talla_etiqueta}\n` +
      `Precio: ${item.precio} Bs.\n` +
      `¿Sigue disponible para coordinar la entrega o verla en la feria?`
    );

    card.innerHTML = `
      <div class="card-image-wrapper">
        <img src="${item.imagen_url}" alt="${item.nombre}" loading="lazy">
        <span class="badge-mano badge-${item.categoria_mano}">${item.categoria_mano} Mano</span>
        <span class="badge-estado">${item.estado.toUpperCase()}</span>
      </div>
      <div class="card-details">
        <span class="card-code">${item.codigo_prenda} • ${item.marca || 'Americana'}</span>
        <h4 class="card-title">${item.nombre}</h4>
        <p class="card-meta">Talla: <strong>${item.talla_etiqueta}</strong> | Tipo: ${item.tipo_prenda}</p>
        <p class="card-price">${parseFloat(item.precio).toFixed(2)} Bs.</p>
        <a class="btn-ws" href="https://wa.me/${NUMERO_WHATSAPP}?text=${mensajeWS}" target="_blank">📲 Pedir por WhatsApp</a>
      </div>
    `;
    grid.appendChild(card);
  });
}

function aplicarFiltros() {
  const mano = document.getElementById("filterMano").value;
  const tipo = document.getElementById("filterTipo").value;
  const busqueda = document.getElementById("inputSearch").value.toLowerCase().trim();

  const filtrados = prendasData.filter(item => {
    const coincideMano = (mano === "todos" || item.categoria_mano === mano);
    const coincideTipo = (tipo === "todos" || item.tipo_prenda === tipo);
    const coincideTexto = (
      item.nombre.toLowerCase().includes(busqueda) ||
      (item.marca && item.marca.toLowerCase().includes(busqueda)) ||
      item.codigo_prenda.toLowerCase().includes(busqueda)
    );
    return coincideMano && coincideTipo && coincideTexto;
  });

  renderizarPrendas(filtrados);
}

// Control de Modales de Login / Registro
function abrirModalAuth(tipo) {
  document.getElementById("modalAuth").style.display = "flex";
  switchAuthTab(tipo);
}

function cerrarModalAuth() {
  document.getElementById("modalAuth").style.display = "none";
}

function switchAuthTab(tipo) {
  const formLogin = document.getElementById("formLogin");
  const formRegister = document.getElementById("formRegister");
  const tabLogin = document.getElementById("tabLogin");
  const tabRegister = document.getElementById("tabRegister");

  if (tipo === "login") {
    formLogin.style.display = "block";
    formRegister.style.display = "none";
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
  } else {
    formLogin.style.display = "none";
    formRegister.style.display = "block";
    tabLogin.classList.remove("active");
    tabRegister.classList.add("active");
  }
}

// Procesar Iniciar Sesión
async function procesarLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value.trim();
  const btn = document.getElementById("btnLoginSubmit");

  btn.disabled = true;
  btn.innerText = "Verificando...";

  try {
    const { data, error } = await supabaseClient
      .from("usuarios")
      .select("*")
      .eq("email", email)
      .eq("password", password)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Correo o contraseña incorrectos.");

    // Guardar sesión
    localStorage.setItem("sesion_usuario_marcale", JSON.stringify(data));
    cerrarModalAuth();

    if (data.rol === "admin") {
      alert(`¡Bienvenida Administradora ${data.nombre_completo}! Redirigiendo al panel administrativo...`);
      window.location.href = "admin.html";
    } else {
      alert(`¡Bienvenido/a ${data.nombre_completo}!`);
      verificarEstadoSesion();
      renderizarPrendas(prendasData);
    }
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "Acceder";
  }
}

// Procesar Registro de Cliente
async function procesarRegistro(e) {
  e.preventDefault();
  const nombre = document.getElementById("regNombre").value.trim();
  const email = document.getElementById("regEmail").value.trim().toLowerCase();
  const telefono = document.getElementById("regTelefono").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  const btn = document.getElementById("btnRegisterSubmit");

  btn.disabled = true;
  btn.innerText = "Registrando...";

  try {
    const nuevoUsuario = {
      nombre_completo: nombre,
      email: email,
      telefono_ws: telefono,
      password: password,
      rol: "cliente"
    };

    const { data, error } = await supabaseClient
      .from("usuarios")
      .insert([nuevoUsuario])
      .select()
      .single();

    if (error) {
      if (error.message.includes("unique")) throw new Error("Este correo electrónico ya está registrado.");
      throw error;
    }

    localStorage.setItem("sesion_usuario_marcale", JSON.stringify(data));
    alert(`¡Cuenta creada con éxito! Bienvenido a Marca LE, ${data.nombre_completo}.`);
    cerrarModalAuth();
    verificarEstadoSesion();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "Registrarme";
  }
}

function cerrarSesion() {
  if (confirm("¿Deseas cerrar tu sesión?")) {
    localStorage.removeItem("sesion_usuario_marcale");
    verificarEstadoSesion();
    renderizarPrendas(prendasData);
  }
}