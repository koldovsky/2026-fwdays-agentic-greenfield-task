import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  /** Людяна назва блоку — показується в повідомленні про помилку. */
  name: string
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Локальна межа помилок (FR-UX): ізолює збій одного блоку, щоб помилка в
 * ньому не «завалювала» весь застосунок у білий екран. Показує назву блоку,
 * повідомлення й стек — і залишає решту UI робочою.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Лишаємо слід у консолі для діагностики.
    console.error(`[${this.props.name}] крах компонента:`, error, info.componentStack)
  }

  render(): ReactNode {
    const { error } = this.state
    if (error) {
      return (
        <section className="errbound">
          <strong className="errbound__title">Помилка в блоці «{this.props.name}»</strong>
          <p className="errbound__msg">{error.message}</p>
          <button
            type="button"
            className="errbound__retry"
            onClick={() => this.setState({ error: null })}
          >
            Спробувати ще раз
          </button>
        </section>
      )
    }
    return this.props.children
  }
}
