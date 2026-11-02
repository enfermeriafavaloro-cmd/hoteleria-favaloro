import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase, ref, push, onValue, update } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyAhuemUIdPLTBKfjEFnrgZ44W6We2_0xOk",
  authDomain: "favaloro-limpieza.firebaseapp.com",
  databaseURL: "https://favaloro-limpieza-default-rtdb.firebaseio.com",
  projectId: "favaloro-limpieza",
  storageBucket: "favaloro-limpieza.firebasestorage.app",
  messagingSenderId: "518784618435",
  appId: "1:518784618435:web:b8b575b2cc2c3b97c43776"
};

const EMAIL_MANTENIMIENTO = "waguirre@ffavaloro.org";

const CAMAS = {
  "7*A":  ["701","702","703 A","703 B","704 A","704 B","705","706","707 A","707 B","708","709","711","713"],
  "7*B":  ["715 A","715 B","716 A","716 B","717 A","717 B","718 A","718 B","719 A","719 B","720 A","720 B","721 A","721 B","722 A","722 B","724 A","724 B","726 A","726 B","728 A","728 B"],
  "8*A":  ["801","802","803","804","805","806","807","808","809","810","811"],
  "8*B":  ["812 A","812 B","813 A","813 B","814 A","814 B","815 A","815 B","816 A","816 B","817 A","817 B","818 A","818 B","819 A","819 B","820 A","820 B","821 A","821 B","822 A","822 B"],
  "9*A":  ["901","902","903","904","905","906","907","908","909","911","912"],
  "9*B":  ["915 A","915 B","916 A","916 B","917 A","917 B","918 A","918 B","919 A","919 B","920 A","920 B","921 A","921 B","922 A","922 B","924 A","924 B","926 A","926 B","928 A","928 B"],
  "UTI 2": ["601","602","603","604","605","606","607","608","609","611","613"],
  "TELEMETRIA": ["615 A","615 B","616 A","616 B","617 A","617 B","618 A","618 B","619 A","619 B","620 A","620 B","621 A","621 B","622 A","622 B","624 A","624 B","626 A","626 B","628 A","628 B"],
  "UTI 1": ["511","512","513","514","515","516","517","518","519","520"],
  "RCV-UCO": ["301","302","303","304","305","306","307","308","309","310","311","312","314","315","316"],
  "GUARDIA": ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","CONSUL 1","CONSUL 2","CONSUL 3"],
  "CIRUGIA Y PROCEDIMIENTOS": ["401","402","403","404","405","406","407","408","409","410","411","412","413","414","415","416"],
  "PROCEDIMIENTOS AMB 1*P": ["101","102","103","104","105","106","107","108","109","110","111"],
  "UCO": ["501","502","503","504","505","506","507","508","509","510"],
  "INT 1*P": ["100","102","104","106","108","110","112","114"]
};

const TIPOS = {
  mantenimiento: [
    "Electricidad (luz, enchufes, cortocircuito)",
    "Plomería (pérdidas, desagotes, canillas)",
    "Infraestructura (puertas, ventanas, mobiliario)",
    "Equipamiento (camas, sillas, televisores)",
    "Climatización (aire acondicionado, calefacción)"
  ],
  limpieza: [
    "Limpieza de habitación / área",
    "Limpieza urgente (derrame, contaminación)",
    "Reposición de insumos (papel, jabón, alcohol)",
    "Retiro de residuos"
  ]
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

const params  = new URLSearchParams(window.location.search);
const usuario = params.get('email') || 'usuario@favaloro.org';
document.getElementById('usuarioActual').textContent = '👤 ' + usuario;

// ── TABS ─────────────────────────────────────────────────
window.mostrarTab = (tab) => {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.querySelectorAll('.tab')[tab === 'nueva' ? 0 : 1].classList.add('active');
};

// ── TIPOS DINÁMICOS ───────────────────────────────────────
window.actualizarTipos = () => {
  const destino = document.getElementById('destino').value;
  const sel = document.getElementById('tipo');
  sel.innerHTML = '';
  if (!destino) {
    sel.innerHTML = '<option value="">-- Primero seleccioná destino --</option>';
    return;
  }
  TIPOS[destino].forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    sel.appendChild(opt);
  });
};

// ── SERVICIO → CAMAS ──────────────────────────────────────
window.actualizarCamas = () => {
  const servicio = document.getElementById('servicio').value;
  const selCama  = document.getElementById('cama');
  selCama.innerHTML = '<option value="">-- Seleccioná cama --</option>';
  if (!servicio) return;
  CAMAS[servicio].forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = 'Cama ' + c;
    selCama.appendChild(opt);
  });
};

