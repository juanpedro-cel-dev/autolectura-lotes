const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const capturarBtn = document.getElementById('capturar');
const resultado = document.getElementById('resultado');
const enviarBtn = document.getElementById('enviar');
const editarBtn = document.getElementById('editar');

// 📷 Activar cámara TRASERA (con fallback a predeterminada)
navigator.mediaDevices
  .getUserMedia({
    video: {
      facingMode: { ideal: 'environment' }, // fuerza cámara trasera
    },
  })
  .then((stream) => {
    video.srcObject = stream;
  })
  .catch((err) => {
    console.warn(
      'No se pudo activar la cámara trasera, usando la predeterminada.'
    );
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        video.srcObject = stream;
      })
      .catch((err) => {
        alert('❌ No se pudo acceder a ninguna cámara');
        console.error('Error de cámara:', err);
      });
  });

// 📸 Capturar imagen y procesar con OCR
capturarBtn.addEventListener('click', () => {
  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

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

// Boton de editado del texto capturado
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

// 📤 Enviar el texto a Google Sheets (usando método GET para evitar CORS)
enviarBtn.addEventListener('click', () => {
  const lote = resultado.value;
  resultado.setAttribute('readonly', true);
  editarBtn.textContent = '✏️ Editar manualmente';

  if (!lote) {
    alert('❗ No hay ningún texto OCR para enviar');
    return;
  }

  enviarBtn.disabled = true;
  enviarBtn.textContent = 'Enviando...';

  const url = `https://script.google.com/macros/s/AKfycbwdAaj3-gRgFRbrzo1Oe3Vxo4fa4kXyr_8xzcpQNmlmHamjCmc9u_wJboWCz-W-9J4B/exec?lote=${encodeURIComponent(
    lote
  )}`;

  fetch(url)
    .then((response) => {
      enviarBtn.disabled = false;
      enviarBtn.textContent = 'Enviar';

      if (response.ok) {
        alert('✅ Lote enviado correctamente a Google Sheets');
        resultado.value = '';
      } else {
        alert('❌ Error al enviar el lote');
      }
    })
    .catch((error) => {
      enviarBtn.disabled = false;
      enviarBtn.textContent = 'Enviar';
      console.error('Error de conexión con Google Sheets:', error);
    });
});
