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
        console.error('Error de cámara:', err);
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

// ✏️ Activar edición manual
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

// 🧠 Extraer datos desde texto OCR según estructura real y fallback de especie
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
  let unidades = '';
  let lote = '';
  let especie = '';
  let variedad = '';
  let fechas = [];

  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];

    // Partida
    if (!partida && /^\d{7}$/.test(l)) {
      partida = l;
      if (lineas[i + 1] && /^\d{1,5}$/.test(lineas[i + 1])) {
        unidades = lineas[i + 1];
      }
    }

    // Lote
    if (!lote && /^[A-Z0-9\-]{6,}$/.test(l) && !/^\d{7}$/.test(l)) {
      lote = l;
    }

    // Fechas
    const fechasEnLinea = [
      ...l.matchAll(/\b\d{2}[-\/]?\d{2}\b/g),
      ...l.matchAll(/\b\d{4}\b/g),
    ];
    fechas.push(
      ...fechasEnLinea.map((m) =>
        m[0].includes('-') || m[0].includes('/')
          ? m[0].replace('/', '-')
          : m[0].slice(0, 2) + '-' + m[0].slice(2)
      )
    );
  }

  fechas = fechas
    .filter((f) => /^\d{2}-\d{2}$/.test(f))
    .sort((a, b) => {
      const [d1, m1] = a.split('-').map(Number);
      const [d2, m2] = b.split('-').map(Number);
      return m1 !== m2 ? m1 - m2 : d1 - d2;
    });

  const fecha_siembra = fechas[0] || '';
  const fecha_carga = fechas[1] || '';

  // Especie: de la lista si la hay
  const especieEncontrada = especies.find((e) =>
    lineas.some((l) => l.includes(e))
  );
  if (especieEncontrada) {
    especie = especieEncontrada;
  }

  // Variedad: entre especie y lote
  let idxEspecie = lineas.findIndex((l) => l.includes(especie));
  let idxLote = lineas.findIndex((l) => l === lote);
  if (idxEspecie >= 0 && idxLote > idxEspecie) {
    variedad = lineas
      .slice(idxEspecie + 1, idxLote)
      .join(' ')
      .trim();
  }

  // Fallback si no hay especie: usar línea anterior a la variedad
  if (!especie && variedad) {
    const idxVariedad = lineas.findIndex((l) => variedad.includes(l));
    if (idxVariedad > 0) {
      especie = lineas[idxVariedad - 1];
    }
  }

  return {
    partida,
    lote,
    especie,
    variedad,
    fecha_siembra,
    fecha_carga,
  };
}

// 📤 Enviar datos a Google Sheets
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
    .catch((error) => {
      enviarBtn.disabled = false;
      enviarBtn.textContent = 'Enviar';
      console.error('Error de conexión con Google Sheets:', error);
    });
});
