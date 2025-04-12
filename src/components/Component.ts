import { ExpressionEvaluator } from '../utils/ExpressionEvaluator'

/**
 * Base Component class for creating reusable UI components
 * Similar to Blade's @component directive
 */
export abstract class Component {
  public props: Record<string, any>
  protected slots: Map<string, string> = new Map()

  /**
   * Constructor for Component
   * @param props Component properties
   */
  constructor(props: Record<string, any> = {}) {
    this.props = props
  }

  /**
   * Set a named slot with content
   * @param name Slot name
   * @param content Slot content
   */
  public setSlot(name: string, content: string): void {
    this.slots.set(name, content)
  }

  /**
   * Get the content of a named slot
   * @param name Slot name
   * @param defaultContent Default content if slot is not defined
   */
  protected slot(name: string = 'default', defaultContent: string = ''): string {
    return this.slots.get(name) || defaultContent
  }

  /**
   * Render the component
   * This method should be implemented by subclasses
   */
  public abstract render(): string

  /**
   * Process variable expressions in a template string
   * @param template Template string with expressions
   */
  protected processExpressions(template: string): string {
    return template.replace(/\{\{\s*(.*?)\s*\}\}/g, (_, expr) => {
      try {
        // Evaluate expression using the safer ExpressionEvaluator
        const result = ExpressionEvaluator.evaluate(expr, this.props)

        // Convert the result to a string and escape HTML
        return this.escapeHtml(String(result ?? ''))
      }
      catch (error) {
        console.error(`Error evaluating expression: ${expr}`, error)
        return ''
      }
    })
  }

  /**
   * Escape HTML special characters to prevent XSS
   * @param html Raw HTML string
   */
  private escapeHtml(html: string): string {
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}
