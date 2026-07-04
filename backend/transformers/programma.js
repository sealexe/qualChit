// Трансформер для входящего файла "Программа_ФИО.rtf".
// Связан с заготовкой library/{controlMethod}/templates/Программа.docx
// (см. backend/config/incomingFiles.js).
//
// TODO: логика заполнения ещё не реализована — договоримся отдельно,
// что именно нужно взять из originalFile и как объединить с заготовкой.
//
// Ожидаемый вход: originalFile — Buffer с содержимым входящего .rtf,
//                 formData — данные формы (ФИО, метод контроля, комиссия и т.д.)
// Ожидаемый выход: Buffer готового файла.
function transformProgramma(originalFile, formData) {
  throw new Error('transformProgramma ещё не реализован')
}

module.exports = { transformProgramma }
