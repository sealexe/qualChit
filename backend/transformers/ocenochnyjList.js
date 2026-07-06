const path = require('path')
const PizZip = require('pizzip')
const { fillTemplate } = require('../services/fillTemplate')
const { convertToDocx } = require('../services/convertToDocx')
const { buildSampleId } = require('../config/sampleId')

// Трансформер для входящего файла "Оценочный_лист_XXXXX_ФИО.rtf".
// Связан с заготовкой library/{controlMethod}/templates/Оценочный_лист.docx
// (см. backend/config/incomingFiles.js).
//
// Что делаем:
// 1. Заполняем заготовку данными формы — получаем .docx с заголовком и
//    таблицей, где плейсхолдеры {{}} заменены через docxtemplater.
// 2. Конвертируем входящий .rtf в .docx через LibreOffice.
// 3. Склеиваем: за основу берём сконвертированный входящий файл (его
//    колонтитулы — с QR-кодом и ЭЦП конкретного экзамена — не трогаем
//    вообще, так надёжнее), а всё содержимое тела документа (заголовок +
//    таблицу) заменяем на содержимое из заполненной заготовки.
//
// Ожидаемый вход: originalFile — Buffer с содержимым входящего .rtf,
//                 formData — данные формы (ФИО, метод контроля, комиссия и т.д.)
// Ожидаемый выход: Buffer готового .docx.
function transformOcenochnyjList(originalFile, formData) {
  const { fullName, controlMethod, sampleNumber, chairman, expert, techExpert } = formData

  const templatePath = path.join(
    __dirname, '..', '..', 'library', controlMethod, 'templates', 'Оценочный_лист.docx'
  )

  const filledTemplateBuffer = fillTemplate(templatePath, {
    candidate: formatShortName(fullName),
    ex_sample: buildSampleId(controlMethod, sampleNumber),
    chairman,
    expert,
    tech_expert: techExpert,
  })

  const convertedBuffer = convertToDocx(originalFile, '.rtf')

  return graftBodyContent(convertedBuffer, filledTemplateBuffer)
}

// "Сорокин Павел Игоревич" -> "Сорокин П.И."
function formatShortName(fullName) {
  const [lastName, firstName, patronymic] = fullName.trim().split(/\s+/)
  const initials = [firstName, patronymic]
    .filter(Boolean)
    .map((n) => n[0] + '.')
    .join('')
  return initials ? `${lastName} ${initials}` : lastName
}

// Читает текстовое содержимое файла из .docx (zip-архива).
function readXml(zip, filePath) {
  const file = zip.file(filePath)
  return file ? file.asText() : null
}

// Достаёт содержимое <w:body>: заголовок, таблицу — всё, что идёт до
// <w:sectPr> (в <w:sectPr> — ссылки на колонтитулы, его не трогаем).
function extractBodyContent(documentXml) {
  const bodyOpenMatch = documentXml.match(/<w:body[^>]*>/)
  const sectPrIndex = documentXml.indexOf('<w:sectPr')
  if (!bodyOpenMatch || sectPrIndex === -1) {
    throw new Error('Не удалось найти <w:body> или <w:sectPr> в документе')
  }
  const bodyContentStart = bodyOpenMatch.index + bodyOpenMatch[0].length
  return documentXml.slice(bodyContentStart, sectPrIndex)
}

// Заменяет содержимое тела документа (заголовок + таблицу) во входящем
// файле на содержимое из заполненной заготовки. <w:body> и <w:sectPr>
// (там ссылки на колонтитулы) берём из входящего файла и не трогаем.
function graftBodyContent(originalBuffer, templateBuffer) {
  const originalZip = new PizZip(originalBuffer)
  const templateZip = new PizZip(templateBuffer)

  const originalDocXml = readXml(originalZip, 'word/document.xml')
  const templateBodyContent = extractBodyContent(readXml(templateZip, 'word/document.xml'))

  const bodyOpenMatch = originalDocXml.match(/<w:body[^>]*>/)
  const sectPrIndex = originalDocXml.indexOf('<w:sectPr')
  const bodyContentStart = bodyOpenMatch.index + bodyOpenMatch[0].length

  const finalDocXml = removeBrokenDocGrid(
    originalDocXml.slice(0, bodyContentStart) +
      templateBodyContent +
      originalDocXml.slice(sectPrIndex)
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

module.exports = { transformOcenochnyjList }
