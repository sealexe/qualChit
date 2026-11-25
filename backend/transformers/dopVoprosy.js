const path = require('path')
const { fillTemplate } = require('../services/fillTemplate')

// Заготовка "Доп. вопросы" есть только у метода ЭК:
// library/ЭК/templates/Доп. вопросы.docx
// В ней один плейсхолдер — {{fio}}.
//
// Принимает данные формы, возвращает Buffer готового .docx.
function transformDopVoprosy(formData) {
  const { fullName, controlMethod } = formData

  const templatePath = path.join(
    __dirname, '..', '..', 'library', controlMethod, 'templates', 'Доп. вопросы.docx'
  )

  return fillTemplate(templatePath, { fio: fullName })
}

module.exports = { transformDopVoprosy }
