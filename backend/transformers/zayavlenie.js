const path = require('path')
const PizZip = require('pizzip')
const { fillTemplate } = require('../services/fillTemplate')
const { convertToDocx } = require('../services/convertToDocx')

// Трансформер для входящего файла "Заявление_ЦОК-XXX-XXXXX.rtf".
// Связан с заготовкой library/{controlMethod}/templates/Заявление.docx
// (см. backend/config/incomingFiles.js).
//
// Что делаем:
// 1. Конвертируем входящий .rtf в .docx через LibreOffice.
// 2. Заполняем заготовку данными формы (в ней плейсхолдер {{address}}).
// 3. В сконвертированном файле:
//    а) таблицу в самом начале документа (реквизиты ЦОК) заменяем на
//       таблицу из заготовки;
//    б) абзац "Свидетельство о квалификации или заключение..." и
//       следующий за ним абзац с адресом заменяем на аналогичные два
//       абзаца из заполненной заготовки (там уже подставлен адрес);
//    в) убираем пустой абзац перед фразой "Я уведомлен(а) и понимаю" и
//       немного уменьшаем нижнее поле страницы — раньше это делали
//       вручную в Word, чтобы таблица с подписью в конце уместилась на
//       первой странице (без этого готовое заявление занимает 2 страницы).
// Всё остальное во входящем файле (текст заявления, подпись, колонтитулы)
// не трогаем.
//
// Ожидаемый вход: originalFile — Buffer с содержимым входящего .rtf,
//                 formData — данные формы (ФИО, метод контроля, адрес и т.д.)
// Ожидаемый выход: Buffer готового .docx.

// С этой фразы всегда начинается абзац, который нужно заменить
// (а вместе с ним — и следующий за ним абзац с адресом).
const ADDRESS_PARAGRAPH_START_TEXT = 'Свидетельство о квалификации или заключение'

// Этой фразой всегда начинается абзац после пустой "строки-разделителя",
// которую нужно убрать, чтобы освободить одну строку места на странице.
const NOTICE_PARAGRAPH_START_TEXT = 'Я уведомлен(а) и понимаю'

// Нижнее поле страницы в твипах (1440 твипов = 1 дюйм). Подобрано так,
// чтобы с запасом хватало места даже при длинном адресе в одну-две строки.
const BOTTOM_MARGIN_TWIPS = 200

function transformZayavlenie(originalFile, formData) {
  const { controlMethod, address } = formData

  const templatePath = path.join(
    __dirname, '..', '..', 'library', controlMethod, 'templates', 'Заявление.docx'
  )

  const filledTemplateBuffer = fillTemplate(templatePath, { address })
  const convertedBuffer = convertToDocx(originalFile, '.rtf')

  return replaceTableAndAddress(convertedBuffer, filledTemplateBuffer)
}

// Читает текстовое содержимое файла из .docx (zip-архива).
function readXml(zip, filePath) {
  const file = zip.file(filePath)
  return file ? file.asText() : null
}

// Достаёт XML первой таблицы в документе — { xml, start, end }.
// И во входящем файле, и в заготовке нужная таблица всего одна и стоит
// в самом начале документа.
function extractFirstTable(documentXml) {
  const match = documentXml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/)
  if (!match) {
    throw new Error('Не найдена таблица в документе')
  }
  return { xml: match[0], start: match.index, end: match.index + match[0].length }
}

