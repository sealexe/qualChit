const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

// Возможные пути к LibreOffice. Если после установки LibreOffice
// конвертация не находит программу — проверь актуальный путь и поправь тут.
// Сюда же можно добавить путь к портативной версии (LibreOffice Portable).
const SOFFICE_CANDIDATES = [
  'soffice',
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
  '/Applications/LibreOffice.app/Contents/MacOS/soffice', // macOS
]

let cachedSofficePath = null

// Ищет LibreOffice. Возвращает путь к soffice или null, если не найден
// (тогда попробуем конвертировать через Microsoft Word).
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
  return null
}

// Конвертация через LibreOffice headless.
function convertViaSoffice(soffice, inputPath, tempDir) {
  execFileSync(
    soffice,
    ['--headless', '--convert-to', 'docx', '--outdir', tempDir, inputPath],
    { stdio: 'ignore' },
  )
}

// Конвертация через Microsoft Word (COM-автоматизация из PowerShell).
// Используется, когда LibreOffice не установлен, но есть Word.
// Работает только на Windows.
// 16 = wdFormatDocumentDefault, то есть обычный .docx.
function convertViaWord(inputPath, outputPath) {
  const script = `
    $ErrorActionPreference = 'Stop'
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    try {
      $doc = $word.Documents.Open('${inputPath}', $false, $true)
      $doc.SaveAs2('${outputPath}', 16)
      $doc.Close(0)
    } finally {
      $word.Quit()
    }
  `
  execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { stdio: 'ignore' },
  )
}

// Конвертирует буфер файла (например .rtf) в .docx.
// Сначала пробует LibreOffice, если его нет — Microsoft Word.
// extension — расширение исходного файла с точкой, например '.rtf'.
// Возвращает Buffer готового .docx.
function convertToDocx(fileBuffer, extension) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qualchit-convert-'))

  try {
    const inputPath = path.join(tempDir, `source${extension}`)
    const outputPath = path.join(tempDir, 'source.docx')
    fs.writeFileSync(inputPath, fileBuffer)

    const soffice = findSoffice()
    if (soffice) {
      convertViaSoffice(soffice, inputPath, tempDir)
    } else {
      try {
        convertViaWord(inputPath, outputPath)
      } catch {
        throw new Error(
          'Не найден ни LibreOffice, ни Microsoft Word — конвертировать файл нечем. ' +
            'Проверь пути в backend/services/convertToDocx.js',
        )
      }
    }

    if (!fs.existsSync(outputPath)) {
      throw new Error(`Конвертация не создала файл: ${outputPath}`)
    }
    return fs.readFileSync(outputPath)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
}

module.exports = { convertToDocx, convertViaWord }
