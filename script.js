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

  // 1. Buscar partida
  for (const l of lineas) {
    const match = l.match(/\b\d{7}\b/);
    if (match) {
      partida = match[0];
      break;
    }
  }

  // 2. Buscar lote
  for (const l of lineas) {
    const match = l.match(/\b[A-Z0-9\-]{6,}\b/);
    if (match && match[0] !== partida) {
      lote = match[0];
      break;
    }
  }

  // 3. Buscar fechas
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
    .filter((f, i, arr) => arr.indexOf(f) === i)
    .sort((a, b) => {
      const [d1, m1] = a.split('-').map(Number);
      const [d2, m2] = b.split('-').map(Number);
      return m1 !== m2 ? m1 - m2 : d1 - d2;
    });

  const fecha_siembra = fechas[0] || '';
  const fecha_carga = fechas[1] || '';

  // 4. Buscar especie desde lista
  especie = especies.find((e) => lineas.some((l) => l.includes(e))) || '';

  // 5. Buscar variedad real (línea que contiene palabras clave o típicas)
  const idxVariedad = lineas.findIndex((l) =>
    /(COGOLLO|ROMANA|ALBAHACA|VERDE|ROJA|LOLLI|ESCAROLA|ENDIVIA|A\d+)/.test(l)
  );

  if (idxVariedad >= 0) {
    variedad = lineas[idxVariedad]
      .replace(/\b\d{1,4}\b/g, '') // quitar números tipo 1200 o 1
      .trim();
  }

  // 6. Fallback: si no hay especie pero sí variedad, usamos línea anterior como especie
  if (!especie && idxVariedad > 0) {
    const candidata = lineas[idxVariedad - 1];
    if (
      candidata !== partida &&
      candidata !== lote &&
      !candidata.match(/\b\d{2}-\d{2}\b/) &&
      candidata.length > 2
    ) {
      especie = candidata;
    }
  }

  // 7. Evitar especie = variedad
  if (especie && variedad && especie === variedad) especie = '';

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
