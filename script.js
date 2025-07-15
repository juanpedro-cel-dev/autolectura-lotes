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
  const partida = texto.match(/\b\d{7}\b/)?.[0] || '';
  const lote = texto.match(/\b([A-Z0-9\-]{6,10})\b/g)?.pop() || '';
  const fechas = [...texto.matchAll(/\b\d{2}-\d{2}\b/g)].map((f) => f[0]);
  const fecha_siembra = fechas[0] || '';
  const fecha_carga = fechas[1] || '';
  const especie =
    texto.match(/\b(LECHUGA|AROM[AÁ]TICAS Y HOJAS)\b/i)?.[0].toUpperCase() ||
    '';
  const variedad =
    texto
      .replace(/\s+/g, ' ')
      .match(
        /(?:LECHUGA|AROM[AÁ]TICAS Y HOJAS)\s+([\w\s\-]+?)\s+\b[A-Z0-9\-]{6,10}\b/i
      )?.[1]
      ?.trim()
      ?.toUpperCase() || '';

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
