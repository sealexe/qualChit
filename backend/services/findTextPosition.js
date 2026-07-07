// Поиск фразы в тексте document.xml (внутренний XML .docx-файла).
//
// Проблема: Word (в отличие от LibreOffice) при конвертации RTF→DOCX
// разбивает текст на много мелких кусков <w:t> — иногда каждое слово
// отдельно. Поэтому простой documentXml.indexOf('целая фраза') фразу
// не находит, хотя в документе она есть.
//
// Эта функция собирает весь видимый текст документа (содержимое всех
// <w:t>) в одну строку, ищет фразу в ней, а потом возвращает позицию
// первого символа фразы в исходной XML-строке — дальше с этой позицией
// можно работать так же, как раньше с результатом indexOf.
//
// Возвращает -1, если фраза не найдена.
function findTextPosition(documentXml, searchText) {
  const { plainText, xmlPositions } = collectVisibleText(documentXml)
  const foundAt = plainText.indexOf(searchText)
  return foundAt === -1 ? -1 : xmlPositions[foundAt]
}

// Собирает весь видимый текст (содержимое всех <w:t>) в одну строку и для
// каждого её символа запоминает позицию в исходной XML-строке. Позволяет
// находить в XML не только целую фразу (см. findTextPosition), но и позицию
// произвольного символа внутри найденного текста — например, чтобы вставить
// что-то посреди фразы, даже если она разбита на несколько <w:t>-кусков.
function collectVisibleText(documentXml) {
  const xmlPositions = []
  let plainText = ''

  const textTagRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
  let match
  while ((match = textTagRegex.exec(documentXml))) {
    const content = match[1]
    const contentStart = match.index + match[0].indexOf('>') + 1
    for (let i = 0; i < content.length; i++) {
      xmlPositions.push(contentStart + i)
    }
    plainText += content
  }

  return { plainText, xmlPositions }
}

module.exports = { findTextPosition, collectVisibleText }
