const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const capturarBtn = document.getElementById('capturar');
const resultado = document.getElementById('resultado');
const enviarBtn = document.getElementById('enviar');
const editarBtn = document.getElementById('editar');

// 🟢 Activar cámara trasera
navigator.mediaDevices
  .getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
  .then((stream) => (video.srcObject = stream))
  .catch(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => (video.srcObject = stream))
      .catch((err) => {
        alert('❌ No se pudo acceder a ninguna cámara');
        console.error('Error de cámara:', err);
      });
  });

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

// ✏️ Editar el texto OCR
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

// 🧠 Función inteligente de extracción OCR
function extraerDatosOCR(texto) {
  const limpiar = (str) =>
    str
      .toUpperCase()
      .replace(/[^A-Z0-9ÁÉÍÓÚÜÑ\s\-\/]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const lineas = texto.split(/\r?\n/).map(limpiar).filter(Boolean);

  const especiesReales = [
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

  // Variantes para tolerar errores de OCR
  const variantesEspecie = especiesReales.flatMap((e) => {
    const base = e.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return [e, base, base.replace(/C|K/g, 'C'), base.replace(/G/g, 'C')];
  });

  let partida = '';
  let lote = '';
  let especie = '';
  let fechasRaw = [];

  for (const linea of lineas) {
    if (!partida && /^\d{7}$/.test(linea)) {
      partida = linea;
      continue;
    }
    if (!lote && /^[A-Z0-9\-]{6,}$/.test(linea) && !/^\d{7}$/.test(linea)) {
      lote = linea;
      continue;
    }
    if (!especie) {
      const found = variantesEspecie.find((esp) => linea.includes(esp));
      if (found) especie = found;
    }
    // Buscamos fechas ddmm, dd-mm o dd/mm
    const bloque = [...linea.matchAll(/\b\d{2}[-\/]?\d{2}\b/g)].map(
      (m) => m[0]
    );
    fechasRaw.push(...bloque);
  }

  // Normalizar y ordenar fechas
  const fechas = fechasRaw
    .map((f) =>
      f.length === 4 ? `${f.slice(0, 2)}-${f.slice(2)}` : f.replace('/', '-')
    )
    .filter((f) => /^\d{2}-\d{2}$/.test(f))
    .sort((a, b) => {
      const [d1, m1] = a.split('-').map(Number);
      const [d2, m2] = b.split('-').map(Number);
      return m1 !== m2 ? m1 - m2 : d1 - d2;
    });

  const fecha_siembra = fechas[0] || '';
  const fecha_carga = fechas[1] || '';

  // Extraer variedad: líneas tras la especie hasta lote o fechas
  const idxEsp = lineas.findIndex((l) =>
    especiesReales.some((e) => l.includes(e))
  );
  const candidatas = idxEsp >= 0 ? lineas.slice(idxEsp + 1) : lineas;
  const variedad =
    candidatas.find(
      (l) =>
        l.length > 3 &&
        l !== partida &&
        l !== lote &&
        l !== fecha_siembra &&
        l !== fecha_carga
    ) || '';

  return { partida, lote, especie, variedad, fecha_siembra, fecha_carga };
}

// 📤 Enviar datos a Google Sheets vía GET
enviarBtn.addEventListener('click', () => {
  const texto = resultado.value;
  resultado.setAttribute('readonly', true);
  editarBtn.textContent = '✏️ Editar manualmente';

  if (!texto) return alert('❗ No hay texto OCR para enviar');

  const datos = extraerDatosOCR(texto);
  const params = new URLSearchParams(datos).toString();

  enviarBtn.disabled = true;
  enviarBtn.textContent = 'Enviando...';

  fetch(
    `https://script.google.com/macros/s/AKfycbwdAaj3-gRgFRbrzo1Oe3Vxo4fa4kXyr_8xzcpQNmlmHamjCmc9u_wJboWCz-W-9J4B/exec?${params}`
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
      console.error('Conexión fallida:', err);
      alert('❌ Error de conexión con Google Sheets');
    });
});
