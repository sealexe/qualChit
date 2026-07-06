const path = require('path')
const PizZip = require('pizzip')
const { fillTemplate } = require('../services/fillTemplate')
const { convertToDocx } = require('../services/convertToDocx')
const { buildSampleId } = require('../config/sampleId')
const { findTextPosition } = require('../services/findTextPosition')

// Эти два текста всегда есть в конвертированном входящем файле и отмечают
// начало и конец блока, который нужно заменить содержимым заготовки.
const BLOCK_START_TEXT = '2. Практический этап:'
const BLOCK_END_TEXT = '2.2. Задания на выполнение трудовых функций(трудовых действий) в модельных условиях.'

// Трансформер для входящего файла "Программа_ФИО.rtf".
// Связан с заготовкой library/{controlMethod}/templates/Программа.docx
// (см. backend/config/incomingFiles.js).
//
// Что делаем:
// 1. Конвертируем входящий .rtf в .docx через LibreOffice.
// 2. Заполняем заготовку данными формы (в ней плейсхолдер {{ex_sample}}).
// 3. В сконвертированном файле находим блок абзацев от "2. Практический
//    этап:" до "2.2. ... в модельных условиях." (он всегда одинаковый) и
//    заменяем его на содержимое заполненной заготовки. Всё остальное —
//    заголовок в начале документа и колонтитулы — из входящего файла не
//    трогаем.
//
// Ожидаемый вход: originalFile — Buffer с содержимым входящего .rtf,
//                 formData — данные формы (ФИО, метод контроля, комиссия и т.д.)
// Ожидаемый выход: Buffer готового .docx.
function transformProgramma(originalFile, formData) {
  const { controlMethod, sampleNumber } = formData

  const templatePath = path.join(
    __dirname, '..', '..', 'library', controlMethod, 'templates', 'Программа.docx'
  )

  const filledTemplateBuffer = fillTemplate(templatePath, {
    ex_sample: buildSampleId(controlMethod, sampleNumber),
  })

  const convertedBuffer = convertToDocx(originalFile, '.rtf')

  return replacePracticalStageBlock(convertedBuffer, filledTemplateBuffer)
}

// Читает текстовое содержимое файла из .docx (zip-архива).
function readXml(zip, filePath) {
  const file = zip.file(filePath)
  return file ? file.asText() : null
}

// Достаёт содержимое <w:body> заготовки: всё, что идёт до <w:sectPr>
// (в <w:sectPr> — ссылки на колонтитулы заготовки, они нам не нужны).
function extractBodyContent(documentXml) {
  const bodyOpenMatch = documentXml.match(/<w:body[^>]*>/)
  const sectPrIndex = documentXml.indexOf('<w:sectPr')
  if (!bodyOpenMatch || sectPrIndex === -1) {
    throw new Error('Не удалось найти <w:body> или <w:sectPr> в документе')
  }
  const bodyContentStart = bodyOpenMatch.index + bodyOpenMatch[0].length
  return documentXml.slice(bodyContentStart, sectPrIndex)
}

// Ищет начало абзаца (<w:p> или <w:p ...>), в котором встречается искомый
// текст. Важно не перепутать с <w:pPr>/<w:pStyle> — они тоже начинаются с
// "<w:p", поэтому дальше требуем пробел или ">".
function findParagraphStart(documentXml, searchText) {
  const textIndex = findTextPosition(documentXml, searchText)
  if (textIndex === -1) {
    throw new Error(`Не найден текст: "${searchText}"`)
  }

  const paragraphTagRegex = /<w:p(?=[ >])[^>]*>/g
  let lastStart = -1
  let match
  while ((match = paragraphTagRegex.exec(documentXml)) && match.index < textIndex) {
    lastStart = match.index
  }
  if (lastStart === -1) {
    throw new Error(`Не найден абзац для текста: "${searchText}"`)
  }
  return lastStart
}

// Ищет конец абзаца (</w:p>), в котором встречается искомый текст.
function findParagraphEnd(documentXml, searchText) {
  const textIndex = findTextPosition(documentXml, searchText)
  if (textIndex === -1) {
    throw new Error(`Не найден текст: "${searchText}"`)
  }

  const closeIndex = documentXml.indexOf('</w:p>', textIndex)
  if (closeIndex === -1) {
    throw new Error(`Не найден конец абзаца для текста: "${searchText}"`)
  }
  return closeIndex + '</w:p>'.length
}

// Заменяет блок абзацев "2. Практический этап: ... 2.2. ... в модельных
// условиях." во входящем файле на содержимое заполненной заготовки.
function replacePracticalStageBlock(originalBuffer, templateBuffer) {
  const originalZip = new PizZip(originalBuffer)
  const templateZip = new PizZip(templateBuffer)

  const originalDocXml = readXml(originalZip, 'word/document.xml')
  const templateBodyContent = extractBodyContent(readXml(templateZip, 'word/document.xml'))

  const blockStart = findParagraphStart(originalDocXml, BLOCK_START_TEXT)
  const blockEnd = findParagraphEnd(originalDocXml, BLOCK_END_TEXT)

  const finalDocXml = removeBrokenDocGrid(
    originalDocXml.slice(0, blockStart) +
      templateBodyContent +
      originalDocXml.slice(blockEnd)
  )

  originalZip.file('word/document.xml', finalDocXml)
  return originalZip.generate({ type: 'nodebuffer' })
}

// LibreOffice при конвертации RTF→DOCX иногда записывает отрицательный
// w:charSpace как гигантское беззнаковое число (например "4294959103"
// вместо "-8193"). Значение выходит за допустимый диапазон схемы OOXML,
// и Word считает такой файл повреждённым. В заготовке этого элемента нет
// (он декоративный — сетка страницы для восточноазиатских текстов),
// поэтому просто вырезаем его.
function removeBrokenDocGrid(documentXml) {
  return documentXml.replace(/<w:docGrid[^/]*\/>/, '')
}

module.exports = { transformProgramma }
