
# 🧠 Autolectura de Lotes BabyPlant

Aplicación ligera y funcional que utiliza la cámara del dispositivo para capturar códigos numéricos de bandejas o partidas, procesarlos mediante OCR y enviarlos automáticamente a Google Sheets.

## 📸 Funcionalidad

- Captura de imagen desde cámara (dispositivo móvil o PC)
- Lectura OCR con `Tesseract.js`
- Envío automático a Google Sheets mediante Web App
- Registro con fecha y hora

## 🚀 Tecnologías usadas

- HTML5, CSS3 y JavaScript puro
- [Tesseract.js](https://github.com/naptha/tesseract.js) para OCR
- Google Apps Script (API personalizada)
- Google Sheets como base de datos en la nube
- Visual Studio Code + GitLens

## 🔗 Conexión a Google Sheets

La app está conectada mediante la siguiente Web App:

```
https://script.google.com/a/macros/babyplant.es/s/AKfycbyx-3ZXycSjeZ7NpKTsnsnoXWVA8MUTdMgldk4zFQtriPjh9ODYPkBNlvxcvr4e20-k2Q/exec
```

> Los datos se almacenan en la hoja "Lectura OCR" con fecha y número de lote.

## 🧪 Cómo usar

1. Abre el archivo `index.html` desde un navegador (preferiblemente Chrome)
2. Acepta el permiso de cámara
3. Captura la imagen del número
4. Verifica el texto OCR
5. Pulsa "Enviar" para registrarlo en la hoja

## 📁 Estructura del proyecto

```
📦 autolectura-lotes
├── index.html
├── script.js
├── style.css
├── README.md
└── logo_babyplant.png (opcional)
```

## 👨‍💼 Autor

Proyecto desarrollado por **Juan Pedro Celdrán Danta** — *I+D BabyPlant Semilleros S.L.*

---

> Este proyecto es de uso interno y está optimizado para el flujo de trabajo de trazabilidad de lotes de producción agrícola.
