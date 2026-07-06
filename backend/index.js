const path = require('path')
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const JSZip = require('jszip')
const { transformZadanie } = require('./transformers/zadanie')
const { transformSpecifikaciya } = require('./transformers/specifikaciya')
const { findIncomingFileType } = require('./config/incomingFiles')
const { buildSampleId } = require('./config/sampleId')
const { getStaticFiles } = require('./services/staticFiles')

const app = express()
const PORT = process.env.PORT || 3001

const upload = multer({ storage: multer.memoryStorage() })

app.use(cors({ exposedHeaders: ['Content-Disposition'] }))
app.use(express.json())

// Отдаём собранный фронтенд (папка frontend/dist), если он есть.
// Собрать его: cd frontend && npm run build
app.use(express.static(path.join(__dirname, '../frontend/dist')))

app.get('/', (req, res) => {
  res.json({ message: 'qualChit backend работает' })
})

// multer/busboy декодируют имя файла из multipart-запроса как latin1,
// поэтому кириллица в оригинальном имени приходит "битой" — перекодируем обратно.
function fixFileNameEncoding(originalName) {
  return Buffer.from(originalName, 'latin1').toString('utf8')
}

// Генерирует архив с "Заданием", "Спецификацией" и трансформированными
// файлами, загруженными в drag&drop.
app.post('/api/generate', upload.array('files'), async (req, res) => {
  try {
    const formData = req.body

    const { fullName, controlMethod, sampleNumber, examDate, stng } = formData
    const isStng = stng === 'true' || stng === true

    // Разбиваем ФИО на части для имён файлов и архива
    const nameParts = fullName.trim().split(/\s+/)
    const lastName = nameParts[0] || ''
    const firstName = nameParts[1] || ''
    const patronymic = nameParts[2] || ''

    // Инициалы для имени архива: "Иванов И.И."
    const initials = [firstName, patronymic]
      .filter(Boolean)
      .map((n) => n[0] + '.')
      .join('')
    const archiveName = `${lastName} ${initials} ${controlMethod}.zip`

    // Дата из формата ГГГГ-ММ-ДД в ДД.ММ.ГГГГ
    const [year, month, day] = examDate.split('-')
    const formattedDate = `${day}.${month}.${year}`

    const zadanieBuffer = transformZadanie({ ...formData, examDate: formattedDate })
    const specifikaciyaBuffer = transformSpecifikaciya({ ...formData, examDate: formattedDate })

    const zadanieName = `Задание ${buildSampleId(controlMethod, sampleNumber)}.docx`
    const specifikaciyaName = `Спецификация_заданий_${lastName}_${firstName}_${patronymic}_практика.docx`

    const zip = new JSZip()
    zip.file(zadanieName, zadanieBuffer)
    zip.file(specifikaciyaName, specifikaciyaBuffer)

    // Файлы, загруженные в drag&drop — каждый обрабатывается своим
    // трансформером (см. backend/config/incomingFiles.js). Итоговый файл
    // получает то же имя, с которым пришёл, но с расширением .docx.
    for (const file of req.files || []) {
      const originalName = fixFileNameEncoding(file.originalname)
      const fileType = findIncomingFileType(originalName)
      if (!fileType) {
        throw new Error(`Неизвестный тип файла: ${originalName}`)
      }

      const resultBuffer = fileType.transform(file.buffer, { ...formData, examDate: formattedDate })
      const outputName = path.basename(originalName, path.extname(originalName)) + '.docx'
      zip.file(outputName, resultBuffer)
    }

    // Статичные файлы, которые кладутся в архив без изменений
    // (см. backend/services/staticFiles.js).
    const staticFiles = getStaticFiles(controlMethod, sampleNumber, isStng)
    for (const { fileName, buffer } of staticFiles) {
      zip.file(fileName, buffer)
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    // encodeURIComponent нужен для кириллицы в заголовке Content-Disposition
    const encodedName = encodeURIComponent(archiveName)
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
    })
    res.send(zipBuffer)
  } catch (err) {
    // docxtemplater упаковывает несколько ошибок в err.properties.errors
    if (err.properties && err.properties.errors) {
      const details = err.properties.errors.map((e) => e.properties?.explanation || e.message)
      console.error('Ошибки шаблона:', details)
      res.status(500).json({ error: details.join(' | ') })
    } else {
      console.error('Ошибка генерации:', err)
      res.status(500).json({ error: err.message })
    }
  }
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Backend запущен: http://127.0.0.1:${PORT}`)
})
