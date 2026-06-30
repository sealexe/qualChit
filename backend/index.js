const express = require('express')
const cors = require('cors')
const multer = require('multer')

const app = express()
const PORT = process.env.PORT || 3001

// Файлы пока храним в памяти (multer memoryStorage).
// Когда дойдём до реальной загрузки — решим, нужен ли диск.
const upload = multer({ storage: multer.memoryStorage() })

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'qualChit backend работает' })
})

// Заглушка роута для будущей загрузки файлов (multipart/form-data).
// Поле формы для файлов называем "files" — можно поменять позже.
app.post('/api/upload', upload.array('files'), (req, res) => {
  res.json({
    received: req.files?.length || 0,
    body: req.body,
  })
})

app.listen(PORT, () => {
  console.log(`Backend запущен: http://localhost:${PORT}`)
})
