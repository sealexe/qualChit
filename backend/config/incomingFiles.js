const { transformProgramma } = require('../transformers/programma')
const { transformZayavlenie } = require('../transformers/zayavlenie')
const { transformOcenochnyjList } = require('../transformers/ocenochnyjList')

// Связь между файлами, которые попадают в drag&drop (frontend/src/components/Form/FileDropZone),
// и заготовками из library/{controlMethod}/templates/.
//
// prefix           — с этого начинается имя входящего файла из drag&drop
// templateFileName — какая заготовка из library/{controlMethod}/templates/ используется
// transform        — функция-трансформер для этого типа файла (папка transformers/)
//
// Важно: имена входящих файлов и имена заготовок не всегда совпадают
// (например, "Заявление_*.rtf" связан с заготовкой "Задание.docx").
//
// Итоговый файл в архиве сохраняет то же имя, с которым он пришёл в drag&drop.
const INCOMING_FILE_TYPES = [
  {
    // пример входящего имени: Программа_Сорокин_Павел_Игоревич.rtf
    prefix: 'Программа',
    templateFileName: 'Программа.docx',
    transform: transformProgramma,
  },
  {
    // пример входящего имени: Заявление_ЦОК-001-04999.rtf
    prefix: 'Заявление',
    templateFileName: 'Заявление.docx',
    transform: transformZayavlenie,
  },
  {
    // пример входящего имени: Оценочный_лист_04999_Сорокин_Павел_Игоревич.rtf
    prefix: 'Оценочный_лист',
    templateFileName: 'Оценочный_лист.docx',
    transform: transformOcenochnyjList,
  },
]

// Находит описание типа файла по имени входящего файла.
// Порядок проверки важен: "Оценочный_лист" не должен случайно матчиться
// как более короткий префикс из другого правила.
function findIncomingFileType(fileName) {
  return INCOMING_FILE_TYPES.find((type) => fileName.startsWith(type.prefix))
}

module.exports = { INCOMING_FILE_TYPES, findIncomingFileType }
