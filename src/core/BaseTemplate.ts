import { ExpressionEvaluator } from '../utils/ExpressionEvaluator'

/**
 * Base template class implementing the Template Method pattern
 * for template inheritance similar to Blade's layout system
 */
export abstract class BaseTemplate {
  private sections: Map<string, string> = new Map()
  protected data: Record<string, any> = {}

  /**
   * Constructor for BaseTemplate
   * @param data Optional data to initialize the template with
   */
  constructor(data: Record<string, any> = {}) {
    this.data = data
  }

  /**
   * Set data for template rendering
   * @param data Data object to use for variable interpolation
   */
  public setData(data: Record<string, any>): void {
    this.data = { ...this.data, ...data }
  }

  /**
   * Main render method that defines the template structure
   * This is the Template Method that subclasses will customize
   */
  public render(): string {
    return this.processTemplate(this.getTemplateContent())
  }

  /**
   * Get the raw template content
   * This should be implemented by subclasses
   */
  protected abstract getTemplateContent(): string

  /**
   * Define a section with content
   * @param name Section name
   * @param content Section content
   */
  protected section(name: string, content: string): void {
    this.sections.set(name, content)
  }

  /**
   * Yield a section's content
   * @param name Section name
   * @param defaultContent Optional default content if section is not defined
   */
  protected yield(name: string, defaultContent: string = ''): string {
    return this.sections.get(name) || defaultContent
  }

  /**
   * Process the template content with sections and expressions
   * @param content Template content
   */
  private processTemplate(content: string): string {
    // Process @section directives
    content = this.processSections(content)

    // Process @yield directives
    content = this.processYields(content)

    // Process variable expressions
    content = this.processExpressions(content)

    // Process conditionals
    content = this.processConditionals(content)

    return content
  }

  /**
   * Process @section directives in the template
   * @param content Template content
   */
  private processSections(content: string): string {
    const sectionRegex = /@section\s*\(\s*['"]([^'"]+)['"]\s*\)([\s\S]*?)@endsection/g
    let match
    let result = content

    // eslint-disable-next-line no-cond-assign
    while ((match = sectionRegex.exec(content)) !== null) {
      const sectionName = match[1]
      const sectionContent = match[2]

      // Store the section content
      this.section(sectionName, sectionContent)

      // Remove the section declaration from the template
      result = result.replace(match[0], '')
    }

    return result
  }

  /**
   * Process @yield directives in the template
   * @param content Template content
   */
  private processYields(content: string): string {
    return content.replace(/@yield\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]+)['"]\s*)?\)/g, (_, sectionName, defaultContent = '') => {
      return this.yield(sectionName, defaultContent)
    })
  }

  /**
   * Process variable expressions {{ $var }}
   * @param content Template content
   */
  private processExpressions(content: string): string {
    return content.replace(/\{\{\s*(.*?)\s*\}\}/g, (_, expr) => {
      try {
        // Evaluate expression using the safer ExpressionEvaluator
        const result = ExpressionEvaluator.evaluate(expr, this.data)

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
   * Process @if directives in the template
   * @param content Template content
   */
  private processConditionals(content: string): string {
    return content.replace(/@if\s*\(\s*(.*?)\s*\)([\s\S]*?)(?:@else([\s\S]*?))?@endif/g, (_, condition, ifContent, elseContent = '') => {
      try {
        // Evaluate condition using the safer ExpressionEvaluator
        const conditionResult = ExpressionEvaluator.evaluateCondition(condition, this.data)

        return conditionResult ? ifContent : elseContent
      }
      catch (error) {
        console.error(`Error evaluating condition: ${condition}`, error)
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
