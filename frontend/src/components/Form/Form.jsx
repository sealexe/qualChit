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
  address: '',
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
  'address',
  'sampleNumber',
  'examDate',
  'chairman',
  'expert',
  'techExpert',
]

function Form() {
  const [formData, setFormData] = useState(initialFormState)
  const [download, setDownload] = useState(null) // { url, name }
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)

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

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsLoading(true)
    setErrorMessage(null)
    setDownload(null)

    try {
      // multipart/form-data — чтобы вместе с текстовыми полями передать
      // и сами файлы из drag&drop
      const body = new FormData()
      for (const key of Object.keys(formData)) {
        if (key === 'files') continue
        body.append(key, formData[key])
      }
      for (const file of formData.files) {
        body.append('files', file)
      }

      // 127.0.0.1, а не localhost — чтобы запрос не зависел от резолвинга
      // имени, который иногда ломает VPN (см. vite.config.js)
      const response = await fetch('http://127.0.0.1:3001/api/generate', {
        method: 'POST',
        body,
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Ошибка сервера')
      }

      // Читаем имя архива из заголовка Content-Disposition
      const disposition = response.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename\*=UTF-8''(.+)/)
      const archiveName = match ? decodeURIComponent(match[1]) : 'documents.zip'

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setDownload({ url, name: archiveName })
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setIsLoading(false)
    }
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

      {/* Адрес — нужен для "Заявления" (плейсхолдер {{address}}) */}
      <div className={styles.row}>
        <label className={styles.label} htmlFor="address">
          Адрес
        </label>
        <input
          id="address"
          name="address"
          type="text"
          required
          value={formData.address}
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
        disabled={!isFormValid || isLoading}
      >
        {isLoading ? 'Генерируется...' : 'Сгенерировать'}
      </button>

      {/* 7. Блок скачивания архива */}
      {errorMessage && (
        <div className={styles.error}>Ошибка: {errorMessage}</div>
      )}
      {download ? (
        <a
          href={download.url}
          download={download.name}
          className={styles.downloadLink}
        >
          Скачать архив
        </a>
      ) : (
        !errorMessage && (
          <div className={styles.downloadPlaceholder}>
            Архив появится здесь после генерации
          </div>
        )
      )}
    </form>
  )
}

export default Form
