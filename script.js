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

// ✏️ Botón para editar el resultado OCR
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

// 🧠 Función para extraer datos clave del texto OCR
function extraerDatosOCR(texto) {
  const lineas = texto
    .toUpperCase()
    .replace(/[^\w\s\-\/]/g, '') // quitar símbolos raros
    .split(/\n|\r/)
    .map((linea) => linea.trim())
    .filter(Boolean);

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

  for (const linea of lineas) {
    if (!partida && /^\d{7}$/.test(linea)) partida = linea;
    if (!lote && /^[A-Z0-9\-]{6,}$/.test(linea) && !/^\d{7}$/.test(linea))
      lote = linea;
    if (!especie) {
      especie = especies.find((e) => linea.includes(e)) || '';
    }
    if (/\b\d{2}[-\/]\d{2}\b/.test(linea)) {
      fechas.push(linea.match(/\d{2}[-\/]\d{2}/)[0]);
    }
  }

  // Ordenar fechas para que la más antigua sea siembra
  fechas = fechas.sort((a, b) => {
    const [d1, m1] = a.split('-').map(Number);
    const [d2, m2] = b.split('-').map(Number);
    return m1 !== m2 ? m1 - m2 : d1 - d2;
  });

  const fecha_siembra = fechas[0] || '';
  const fecha_carga = fechas[1] || '';

  // Sacar variedad (lo que está entre especie y lote/fechas)
  const especieIndex = lineas.findIndex((l) => l.includes(especie));
  const corte = lineas
    .slice(especieIndex + 1)
    .filter(
      (l) =>
        !lote.includes(l) &&
        !l.includes(fecha_siembra) &&
        !l.includes(fecha_carga)
    );
  variedad = corte.slice(0, 2).join(' ').trim();

  return {
    partida,
    lote,
    especie,
    variedad,
    fecha_siembra,
    fecha_carga,
  };
}

// 📤 Enviar los datos extraídos a Google Sheets
enviarBtn.addEventListener('click', () => {
  const texto = resultado.value;
  resultado.setAttribute('readonly', true);
  editarBtn.textContent = '✏️ Editar manualmente';

  if (!texto) {
    alert('❗ No hay ningún texto OCR para enviar');
    return;
  }

  const datos = extraerDatosOCR(texto);

  enviarBtn.disabled = true;
  enviarBtn.textContent = 'Enviando...';

  const params = new URLSearchParams(datos).toString();

  fetch(
    `https://script.google.com/macros/s/AKfycbwdAaj3-gRgFRbrzo1Oe3Vxo4fa4kXyr_8xzcpQNmlmHamjCmc9u_wJboWCz-W-9J4B/exec?${params}`
  )
    .then((response) => {
      enviarBtn.disabled = false;
      enviarBtn.textContent = 'Enviar';

      if (response.ok) {
        alert('✅ Datos enviados correctamente a Google Sheets');
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
