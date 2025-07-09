const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const capturarBtn = document.getElementById('capturar');
const resultado = document.getElementById('resultado');
const enviarBtn = document.getElementById('enviar');

// 📷 Activar cámara del dispositivo
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(err => {
    alert('No se pudo acceder a la cámara');
    console.error('Error de cámara:', err);
  });

// 📸 Capturar imagen y procesar con OCR
capturarBtn.addEventListener('click', () => {
  capturarBtn.disabled = true;
  capturarBtn.textContent = 'Procesando...';

  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  Tesseract.recognize(canvas, 'eng', {
    logger: m => console.log(m)
  }).then(({ data: { text } }) => {
    resultado.value = text.trim();
  }).catch(err => {
    resultado.value = 'Error al procesar OCR';
    console.error(err);
  }).finally(() => {
    capturarBtn.disabled = false;
    capturarBtn.textContent = 'Capturar';
  });
});

// 📤 Enviar el texto a Google Sheets
enviarBtn.addEventListener('click', () => {
  const lote = resultado.value;
  if (!lote) {
    alert('❗ No hay ningún texto OCR para enviar');
    return;
  }

  enviarBtn.disabled = true;
  enviarBtn.textContent = 'Enviando...';

  fetch('https://script.google.com/a/macros/babyplant.es/s/AKfycbyx-3ZXycSjeZ7NpKTsnsnoXWVA8MUTdMgldk4zFQtriPjh9ODYPkBNlvxcvr4e20-k2Q/exec', {
    method: 'POST',
    body: JSON.stringify({ lote }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
    .then(response => {
      if (response.ok) {
        alert('✅ Lote enviado correctamente a Google Sheets');
        resultado.value = '';
      } else {
        alert('❌ Error al enviar el lote');
      }
    })
    .catch(error => {
      console.error('Error de conexión con Google Sheets:', error);
    })
    .finally(() => {
      enviarBtn.disabled = false;
      enviarBtn.textContent = 'Enviar';
    });
});

