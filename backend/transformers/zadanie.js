const path = require('path')
const { fillTemplate } = require('../services/fillTemplate')
const { buildSampleId } = require('../config/sampleId')

// Принимает данные формы, возвращает Buffer готового .docx "Задание".
function transformZadanie(formData) {
  const { fullName, controlMethod, sampleNumber, examDate, chairman, expert, techExpert } = formData

  const templatePath = path.join(
    __dirname, '..', '..', 'library', controlMethod, 'templates', 'Задание.docx'
  )

  const data = {
    fio: fullName,
    date: examDate,
    ex_sample: buildSampleId(controlMethod, sampleNumber),
    chairman,
    expert,
    tech_expert: techExpert,
  }

  return fillTemplate(templatePath, data)
}

module.exports = { transformZadanie }
