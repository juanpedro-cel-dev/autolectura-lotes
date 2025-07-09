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
  });
});

// 📤 Enviar el texto a Google Sheets (pendiente de integrar)
enviarBtn.addEventListener('click', () => {
  alert('Esta función enviará el texto a Google Sheets en la siguiente fase.');
});
