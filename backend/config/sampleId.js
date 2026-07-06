// Полный идентификатор образца собирается по-разному для каждого метода
// контроля. Здесь — таблица паттернов: {n} заменяется на то, что пользователь
// ввёл в поле "№ образца" (цифра или буква).
// Новый метод контроля — просто добавь строку в таблицу.
const SAMPLE_ID_PATTERNS = {
  'ВИК': 'ОК-ВИК-{n}',
  'РК': 'ОК-РК-{n}',
  'УЗК': 'ОК-{n}-УЗК',
  'ПВК': 'ПВК-2024-1-{n}', // "2024-1" — фиксированная часть, меняется только буква (А, Б, ...)
}

// Собирает идентификатор образца, например: buildSampleId('УЗК', '3') -> "ОК-3-УЗК"
function buildSampleId(controlMethod, sampleNumber) {
  const pattern = SAMPLE_ID_PATTERNS[controlMethod]
  if (!pattern) {
    throw new Error(`Неизвестный метод контроля: ${controlMethod}`)
  }
  return pattern.replace('{n}', sampleNumber)
}

module.exports = { buildSampleId }
