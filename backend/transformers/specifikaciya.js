const path = require('path')
const { fillTemplate } = require('../services/fillTemplate')

// Принимает данные формы, возвращает Buffer готового .docx "Спецификация".
function transformSpecifikaciya(formData) {
  const { fullName, controlMethod, sampleNumber, examDate, chairman, expert, techExpert } = formData

  const templatePath = path.join(
    __dirname, '..', '..', 'library', controlMethod, 'templates', 'Спецификация.docx'
  )

  const data = {
    fio: fullName,
    date: examDate,
    ex_sample: `ОК-${controlMethod}-${sampleNumber}`,
    chairman,
    expert,
    tech_expert: techExpert,
  }

  return fillTemplate(templatePath, data)
}

module.exports = { transformSpecifikaciya }
