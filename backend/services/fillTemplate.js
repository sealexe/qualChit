const fs = require('fs')
const PizZip = require('pizzip')
const Docxtemplater = require('docxtemplater')

// Принимает путь к .docx-заготовке и объект с данными для подстановки.
// Возвращает Buffer с заполненным документом.
function fillTemplate(templatePath, data) {
  const content = fs.readFileSync(templatePath, 'binary')
  const zip = new PizZip(content)
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
  })
  doc.render(data)
  return doc.getZip().generate({ type: 'nodebuffer' })
}

module.exports = { fillTemplate }
