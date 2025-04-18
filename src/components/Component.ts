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
    // First process conditional directives
    const processed = this.processConditionals(template)

    // Then process variable interpolation
    return processed.replace(/\{\{\s*(.*?)\s*\}\}/g, (match, expr) => {
      try {
        // Special case for 'content' which refers to the default slot content
        if (expr.trim() === 'content') {
          // Don't escape HTML in slot content to allow HTML rendering
          return this.slot('default', '')
        }

        // Handle the common || operator for default values
        if (expr.includes('||')) {
          const [mainExpr, defaultExpr] = expr.split('||').map((e: string) => e.trim())
          try {
            // Special case for 'content' in the main expression
            if (mainExpr === 'content') {
              const slotContent = this.slot('default', '')
              if (slotContent) {
                // Don't escape HTML in slot content to allow HTML rendering
                return slotContent
              }
            }

            // Try the main expression first
            const mainResult = ExpressionEvaluator.evaluate(mainExpr, this.props)
            if (mainResult !== null && mainResult !== undefined) {
              return this.escapeHtml(String(mainResult))
            }
            // If main expression is null/undefined, use the default
            const defaultResult = defaultExpr.startsWith('\'') && defaultExpr.endsWith('\'')
              ? defaultExpr.slice(1, -1) // It's a string literal
              : ExpressionEvaluator.evaluate(defaultExpr, this.props)
            return this.escapeHtml(String(defaultResult ?? ''))
          }
          catch (e: any) {
            // If evaluation fails, return the default value if it's a string literal
            if (defaultExpr.startsWith('\'') && defaultExpr.endsWith('\'')) {
              return this.escapeHtml(defaultExpr.slice(1, -1))
            }
            throw e
          }
        }

        // Direct property access (common in templates)
        if (!expr.includes('(') && !expr.includes('+') && !expr.includes('-') && !expr.includes('*') && !expr.includes('/')) {
          // Simple property access, check if it exists directly
          const parts = expr.split('.')

          // Special handling for user.stats.X paths
          if (parts[0] === 'user' && parts.length > 1) {
            const nestedValue = ExpressionEvaluator.getNestedProperty(this.props, expr)
            if (nestedValue !== undefined) {
              return this.escapeHtml(String(nestedValue))
            }
          }

          let value: any = this.props
          for (const part of parts) {
            if (value === undefined || value === null) {
              return ''
            }
            value = value[part]
          }
          if (value !== undefined && value !== null) {
            return this.escapeHtml(String(value))
          }
        }

        // For more complex expressions, use Filtrex
        const result = ExpressionEvaluator.evaluate(expr, this.props)
        return this.escapeHtml(String(result ?? ''))
      }
      catch (error) {
        // Don't show errors in the output, just return empty string
        console.error(`Error evaluating expression: ${expr}`, error)
        return ''
      }
    })
  }

  /**
   * Process conditional directives in a template
   * @param template Template string with conditional directives
   */
  protected processConditionals(template: string): string {
    // Process @if directives
    return template.replace(/@if\s*\(([^)]+)\)([\s\S]*?)(?:@else([\s\S]*?))?@endif/g, (_, condition, ifContent, elseContent) => {
      try {
        // Try to evaluate the condition directly first
        let result = false

        // Handle direct property access
        if (!condition.includes('(') && !condition.includes('+') && !condition.includes('-') && !condition.includes('*') && !condition.includes('/')) {
          // Simple property access, check if it exists and is truthy
          const parts = condition.split('.')
          let value: any = this.props
          for (const part of parts) {
            if (value === undefined || value === null) {
              result = false
              break
            }
            value = value[part]
          }
          result = Boolean(value)
        }
        else {
          // For more complex conditions, use Filtrex
          result = ExpressionEvaluator.evaluateCondition(condition, this.props)
        }

        // Return the appropriate content based on the condition result
        return result ? this.processExpressions(ifContent) : (elseContent ? this.processExpressions(elseContent) : '')
      }
      catch (error) {
        console.error(`Error evaluating condition: ${condition}`, error)
        return elseContent ? this.processExpressions(elseContent) : ''
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
