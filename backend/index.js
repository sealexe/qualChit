const express = require('express')
const cors = require('cors')
const multer = require('multer')
const JSZip = require('jszip')
const { transformZadanie } = require('./transformers/zadanie')
const { transformSpecifikaciya } = require('./transformers/specifikaciya')

const app = express()
const PORT = process.env.PORT || 3001

const upload = multer({ storage: multer.memoryStorage() })

app.use(cors({ exposedHeaders: ['Content-Disposition'] }))
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'qualChit backend работает' })
})

// Генерирует архив с "Заданием" и "Спецификацией" по данным формы.
app.post('/api/generate', async (req, res) => {
  try {
    const formData = req.body

    const { fullName, controlMethod, sampleNumber, examDate } = formData

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

    const zadanieName = `Задание ОК-${controlMethod}-${sampleNumber}.docx`
    const specifikaciyaName = `Спецификация_заданий_${lastName}_${firstName}_${patronymic}_практика.docx`

    const zip = new JSZip()
    zip.file(zadanieName, zadanieBuffer)
    zip.file(specifikaciyaName, specifikaciyaBuffer)

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

app.listen(PORT, () => {
  console.log(`Backend запущен: http://localhost:${PORT}`)
})