// ── ENVIAR SOLICITUD ──────────────────────────────────────
window.enviarSolicitud = async () => {
  const destino     = document.getElementById('destino').value;
  const tipo        = document.getElementById('tipo').value;
  const servicio    = document.getElementById('servicio').value;
  const cama        = document.getElementById('cama').value;
  const descripcion = document.getElementById('descripcion').value.trim();
  const urgencia    = document.getElementById('urgencia').value;
  const msgEl       = document.getElementById('mensaje-envio');

  if (!destino || !tipo || !servicio || !descripcion) {
    msgEl.style.color = '#C8102E';
    msgEl.textContent = '⚠️ Completá todos los campos obligatorios.';
    return;
  }

  const ubicacion = cama ? `${servicio} — Cama ${cama}` : servicio;

  const solicitud = {
    destino, tipo, servicio, cama: cama || 'Sin especificar',
    ubicacion, descripcion, urgencia,
    estado: 'pendiente',
    creadoPor: usuario,
    fechaCreacion: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
    timestamp: Date.now()
  };

  try {
    await push(ref(db, 'hosteleria/solicitudes'), solicitud);

    if (destino === 'mantenimiento') {
      const asunto = encodeURIComponent(`[${urgencia.toUpperCase()}] Mantenimiento - ${ubicacion}`);
      const cuerpo = encodeURIComponent(
        `Tipo: ${tipo}\nUbicación: ${ubicacion}\nDescripción: ${descripcion}\nUrgencia: ${urgencia}\nSolicitado por: ${usuario}`
      );
      window.open(`mailto:${EMAIL_MANTENIMIENTO}?subject=${asunto}&body=${cuerpo}`);
    }

    msgEl.style.color = '#155724';
    msgEl.textContent = '✅ Solicitud enviada correctamente.';

    document.getElementById('destino').value = '';
    document.getElementById('tipo').innerHTML = '<option value="">-- Primero seleccioná destino --</option>';
    document.getElementById('servicio').value = '';
    document.getElementById('cama').innerHTML = '<option value="">-- Seleccioná cama --</option>';
    document.getElementById('descripcion').value = '';
    document.getElementById('urgencia').value = 'normal';

    setTimeout(() => { msgEl.textContent = ''; }, 4000);

  } catch (e) {
    msgEl.style.color = '#C8102E';
    msgEl.textContent = '❌ Error al enviar. Intentá de nuevo.';
    console.error(e);
  }
};

// ── PANEL EN TIEMPO REAL ──────────────────────────────────
let todasLasSolicitudes = [];

onValue(ref(db, 'hosteleria/solicitudes'), (snapshot) => {
  todasLasSolicitudes = [];
  snapshot.forEach(child => {
    todasLasSolicitudes.push({ id: child.key, ...child.val() });
  });
  todasLasSolicitudes.sort((a, b) => b.timestamp - a.timestamp);
  aplicarFiltros();
});

window.aplicarFiltros = () => {
  const filtroDestino = document.getElementById('filtro-destino').value;
  const filtroEstado  = document.getElementById('filtro-estado').value;
  let filtradas = todasLasSolicitudes.filter(s =>
    (!filtroDestino || s.destino === filtroDestino) &&
    (!filtroEstado  || s.estado  === filtroEstado)
  );
  renderSolicitudes(filtradas);
};

function renderSolicitudes(lista) {
  const el = document.getElementById('lista-solicitudes');
  if (lista.length === 0) {
    el.innerHTML = '<p class="sin-solicitudes">No hay solicitudes para mostrar.</p>';
    return;
  }
  el.innerHTML = lista.map(s => `
    <div class="solicitud-card">
      <div class="solicitud-header">
        <span class="solicitud-tipo">
          ${s.destino === 'mantenimiento' ? '🔧' : '🧹'} ${s.tipo}
        </span>
        <div>
          <span class="badge badge-${s.estado}">${estadoLabel(s.estado)}</span>
          ${s.urgencia === 'urgente' ? '<span class="badge badge-urgente">🚨 Urgente</span>' : ''}
        </div>
      </div>
      <div class="solicitud-info">
        <span>🏥 ${s.ubicacion || s.servicio}</span>
        <span>🛏 Cama ${s.cama}</span>
        <span>👤 ${s.creadoPor}</span>
        <span>🕐 ${s.fechaCreacion}</span>
      </div>
      <div class="solicitud-desc">${s.descripcion}</div>
      <div class="solicitud-acciones">
        ${s.estado === 'pendiente' ? `<button class="btn-estado btn-en_proceso" onclick="cambiarEstado('${s.id}', 'en_proceso')">▶ En Proceso</button>` : ''}
        ${s.estado !== 'resuelto' ? `<button class="btn-estado btn-resuelto" onclick="cambiarEstado('${s.id}', 'resuelto')">✅ Resuelto</button>` : ''}
      </div>
    </div>
  `).join('');
}

function estadoLabel(estado) {
  return { pendiente: 'Pendiente', en_proceso: 'En Proceso', resuelto: 'Resuelto' }[estado] || estado;
}

window.cambiarEstado = (id, nuevoEstado) => {
  update(ref(db, `hosteleria/solicitudes/${id}`), { estado: nuevoEstado });
};