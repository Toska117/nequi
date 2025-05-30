// Configuración de Supabase
const SUPABASE_URL = "https://dkpdzlikwcxgjwiadcdf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrcGR6bGlrd2N4Z2p3aWFkY2RmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NTQxNDUsImV4cCI6MjA2NDEzMDE0NX0.th8nhlOxTVg2NSbMRin8KljYNr4TW1Re9xkoaaGuYdQ";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;

// Mostrar login
function showLogin() {
  document.getElementById('registerCard').classList.add('hidden');
  const loginFormContainer = document.querySelector('.login-form-container');
  if (loginFormContainer) loginFormContainer.style.display = 'block';
  document.getElementById('loginPhone').value = "";
  document.getElementById('loginPin').value = "";
}

// Mostrar registro
function showRegister() {
  const loginFormContainer = document.querySelector('.login-form-container');
  if (loginFormContainer) loginFormContainer.style.display = 'none';
  document.getElementById('registerCard').classList.remove('hidden');
}

// Mostrar login de admin
function showAdminLogin() {
  document.querySelector('.login-form-container').style.display = 'none';
  document.getElementById('registerCard').classList.add('hidden');
  document.getElementById('adminLoginCard').classList.remove('hidden');
}

// LOGIN usando Supabase
async function login() {
  const phone = document.getElementById('loginPhone').value;
  const pin = document.getElementById('loginPin').value;

  // Buscar usuario en la tabla usuarios
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('phone_number', phone)
    .eq('pin', pin)
    .single();

  if (error || !data) {
    alert("Credenciales incorrectas.");
    return;
  }

  // Guardar usuario en sessionStorage
  sessionStorage.setItem('currentUser', JSON.stringify(data));

  // Siempre redirige a home.html, incluso si es admin
  window.location.href = "home.html";
}

// REGISTRO usando Supabase
async function register() {
  const phone = document.getElementById('regPhone').value;
  const name = document.getElementById('regName').value;
  const lastname = document.getElementById('regLastname').value; // <-- Asegúrate de tener este input
  const pin = document.getElementById('regPin').value;

  // Validaciones
  if (!/^\d{10}$/.test(phone)) {
    alert("El número de teléfono debe tener exactamente 10 dígitos.");
    return;
  }
  if (pin.length !== 4) {
    alert("El PIN debe tener 4 dígitos.");
    return;
  }

  // Verificar si ya existe
  const { data: existing } = await supabase
    .from('usuarios')
    .select('id')
    .eq('phone_number', phone)
    .maybeSingle();

  if (existing) {
    alert("El usuario ya existe.");
    return;
  }

  // Crear usuario (agrega apellido)
  const { data: usuario, error: errorUsuario } = await supabase
    .from('usuarios')
    .insert([{ phone_number: phone, pin: pin, nombre: name, apellido: lastname }])
    .select()
    .single();

  if (errorUsuario) {
    alert("Error al registrar usuario.");
    return;
  }

  // Crear cuenta asociada (saldo aleatorio)
  const monto = Math.floor(Math.random() * (2000000 - 20000)) + 20000;
  await supabase
    .from('cuentas')
    .insert([{ usuario_id: phone, monto: monto, tipo: 'publica' }]);

  alert("Usuario registrado exitosamente. Ahora puedes iniciar sesión.");
  showLogin();
}

// --- DASHBOARD (home.html) ---

