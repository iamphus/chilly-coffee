import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusStore } from '../../focus/focusStore.js'

export default function TodoApp() {
  const { t } = useTranslation()
  const todos = useFocusStore((state) => state.todos)
  const addTodo = useFocusStore((state) => state.addTodo)
  const toggleTodo = useFocusStore((state) => state.toggleTodo)
  const removeTodo = useFocusStore((state) => state.removeTodo)
  const [draft, setDraft] = useState('')
  const inputId = useId()
  const left = todos.filter((todo) => !todo.done).length

  const submit = (event) => {
    event.preventDefault()
    addTodo(draft)
    setDraft('')
  }

  return (
    <section className="todo" aria-labelledby="todo-title">
      <header className="laptop-app__header">
        <h2 id="todo-title">{t('laptop.apps.todo')}</h2>
        <span>{t('laptop.todo.left', { count: left })}</span>
      </header>

      <form className="todo__form" onSubmit={submit}>
        <label htmlFor={inputId} className="visually-hidden">
          {t('laptop.todo.newLabel')}
        </label>
        <input id={inputId} type="text" value={draft} maxLength={200} onChange={(event) => setDraft(event.target.value)} />
        <button type="submit" className="laptop-button laptop-button--primary" disabled={!draft.trim()}>
          {t('laptop.todo.add')}
        </button>
      </form>

      {todos.length === 0 ? (
        <p className="laptop-empty">{t('laptop.todo.empty')}</p>
      ) : (
        <ul className="todo__list">
          {todos.map((todo) => (
            <li key={todo.id} className={todo.done ? 'todo__item todo__item--done' : 'todo__item'}>
              <label>
                <input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} />
                <span>{todo.text}</span>
              </label>
              <button
                type="button"
                className="todo__remove"
                onClick={() => removeTodo(todo.id)}
                aria-label={t('laptop.todo.remove', { text: todo.text })}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
