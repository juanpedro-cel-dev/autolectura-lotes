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
  const t = texto
    .toUpperCase()
    .replace(/[^A-Z0-9ÁÉÍÓÚÜÑ\s\-\/]/g, ' ') // borrar todo lo raro
    .replace(/\s+/g, ' ')
    .trim();

  // 1) Partida: primer grupo de 7 dígitos
  const partida = (t.match(/\b\d{7}\b/) || [])[0] || '';

  // 2) Lote: primer bloque ≥6 caracteres alfanum/guión distinto de la partida
  const candidatosLote = t.match(/\b[A-Z0-9\-]{6,}\b/g) || [];
  const lote = candidatosLote.find((x) => x !== partida) || '';

  // 3) Especie: a partir de la lista real de BabyPlant
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
  const especie = especies.find((e) => t.includes(e)) || '';

  // 4) Variedad: lo que queda entre especie y lote
  let variedad = '';
  if (especie && lote) {
    const rx = new RegExp(especie + '\\s+([A-Z0-9\\s\\-]+?)\\s+' + lote);
    const m = t.match(rx);
    if (m) variedad = m[1].trim();
  }
  // Si no hubo match, como fallback toma el bloque de 2–3 palabras más largo
  if (!variedad) {
    const bloques =
      t
        .split(lote)[0]
        .split(especie)[1]
        ?.trim()
        .split(' ')
        .filter((w) => w.length > 3) || [];
    variedad = bloques.slice(0, 3).join(' ');
  }

  // 5) Fechas: busca dd-mm, dd/mm o ddmm
  const rawFechas = [
    ...(t.match(/\b\d{2}[-\/]\d{2}\b/g) || []),
    ...(t.match(/\b\d{4}\b/g) || []),
  ];
  const fechas = rawFechas
    .map((f) =>
      f.includes('-') || f.includes('/')
        ? f.replace('/', '-')
        : f.slice(0, 2) + '-' + f.slice(2)
    )
    .filter((f) => /^\d{2}-\d{2}$/.test(f))
    .sort((a, b) => {
      const [d1, m1] = a.split('-').map(Number),
        [d2, m2] = b.split('-').map(Number);
      return m1 !== m2 ? m1 - m2 : d1 - d2;
    });

  const fecha_siembra = fechas[0] || '';
  const fecha_carga = fechas[1] || '';

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