// Solo ejecuta esto en home.html
if (window.location.pathname.endsWith("home.html")) {
  document.addEventListener("DOMContentLoaded", async () => {
    // Recuperar usuario de sessionStorage
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    currentUser = user;

    // Mostrar saldo
    await showBalance();

    // Botones
    window.showBalance = showBalance;
    window.showHistory = showHistory;
    window.showConsulta = showConsulta;
    window.logout = logout;
  });

  let saldoActual = null;
  let saldoOculto = false;

  // Mostrar solo el saldo de la cuenta pública (usuario_id = número de teléfono)
  async function showBalance() {
    document.getElementById('balanceSection').classList.remove('hidden');
    document.getElementById('historySection').classList.add('hidden');
    document.getElementById('consultaSection').classList.add('hidden');

    // Consultar la cuenta del usuario usando el número de teléfono como usuario_id
    const { data: cuentas, error } = await supabase
      .from('cuentas')
      .select('*')
      .eq('usuario_id', currentUser.phone_number)
      .limit(1);

    if (error) {
      document.getElementById('balanceText').textContent = "Error al consultar saldo.";
      return;
    }
    if (!cuentas || cuentas.length === 0) {
      document.getElementById('balanceText').textContent = "No tienes cuenta asociada.";
      return;
    }

    document.getElementById('balanceText').textContent = `Saldo disponible: $${cuentas[0].monto}`;
  }

  // Ocultar/mostrar saldo
  function actualizarVisualSaldo() {
    const balanceText = document.getElementById('balanceText');
    if (saldoActual === null) {
      balanceText.innerHTML = `Saldo disponible: $0 <img src="ojito.png" alt="Ocultar saldo" id="toggleSaldoBtn" title="Ocultar/mostrar saldo" style="width:28px;height:28px;vertical-align:middle;cursor:pointer;">`;
    } else if (saldoOculto) {
      balanceText.innerHTML = `****** <img src="ojito.png" alt="Ocultar saldo" id="toggleSaldoBtn" title="Ocultar/mostrar saldo" style="width:28px;height:28px;vertical-align:middle;cursor:pointer;">`;
    } else {
      balanceText.innerHTML = `Saldo disponible: $${saldoActual} <img src="ojito.png" alt="Ocultar saldo" id="toggleSaldoBtn" title="Ocultar/mostrar saldo" style="width:28px;height:28px;vertical-align:middle;cursor:pointer;">`;
    }
    // Reasignar el evento al ojito cada vez que se actualiza el saldo
    const ojitoBtn = document.getElementById('toggleSaldoBtn');
    if (ojitoBtn) {
      ojitoBtn.onclick = function() {
        saldoOculto = !saldoOculto;
        actualizarVisualSaldo();
      };
    }
  }

  document.addEventListener("DOMContentLoaded", function() {
    const ojitoBtn = document.getElementById('toggleSaldoBtn');
    if (ojitoBtn) {
      ojitoBtn.onclick = function() {
        saldoOculto = !saldoOculto;
        actualizarVisualSaldo();
      };
    }
  });

  // Mostrar historial (movimientos donde el usuario es origen o destino)
  async function showHistory() {
    document.getElementById('balanceSection').classList.add('hidden');
    document.getElementById('historySection').classList.remove('hidden');
    document.getElementById('consultaSection').classList.add('hidden');

    // Consultar movimientos donde el usuario es origen o destino (por número de teléfono)
    const { data: movimientos, error } = await supabase
      .from('movimientos')
      .select('*')
      .or(`usuario_origen.eq.${currentUser.phone_number},usuario_destino.eq.${currentUser.phone_number}`);

    const list = document.getElementById('transactionList');
    list.innerHTML = "";
    if (error) {
      list.innerHTML = "<li>Error al consultar movimientos</li>";
      return;
    }
    if (!movimientos || movimientos.length === 0) {
      list.innerHTML = "<li>No hay transacciones</li>";
    } else {
      movimientos.forEach(tx => {
        const tipo = tx.usuario_origen === currentUser.phone_number ? "Enviado" : "Recibido";
        list.innerHTML += `<li>
          <strong>${tipo}</strong> - ID: ${tx.id}<br>
          Origen: ${tx.usuario_origen} <br>
          Destino: ${tx.usuario_destino} <br>
          Monto: $${tx.amount} <br>
          Tipo: ${tx.tipo}
        </li>`;
      });
    }
  }

  // Mostrar consultas (puedes personalizar)
  function showConsulta() {
    document.getElementById('balanceSection').classList.add('hidden');
    document.getElementById('historySection').classList.add('hidden');
    document.getElementById('consultaSection').classList.remove('hidden');
  }

  // Logout
  function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = "index.html";
  }

  // Enviar dinero
  async function enviarDinero() {
    const numeroDestino = document.getElementById('numeroDestino').value.trim();
    const montoEnviar = parseInt(document.getElementById('montoEnviar').value, 10);
    const mensaje = document.getElementById('mensajeConsignar');
    mensaje.style.color = "#c00";

    if (!numeroDestino || isNaN(montoEnviar) || montoEnviar <= 0) {
      mensaje.textContent = "Datos inválidos.";
      return;
    }
    if (numeroDestino === currentUser.phone_number) {
      mensaje.textContent = "No puedes enviarte dinero a ti mismo.";
      return;
    }

    // Consultar saldo actual
    const { data: cuentasOrigen, error: errorOrigen } = await supabase
      .from('cuentas')
      .select('*')
      .eq('usuario_id', currentUser.phone_number)
      .limit(1);

    if (errorOrigen || !cuentasOrigen || cuentasOrigen.length === 0) {
      mensaje.textContent = "Error al consultar tu cuenta.";
      return;
    }
    if (cuentasOrigen[0].monto < montoEnviar) {
      mensaje.textContent = "Saldo insuficiente.";
      return;
    }

    // Consultar cuenta destino
    const { data: cuentasDestino, error: errorDestino } = await supabase
      .from('cuentas')
      .select('*')
      .eq('usuario_id', numeroDestino)
      .limit(1);

    if (errorDestino || !cuentasDestino || cuentasDestino.length === 0) {
      mensaje.textContent = "Cuenta destino no encontrada.";
      return;
    }

    // Actualizar cuentas y registrar movimiento
    // Restar al origen
    const { error: errorUpdateOrigen } = await supabase
      .from('cuentas')
      .update({ monto: cuentasOrigen[0].monto - montoEnviar })
      .eq('id', cuentasOrigen[0].id);

    // Sumar al destino
    const { error: errorUpdateDestino } = await supabase
      .from('cuentas')
      .update({ monto: cuentasDestino[0].monto + montoEnviar })
      .eq('id', cuentasDestino[0].id);

    // Registrar movimiento
    await supabase
      .from('movimientos')
      .insert([{
        usuario_origen: currentUser.phone_number,
        usuario_destino: numeroDestino,
        amount: montoEnviar,
        tipo: 'envio'
      }]);

    if (errorUpdateOrigen || errorUpdateDestino) {
      mensaje.textContent = "Error al transferir dinero.";
      return;
    }

    mensaje.style.color = "#090";
    mensaje.textContent = "¡Dinero enviado exitosamente!";
    await showBalance();
    setTimeout(() => {
      cerrarModalConsignar();
    }, 1200);
  }

  // Abrir y cerrar modal de consignar propio
  function abrirModalConsignarPropio() {
    document.getElementById('modalConsignarPropio').style.display = 'flex';
    document.getElementById('montoConsignarPropio').value = '';
    document.getElementById('mensajeConsignarPropio').textContent = '';
  }
  function cerrarModalConsignarPropio() {
    document.getElementById('modalConsignarPropio').style.display = 'none';
  }

  // Consignar dinero a la propia cuenta
  async function consignarPropio() {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    const monto = parseFloat(document.getElementById('montoConsignarPropio').value);
    const mensaje = document.getElementById('mensajeConsignarPropio');
    mensaje.style.color = "#c00";

    if (isNaN(monto) || monto <= 0) {
      mensaje.textContent = "Monto inválido.";
      return;
    }

    // Consultar cuenta propia
    const { data: cuentas, error } = await supabase
      .from('cuentas')
      .select('*')
      .eq('usuario_id', user.phone_number)
      .eq('tipo', 'publica')
      .limit(1);

    if (error || !cuentas || cuentas.length === 0) {
      mensaje.textContent = "No se encontró tu cuenta.";
      return;
    }

    // Validar saldo suficiente
    const saldoActual = parseFloat(cuentas[0].monto) || 0;
    if (saldoActual < monto) {
      mensaje.textContent = "Saldo insuficiente.";
      return;
    }
    const nuevaSuma = saldoActual - monto;

    // Actualizar saldo
    const { error: errorUpdate } = await supabase
      .from('cuentas')
      .update({ monto: nuevaSuma })
      .eq('id', cuentas[0].id);

    // Registrar movimiento
    await supabase
      .from('movimientos')
      .insert([{
        usuario_origen: user.phone_number,
        usuario_destino: user.phone_number,
        amount: monto,
        tipo: 'retiro_fisico'
      }]);

    if (errorUpdate) {
      mensaje.textContent = "Error al retirar dinero.";
      return;
    }

    mensaje.style.color = "#090";
    mensaje.textContent = "¡Dinero retirado exitosamente!";
    await showBalance();
    setTimeout(() => {
      cerrarModalConsignarPropio();
    }, 1200);
  }

  // --- Eliminar cuenta ---
  function abrirModalEliminarCuenta() {
    document.getElementById('modalEliminarCuenta').style.display = 'flex';
    document.getElementById('mensajeEliminarCuenta').textContent = '';
  }
  function cerrarModalEliminarCuenta() {
    document.getElementById('modalEliminarCuenta').style.display = 'none';
  }

  async function eliminarCuenta() {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    const mensaje = document.getElementById('mensajeEliminarCuenta');
    mensaje.style.color = "#c00";

    // 1. Consultar saldo actual
    const { data: cuentas, error } = await supabase
      .from('cuentas')
      .select('*')
      .eq('usuario_id', user.phone_number)
      .eq('tipo', 'publica')
      .limit(1);

    if (error || !cuentas || cuentas.length === 0) {
      mensaje.textContent = "No se pudo consultar tu saldo.";
      return;
    }

    const saldo = cuentas[0].monto;

    // 2. Sumar saldo a la cuenta 3166144541
    const { data: cuentaDestino, error: errorDestino } = await supabase
      .from('cuentas')
      .select('*')
      .eq('usuario_id', '3166144541')
      .eq('tipo', 'publica')
      .limit(1);

    if (errorDestino || !cuentaDestino || cuentaDestino.length === 0) {
      mensaje.textContent = "No se encontró la cuenta destino.";
      return;
    }

    const nuevoSaldoDestino = cuentaDestino[0].monto + saldo;

    // 3. Actualizar saldo destino
    await supabase
      .from('cuentas')
      .update({ monto: nuevoSaldoDestino })
      .eq('id', cuentaDestino[0].id);

    // 4. Eliminar usuario de todas las tablas (usuarios, cuentas, movimientos, bolsillo)
    await supabase.from('movimientos').delete().or(`usuario_origen.eq.${user.phone_number},usuario_destino.eq.${user.phone_number}`);
    await supabase.from('bolsillo').delete().eq('usuario', user.phone_number);
    await supabase.from('cuentas').delete().eq('usuario_id', user.phone_number);
    await supabase.from('usuarios').delete().eq('phone_number', user.phone_number);

    mensaje.style.color = "#090";
    mensaje.textContent = "Cuenta eliminada correctamente. Redirigiendo...";
    setTimeout(() => {
      sessionStorage.removeItem('currentUser');
      window.location.href = "index.html";
    }, 1800);
  }
}