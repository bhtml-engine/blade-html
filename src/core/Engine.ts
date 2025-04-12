import { ExpressionEvaluator } from '../utils/ExpressionEvaluator'

/**
 * Core template engine class for Blade-like HTML templating
 */
export class Engine {
  private directives: Map<string, DirectiveHandler> = new Map()
  private templates: Map<string, string> = new Map()
  private sections: Map<string, string> = new Map()
  private currentSection: string | null = null
  private sectionStack: string[] = []
  private data: Record<string, any> = {}

  /**
   * Register a directive handler
   * @param name Directive name (without the @ symbol)
   * @param handler Function that processes the directive
   */
  public registerDirective(name: string, handler: DirectiveHandler): void {
    this.directives.set(name, handler)
  }

  /**
   * Register a template with a name
   * @param name Template name
   * @param content Template content
   */
  public registerTemplate(name: string, content: string): void {
    this.templates.set(name, content)
  }

  /**
   * Set data for template rendering
   * @param data Data object to use for variable interpolation
   */
  public setData(data: Record<string, any>): void {
    this.data = data
  }

  /**
   * Render a template by name
   * @param name Template name
   * @returns Rendered HTML
   */
  public render(name: string): string {
    const template = this.templates.get(name)
    if (!template) {
      throw new Error(`Template "${name}" not found`)
    }

    // Clear sections for each new render
    this.sections.clear()

    // First pass: Process extends and sections
    let content = this.processExtends(template)

    // Process @yield directives to fill in sections
    content = this.processYields(content)

    // Second pass: Process all directives and expressions
    content = this.processDirectives(content)
    content = this.processExpressions(content)

    return content
  }

  /**
   * Process @extends directive and handle template inheritance
   * @param content Template content
   * @returns Processed content
   */
  private processExtends(content: string): string {
    const extendsMatch = content.match(/@extends\s*\(\s*['"]([^'"]+)['"]\s*\)/)

    if (extendsMatch) {
      const parentName = extendsMatch[1]
      const parentTemplate = this.templates.get(parentName)

      if (!parentTemplate) {
        throw new Error(`Parent template "${parentName}" not found`)
      }

      // Process sections in the child template
      this.processSections(content)

      // Return the parent template (sections will be filled in later)
      return parentTemplate
    }

    // If no extends, just process sections and return
    this.processSections(content)
    return content
  }

  /**
   * Process @section and @endsection directives
   * @param content Template content
   */
  private processSections(content: string): void {
    // Extract sections from content
    const sectionRegex = /@section\s*\(\s*['"]([^'"]+)['"]\s*\)([\s\S]*?)@endsection/g
    let match

    // eslint-disable-next-line no-cond-assign
    while ((match = sectionRegex.exec(content)) !== null) {
      const sectionName = match[1]
      const sectionContent = match[2]
      this.sections.set(sectionName, sectionContent)
    }
  }

  /**
   * Process @yield directives in the template
   * @param content Template content
   * @returns Processed content with yields replaced by section content
   */
  private processYields(content: string): string {
    // Process @yield directive with default value
    let result = content.replace(/@yield\s*\(\s*['"](.*?)['"]\s*,\s*['"](.*?)['"]\s*\)/g, (_: string, sectionName: string, defaultContent: string) => {
      return this.sections.get(sectionName) || defaultContent
    })

    // Process @yield directive without default value
    result = result.replace(/@yield\s*\(\s*['"](.*?)['"]\s*\)/g, (_: string, sectionName: string) => {
      return this.sections.get(sectionName) || ''
    })

    return result
  }

  /**
   * Process all registered directives in the template
   * @param content Template content
   * @returns Processed content
   */
  private processDirectives(content: string): string {
    let result = content

    // Process @yield directive
    result = result.replace(/@yield\s*\(\s*['"]([^'"]+)['"]\s*\)/g, (_, sectionName) => {
      return this.sections.get(sectionName) || ''
    })

    // Process @if directive
    result = result.replace(/@if\s*\(\s*(.*?)\s*\)([\s\S]*?)(?:@else([\s\S]*?))?@endif/g, (_, condition, ifContent, elseContent = '') => {
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

    // Process @foreach directive
    result = result.replace(/@foreach\s*\(\s*(.*?)\s+as\s+(.*?)\s*\)([\s\S]*?)@endforeach/g, (_, itemsExpr, itemVar, content) => {
      try {
        // Evaluate items expression using the safer ExpressionEvaluator
        const items = ExpressionEvaluator.evaluate(itemsExpr, this.data)

        if (!Array.isArray(items)) {
          return ''
        }

        // Process the loop content for each item
        return items.map((item) => {
          // Create a new context with the loop variable
          const loopContext = { ...this.data, [itemVar.trim()]: item }

          // Process the content with the loop variable
          let itemContent = content

          // Replace {{ $item }} expressions
          itemContent = itemContent.replace(/\{\{\s*(.*?)\s*\}\}/g, (_: string, expr: string) => {
            try {
              // Evaluate expression using the safer ExpressionEvaluator
              return ExpressionEvaluator.evaluate(expr, loopContext)
            }

            catch {
              return ''
            }
          })

          return itemContent
        }).join('')
      }
      catch (error) {
        console.error(`Error processing foreach: ${itemsExpr}`, error)
        return ''
      }
    })

    // Process @include directive
    result = result.replace(/@include\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*(\{.*?\})\s*)?\)/g, (_, templateName, dataExpr) => {
      const includedTemplate = this.templates.get(templateName)
      if (!includedTemplate) {
        return `<!-- Template "${templateName}" not found -->`
      }

      let includeData = this.data

      // If additional data was provided, merge it with the current data
      if (dataExpr) {
        try {
          // Evaluate data expression using the safer ExpressionEvaluator
          const additionalData = ExpressionEvaluator.evaluateObject(dataExpr, this.data)
          includeData = { ...this.data, ...additionalData }
        }
        catch (error) {
          console.error(`Error evaluating include data: ${dataExpr}`, error)
        }
      }

      // Process the included template with the current data
      const tempEngine = new Engine()
      tempEngine.registerTemplate('__include', includedTemplate)
      tempEngine.setData(includeData)

      return tempEngine.render('__include')
    })

    // Process custom directives
    for (const [name, handler] of this.directives.entries()) {
      const directiveRegex = new RegExp(`@${name}\\s*\\(\\s*(.*?)\\s*\\)`, 'g')
      result = result.replace(directiveRegex, (_, args) => {
        try {
          return handler(args, this.data)
        }
        catch (error) {
          console.error(`Error processing directive @${name}`, error)
          return ''
        }
      })
    }

    return result
  }

  /**
   * Process variable expressions {{ $var }}
   * @param content Template content
   * @returns Processed content
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
   * Escape HTML special characters to prevent XSS
   * @param html Raw HTML string
   * @returns Escaped HTML string
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

/**
 * Directive handler function type
 */
export type DirectiveHandler = (args: string, data: Record<string, any>) => string
