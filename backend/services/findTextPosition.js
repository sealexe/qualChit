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
  // Для каждого символа видимого текста запоминаем, где он стоит в XML
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

  const foundAt = plainText.indexOf(searchText)
  return foundAt === -1 ? -1 : xmlPositions[foundAt]
}

module.exports = { findTextPosition }
