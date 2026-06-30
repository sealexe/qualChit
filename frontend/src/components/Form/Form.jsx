import { useState } from 'react'
import styles from './Form.module.css'
import FileDropZone from './FileDropZone'

// Список методов контроля. Чтобы добавить новый метод —
// достаточно дописать его сюда, больше менять ничего не нужно.
const CONTROL_METHODS = ['ВИК', 'РК', 'УК']

// Начальное состояние формы. Вынесено отдельно, чтобы было
// легко увидеть всю структуру данных формы в одном месте.
const initialFormState = {
  fullName: '',
  controlMethod: CONTROL_METHODS[0],
  sampleNumber: '',
  examDate: '',
  chairman: '',
  expert: '',
  techExpert: '',
  files: [],
}

// Поля, которые обязательно должны быть заполнены для активации
// кнопки "Сгенерировать". Перечислены здесь отдельно, чтобы было
// видно весь список проверок в одном месте.
const REQUIRED_FIELDS = [
  'fullName',
  'sampleNumber',
  'examDate',
  'chairman',
  'expert',
  'techExpert',
]

function Form() {
  const [formData, setFormData] = useState(initialFormState)

  // Простая проверка: все обязательные текстовые поля не пустые
  // (с учётом пробелов по краям).
  const isFormValid = REQUIRED_FIELDS.every(
    (field) => formData[field].trim() !== '',
  )

  // Универсальный обработчик для текстовых полей и select —
  // обновляет одно поле в formData по его имени (name).
  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Добавляет новые файлы к уже выбранным (не заменяет список).
  const handleAddFiles = (newFiles) => {
    setFormData((prev) => ({ ...prev, files: [...prev.files, ...newFiles] }))
  }

  // Убирает один файл из списка по индексу.
  const handleRemoveFile = (index) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    console.log('Данные формы:', formData)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h1 className={styles.title}>qualChit</h1>

      {/* 1. ФИО */}
      <div className={styles.row}>
        <label className={styles.label} htmlFor="fullName">
          ФИО кандидата
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          value={formData.fullName}
          onChange={handleFieldChange}
        />
      </div>

      {/* 2. Метод контроля + № образца на одной строке */}
      <div className={`${styles.row} ${styles.methodRow}`}>
        <div>
          <label className={styles.label} htmlFor="controlMethod">
            Метод контроля
          </label>
          <select
            id="controlMethod"
            name="controlMethod"
            value={formData.controlMethod}
            onChange={handleFieldChange}
          >
            {CONTROL_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={styles.label} htmlFor="sampleNumber">
            № образца
          </label>
          <input
            id="sampleNumber"
            name="sampleNumber"
            type="text"
            required
            value={formData.sampleNumber}
            onChange={handleFieldChange}
          />
        </div>
      </div>

      {/* 3. Дата экзамена */}
      <div className={styles.row}>
        <label className={styles.label} htmlFor="examDate">
          Дата экзамена
        </label>
        <input
          id="examDate"
          name="examDate"
          type="date"
          required
          value={formData.examDate}
          onChange={handleFieldChange}
        />
      </div>

      {/* 4. Комиссия */}
      <fieldset className={styles.row}>
        <legend className={styles.label}>Комиссия</legend>

        <label className={styles.label} htmlFor="chairman">
          Председатель
        </label>
        <input
          id="chairman"
          name="chairman"
          type="text"
          required
          value={formData.chairman}
          onChange={handleFieldChange}
        />

        <label className={styles.label} htmlFor="expert">
          Эксперт
        </label>
        <input
          id="expert"
          name="expert"
          type="text"
          required
          value={formData.expert}
          onChange={handleFieldChange}
        />

        <label className={styles.label} htmlFor="techExpert">
          Технический эксперт
        </label>
        <input
          id="techExpert"
          name="techExpert"
          type="text"
          required
          value={formData.techExpert}
          onChange={handleFieldChange}
        />
      </fieldset>

      {/* 5. Файлы для трансформации */}
      <div className={styles.row}>
        <label className={styles.label}>Файлы для трансформации</label>
        <FileDropZone
          files={formData.files}
          onAddFiles={handleAddFiles}
          onRemoveFile={handleRemoveFile}
        />
      </div>

      {/* 6. Кнопка генерации — неактивна, пока не заполнены обязательные поля */}
      <button
        type="submit"
        className={styles.submitButton}
        disabled={!isFormValid}
      >
        Сгенерировать
      </button>

      {/* 7. Заглушка блока скачивания архива */}
      <div className={styles.downloadPlaceholder}>
        Архив появится здесь после генерации
      </div>
    </form>
  )
}

export default Form
