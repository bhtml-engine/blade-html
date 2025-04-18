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
    let processed = this.processConditionals(template)

    // Process for loop directives
    processed = this.processForLoops(processed)

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
    let result = template
    let lastResult = ''

    // Process conditionals until no more changes are made (handles nested conditionals)
    while (result !== lastResult) {
      lastResult = result
      result = result.replace(/@if\s*\(\s*(.*?)\s*\)([\s\S]*?)(?:@else([\s\S]*?))?@endif/g, (_, condition, ifContent, elseContent = '') => {
        try {
          // Evaluate condition using the safer ExpressionEvaluator
          const conditionResult = ExpressionEvaluator.evaluateCondition(condition, this.props)
          return conditionResult ? ifContent : elseContent
        }
        catch (error) {
          console.error(`Error evaluating condition: ${condition}`, error)
          return elseContent
        }
      })
    }

    return result
  }

  /**
   * Process for loop directives in a template
   * @param template Template string with for loop directives
   */
  protected processForLoops(template: string): string {
    return template.replace(/@for\s*\(\s*(.*?)\s*;\s*(.*?)\s*;\s*(.*?)\s*\)([\s\S]*?)@endfor/g, (_, initExpr, conditionExpr, incrementExpr, content) => {
      try {
        // Extract the loop variable name and initial value
        const initMatch = initExpr.match(/\s*(var|let|const)?\s*(\w+)\s*=\s*([^;]+)/)
        if (!initMatch) {
          console.error(`Invalid for loop initialization: ${initExpr}`)
          return ''
        }

        const loopVarName = initMatch[2]
        let loopVarValue: number

        try {
          // Try to parse the initial value as a number
          loopVarValue = Number(initMatch[3])
        }
        catch {
          // Default to 0 if parsing fails
          loopVarValue = 0
        }

        // Parse the condition to extract the limit
        const conditionMatch = conditionExpr.match(/(\w+)\s*<\s*([^;]+)/)
        if (!conditionMatch) {
          console.error(`Invalid for loop condition: ${conditionExpr}`)
          return ''
        }

        // Get the limit value
        let limitValue: number
        const limitExpr = conditionMatch[2].trim()

        if (limitExpr.match(/^\d+$/)) {
          // It's a simple number
          limitValue = Number(limitExpr)
        }
        else if (limitExpr.includes('.length')) {
          // It's an array length expression
          const arrayName = limitExpr.split('.')[0]
          const array = this.props[arrayName]
          if (Array.isArray(array)) {
            limitValue = array.length
          }
          else {
            console.error(`Invalid array in for loop condition: ${arrayName}`)
            return ''
          }
        }
        else {
          // Try to evaluate the limit from the props context
          try {
            limitValue = Number(this.props[limitExpr]) || 5 // Default to 5 if not a valid number
          }
          catch {
            limitValue = 5 // Default limit
          }
        }

        // Parse the increment expression
        const incrementMatch = incrementExpr.match(/(\w+)\s*=\s*(\w+)\s*\+\s*(\d+)/)
        const incrementValue = incrementMatch ? Number(incrementMatch[3]) : 1

        // Build the result by iterating manually
        let loopContent = ''

        for (let i = loopVarValue; i < limitValue; i += incrementValue) {
          // Create a context for this iteration
          const iterationContext = { ...this.props, [loopVarName]: i }

          // Process the content with the current loop variables
          let iterationContent = content

          // Replace {{ expressions }} with their values
          iterationContent = iterationContent.replace(/\{\{\s*(.*?)\s*\}\}/g, (_: string, expr: string) => {
            try {
              // Handle common expressions
              if (expr.trim() === loopVarName) {
                return String(i)
              }
              else if (expr.includes('+') && expr.includes(loopVarName)) {
                // Handle i + 1 type expressions
                const addMatch = expr.match(/(\w+)\s*\+\s*(\d+)/)
                if (addMatch && addMatch[1] === loopVarName) {
                  return String(i + Number(addMatch[2]))
                }
              }
              else if (expr.includes('%') && expr.includes(loopVarName)) {
                // Handle i % 2 type expressions
                const modMatch = expr.match(/(\w+)\s*%\s*(\d+)\s*===\s*(\d+)/)
                if (modMatch && modMatch[1] === loopVarName) {
                  const mod = i % Number(modMatch[2])
                  return String(mod === Number(modMatch[3]))
                }
                // Handle i % 2 === 0 ? 'even' : 'odd' type expressions
                const ternaryMatch = expr.match(/(\w+)\s*%\s*(\d+)\s*===\s*(\d+)\s*\?\s*['"](.*?)['"]\s*:\s*['"](.*?)['"]/)
                if (ternaryMatch && ternaryMatch[1] === loopVarName) {
                  const mod = i % Number(ternaryMatch[2])
                  return mod === Number(ternaryMatch[3]) ? ternaryMatch[4] : ternaryMatch[5]
                }
              }
              else if (expr.includes('[') && expr.includes(']')) {
                // Handle array access like users[i].name
                const arrayAccessMatch = expr.match(/(\w+)\[(\w+)\]\.(\w+)/)
                if (arrayAccessMatch && arrayAccessMatch[2] === loopVarName) {
                  const arrayName = arrayAccessMatch[1]
                  const propertyName = arrayAccessMatch[3]
                  const array = this.props[arrayName]
                  if (Array.isArray(array) && i < array.length) {
                    const item = array[i]
                    return this.escapeHtml(String(item[propertyName] || ''))
                  }
                }
                // Handle array access with ternary like users[i].isActive ? 'Active' : 'Inactive'
                const arrayTernaryMatch = expr.match(/(\w+)\[(\w+)\]\.(\w+)\s*\?\s*['"](.*?)['"]\s*:\s*['"](.*?)['"]/)
                if (arrayTernaryMatch && arrayTernaryMatch[2] === loopVarName) {
                  const arrayName = arrayTernaryMatch[1]
                  const propertyName = arrayTernaryMatch[3]
                  const array = this.props[arrayName]
                  if (Array.isArray(array) && i < array.length) {
                    const item = array[i]
                    return item[propertyName] ? arrayTernaryMatch[4] : arrayTernaryMatch[5]
                  }
                }
              }

              // For other expressions, use the ExpressionEvaluator
              return this.escapeHtml(String(ExpressionEvaluator.evaluate(expr, iterationContext) || ''))
            }
            catch (err) {
              console.error(`Error evaluating expression in for loop: ${expr}`, err)
              return ''
            }
          })

          // Process conditionals in the iteration content
          iterationContent = this.processConditionals(iterationContent)

          // Add the processed content to the result
          loopContent += iterationContent
        }

        return loopContent
      }
      catch (error) {
        console.error(`Error processing for loop: ${initExpr}; ${conditionExpr}; ${incrementExpr}`, error)
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
