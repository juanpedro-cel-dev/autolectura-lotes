const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const capturarBtn = document.getElementById('capturar');
const resultado = document.getElementById('resultado');
const enviarBtn = document.getElementById('enviar');
const editarBtn = document.getElementById('editar');

// 🟢 Activar cámara trasera o predeterminada
navigator.mediaDevices
  .getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
  .then((stream) => (video.srcObject = stream))
  .catch(() =>
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => (video.srcObject = stream))
      .catch((err) => {
        alert('❌ No se pudo acceder a ninguna cámara');
        console.error(err);
      })
  );

// 📸 Capturar imagen y hacer OCR
capturarBtn.addEventListener('click', () => {
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  capturarBtn.disabled = true;
  capturarBtn.textContent = 'Procesando...';

  Tesseract.recognize(canvas, 'eng', {
    logger: (m) => console.log(m),
  })
    .then(({ data: { text } }) => {
      resultado.value = text.trim();
      capturarBtn.disabled = false;
      capturarBtn.textContent = 'Capturar';
    })
    .catch((err) => {
      resultado.value = 'Error al procesar OCR';
      console.error(err);
      capturarBtn.disabled = false;
      capturarBtn.textContent = 'Capturar';
    });
});

// ✏️ Editar manualmente el resultado
editarBtn.addEventListener('click', () => {
  if (resultado.hasAttribute('readonly')) {
    resultado.removeAttribute('readonly');
    resultado.focus();
    editarBtn.textContent = '✅ Bloquear edición';
  } else {
    resultado.setAttribute('readonly', true);
    editarBtn.textContent = '✏️ Editar manualmente';
  }
});

// 🧠 Función inteligente para extraer los datos
function extraerDatosOCR(texto) {
  const limpiar = (str) =>
    str
      .toUpperCase()
      .replace(/[^A-Z0-9ÁÉÍÓÚÜÑ\s\-\/]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const lineas = texto.split(/\r?\n/).map(limpiar).filter(Boolean);

  const especies = [
    'LECHUGA',
    'AROMATICAS Y HOJAS',
    'ACELGA',
    'ESPINACA',
    'CANONIGO',
    'RUCULA',
    'MOSTAZA',
    'BORRAJA',
    'ESCAROLA',
    'ENDIVIA',
    'TATSOI',
    'PAK CHOI',
  ];

  let partida = '';
  let lote = '';
  let especie = '';
  let variedad = '';
  let fechas = [];

  // Buscar partida (7 dígitos) aunque esté incrustada
  for (const l of lineas) {
    const match = l.match(/\b\d{7}\b/);
    if (match) {
      partida = match[0];
      break;
    }
  }

  // Buscar lote (alfanumérico >=6 distinto de partida)
  for (const l of lineas) {
    const match = l.match(/\b[A-Z0-9\-]{6,}\b/);
    if (match && match[0] !== partida) {
      lote = match[0];
      break;
    }
  }

  // Buscar fechas (ddmm o dd-mm o dd/mm)
  for (const l of lineas) {
    const match = [
      ...l.matchAll(/\b\d{2}[-\/]?\d{2}\b/g),
      ...l.matchAll(/\b\d{4}\b/g),
    ];
    for (const m of match) {
      const raw = m[0].replace('/', '-');
      const normal =
        raw.length === 4 ? raw.slice(0, 2) + '-' + raw.slice(2) : raw;
      fechas.push(normal);
    }
  }

  fechas = fechas
    .filter((f) => /^\d{2}-\d{2}$/.test(f))
    .filter((f, i, arr) => arr.indexOf(f) === i) // quitar duplicados
    .sort((a, b) => {
      const [d1, m1] = a.split('-').map(Number);
      const [d2, m2] = b.split('-').map(Number);
      return m1 !== m2 ? m1 - m2 : d1 - d2;
    });

  const fecha_siembra = fechas[0] || '';
  const fecha_carga = fechas[1] || '';

  // Buscar especie en lista
  especie = especies.find((e) => lineas.some((l) => l.includes(e))) || '';

  // Buscar variedad (línea que no sea partida/lote/especie/fecha)
  const reservadas = [partida, lote, especie, fecha_siembra, fecha_carga];
  const posiblesVariedades = lineas.filter(
    (l) => !reservadas.includes(l) && !/^\d{1,4}$/.test(l)
  );

  if (posiblesVariedades.length > 0) {
    variedad = posiblesVariedades[0]
      .replace(/\b\d{1,4}\b/g, '') // quitar números sueltos
      .trim();
  }

  // Si especie == variedad, anulamos especie
  if (especie && especie === variedad) especie = '';

  return {
    partida,
    lote,
    especie,
    variedad,
    fecha_siembra,
    fecha_carga,
  };
}

// 📤 Enviar a Google Sheets
enviarBtn.addEventListener('click', () => {
  const texto = resultado.value;
  resultado.setAttribute('readonly', true);
  editarBtn.textContent = '✏️ Editar manualmente';

  if (!texto) {
    alert('❗ No hay texto OCR para enviar');
    return;
  }

  const datos = extraerDatosOCR(texto);
  const params = new URLSearchParams(datos).toString();

  enviarBtn.disabled = true;
  enviarBtn.textContent = 'Enviando...';

  fetch(
    'https://script.google.com/macros/s/AKfycbwdAaj3-gRgFRbrzo1Oe3Vxo4fa4kXyr_8xzcpQNmlmHamjCmc9u_wJboWCz-W-9J4B/exec?' +
      params
  )
    .then((response) => {
      enviarBtn.disabled = false;
      enviarBtn.textContent = 'Enviar';
      if (response.ok) {
        alert('✅ Datos enviados correctamente');
        resultado.value = '';
      } else {
        alert('❌ Error al enviar los datos');
      }
    })
    .catch((err) => {
      enviarBtn.disabled = false;
      enviarBtn.textContent = 'Enviar';
      console.error('Error de conexión con Google Sheets:', err);
    });
});
