const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

// Возможные пути к LibreOffice на Windows. Если после установки LibreOffice
// конвертация не находит программу — проверь актуальный путь и поправь тут.
const SOFFICE_CANDIDATES = [
  'soffice',
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
]

let cachedSofficePath = null

function findSoffice() {
  if (cachedSofficePath) return cachedSofficePath

  for (const candidate of SOFFICE_CANDIDATES) {
    try {
      execFileSync(candidate, ['--version'], { stdio: 'ignore' })
      cachedSofficePath = candidate
      return candidate
    } catch {
      // пробуем следующий путь
    }
  }
  throw new Error('LibreOffice (soffice) не найден. Проверь путь в backend/services/convertToDocx.js')
}

// Конвертирует буфер файла (например .rtf) в .docx через LibreOffice headless.
// extension — расширение исходного файла с точкой, например '.rtf'.
// Возвращает Buffer готового .docx.
function convertToDocx(fileBuffer, extension) {
  const soffice = findSoffice()
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qualchit-convert-'))

  try {
    const inputPath = path.join(tempDir, `source${extension}`)
    fs.writeFileSync(inputPath, fileBuffer)

    execFileSync(
      soffice,
      ['--headless', '--convert-to', 'docx', '--outdir', tempDir, inputPath],
      { stdio: 'ignore' },
    )

    const outputPath = path.join(tempDir, 'source.docx')
    if (!fs.existsSync(outputPath)) {
      throw new Error(`LibreOffice не создал файл: ${outputPath}`)
    }
    return fs.readFileSync(outputPath)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

module.exports = { convertToDocx }
