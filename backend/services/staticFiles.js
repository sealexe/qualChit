const fs = require('fs')
const path = require('path')

// Возвращает статичные файлы для архива — те, что не нужно трансформировать,
// а просто положить "как есть". Путь: library/{controlMethod}/staticFiles/{sampleNumber}/,
// а если отмечен чек-бокс СТНГ — library/{controlMethod}/СТНГ/staticFiles/{sampleNumber}/.
// Каждый элемент результата: { fileName, buffer }.
function getStaticFiles(controlMethod, sampleNumber, isStng) {
  const dirPath = isStng
    ? path.join(
        __dirname, '..', '..', 'library', controlMethod, 'СТНГ', 'staticFiles', String(sampleNumber)
      )
    : path.join(
        __dirname, '..', '..', 'library', controlMethod, 'staticFiles', String(sampleNumber)
      )

  if (!fs.existsSync(dirPath)) {
    throw new Error(`Не найдена папка со статичными файлами: ${dirPath}`)
  }

  return fs.readdirSync(dirPath).map((fileName) => ({
    fileName,
    buffer: fs.readFileSync(path.join(dirPath, fileName)),
  }))
}

module.exports = { getStaticFiles }
