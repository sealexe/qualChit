import { useRef, useState } from 'react'
import styles from './FileDropZone.module.css'

// Зона загрузки файлов: перетаскивание (drag&drop) + обычный выбор
// через клик. Сам компонент не хранит список файлов — он только
// сообщает о новых/удалённых файлах наружу через пропсы.
function FileDropZone({ files, onAddFiles, onRemoveFile }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  const handleDragOver = (event) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    onAddFiles(Array.from(event.dataTransfer.files))
  }

  const handleInputChange = (event) => {
    onAddFiles(Array.from(event.target.files))
    // Сбрасываем значение input, чтобы можно было повторно
    // выбрать тот же файл (иначе onChange не сработает повторно).
    event.target.value = ''
  }

  return (
    <div>
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
      >
        <p>Перетащите файлы сюда или нажмите, чтобы выбрать</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className={styles.hiddenInput}
          onChange={handleInputChange}
        />
      </div>

      {files.length > 0 && (
        <ul className={styles.fileList}>
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className={styles.fileItem}>
              {/* Двойная обёртка нужна для анимации длинных имён:
                  внешний span обрезает текст, внутренний — двигается */}
              <span className={styles.fileName}>
                <span className={styles.fileNameInner}>{file.name}</span>
              </span>
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => onRemoveFile(index)}
                aria-label="Убрать файл"
                title="Убрать файл"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default FileDropZone