// Ищет начало абзаца (<w:p> или <w:p ...>), в котором встречается искомый
// текст. Важно не перепутать с <w:pPr>/<w:pStyle> — они тоже начинаются с
// "<w:p", поэтому дальше требуем пробел или ">".
function findParagraphStart(documentXml, searchText) {
  const textIndex = documentXml.indexOf(searchText)
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

// Ищет конец абзаца, СЛЕДУЮЩЕГО за тем, в котором встречается искомый
// текст (т.е. пропускаем закрытие первого абзаца и ищем закрытие второго).
function findNextParagraphEnd(documentXml, searchText) {
  const textIndex = documentXml.indexOf(searchText)
  if (textIndex === -1) {
    throw new Error(`Не найден текст: "${searchText}"`)
  }

  const firstParaEnd = documentXml.indexOf('</w:p>', textIndex)
  if (firstParaEnd === -1) {
    throw new Error(`Не найден конец абзаца для текста: "${searchText}"`)
  }

  const secondParaEnd = documentXml.indexOf('</w:p>', firstParaEnd + '</w:p>'.length)
  if (secondParaEnd === -1) {
    throw new Error(`Не найден конец следующего абзаца для текста: "${searchText}"`)
  }
  return secondParaEnd + '</w:p>'.length
}

// Достаёт из заготовки два абзаца с адресом: от фразы
// ADDRESS_PARAGRAPH_START_TEXT и до конца тела документа (в заготовке
// после этих абзацев больше ничего нет, сразу идёт <w:sectPr>).
function extractAddressParagraphs(templateXml) {
  const start = findParagraphStart(templateXml, ADDRESS_PARAGRAPH_START_TEXT)
  const sectPrIndex = templateXml.indexOf('<w:sectPr')
  if (sectPrIndex === -1) {
    throw new Error('Не найден <w:sectPr> в заготовке')
  }
  return templateXml.slice(start, sectPrIndex)
}

function replaceTableAndAddress(originalBuffer, templateBuffer) {
  const originalZip = new PizZip(originalBuffer)
  const templateZip = new PizZip(templateBuffer)

  const templateXml = readXml(templateZip, 'word/document.xml')
  let documentXml = readXml(originalZip, 'word/document.xml')

  // а) таблица в начале документа
  const originalTable = extractFirstTable(documentXml)
  const templateTable = extractFirstTable(templateXml)
  documentXml =
    documentXml.slice(0, originalTable.start) +
    templateTable.xml +
    documentXml.slice(originalTable.end)

  // б) абзац "Свидетельство о квалификации..." + абзац с адресом
  const addressBlockStart = findParagraphStart(documentXml, ADDRESS_PARAGRAPH_START_TEXT)
  const addressBlockEnd = findNextParagraphEnd(documentXml, ADDRESS_PARAGRAPH_START_TEXT)
  const templateAddressParagraphs = extractAddressParagraphs(templateXml)
  documentXml =
    documentXml.slice(0, addressBlockStart) +
    templateAddressParagraphs +
    documentXml.slice(addressBlockEnd)

  // в) страница целиком должна уместиться на одном листе
  documentXml = removeParagraphBeforeNotice(documentXml)
  documentXml = shrinkBottomMargin(documentXml)

  documentXml = removeBrokenDocGrid(documentXml)

  originalZip.file('word/document.xml', documentXml)
  return originalZip.generate({ type: 'nodebuffer' })
}

// Убирает пустой абзац-разделитель прямо перед фразой
// NOTICE_PARAGRAPH_START_TEXT — он всегда один и тот же (просто пробел),
// освобождённая строка помогает уместить документ на одной странице.
function removeParagraphBeforeNotice(documentXml) {
  const noticeStart = findParagraphStart(documentXml, NOTICE_PARAGRAPH_START_TEXT)

  const paragraphTagRegex = /<w:p(?=[ >])[^>]*>/g
  let precedingStart = -1
  let match
  while ((match = paragraphTagRegex.exec(documentXml)) && match.index < noticeStart) {
    precedingStart = match.index
  }
  if (precedingStart === -1) {
    throw new Error(`Не найден абзац перед текстом: "${NOTICE_PARAGRAPH_START_TEXT}"`)
  }

  return documentXml.slice(0, precedingStart) + documentXml.slice(noticeStart)
}

// Уменьшает нижнее поле страницы (см. BOTTOM_MARGIN_TWIPS) — раньше это
// делали вручную в Word, чтобы таблица с подписью в конце документа не
// уезжала на вторую страницу.
function shrinkBottomMargin(documentXml) {
  const withNewMargin = documentXml.replace(
    /(<w:pgMar[^/]*w:bottom=")\d+(")/,
    `$1${BOTTOM_MARGIN_TWIPS}$2`,
  )
  if (withNewMargin === documentXml) {
    throw new Error('Не найдено поле w:bottom в <w:pgMar>')
  }
  return withNewMargin
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

module.exports = { transformZayavlenie }
