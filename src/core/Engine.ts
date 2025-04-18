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
   * Unregister a template by name
   * @param name Template name to remove
   * @returns true if the template was found and removed, false otherwise
   */
  public unregisterTemplate(name: string): boolean {
    return this.templates.delete(name)
  }

  /**
   * Set data for template rendering
   * @param data Data object to use for variable interpolation
   */
  public setData(data: Record<string, any>): void {
    this.data = data
  }

  /**
   * Get template content by name
   * @param name Template name
   * @returns Template content
   */
  public getTemplateContent(name: string): string {
    const template = this.templates.get(name)
    if (!template) {
      throw new Error(`Template "${name}" not found`)
    }
    return template
  }

  /**
   * Render a template by name
   * @param name Template name
   * @returns Rendered HTML
   */
  public render(name: string): string {
    const template = this.getTemplateContent(name)

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

    // Process @for loop directive
    result = result.replace(/@for\s*\(\s*(.*?)\s*;\s*(.*?)\s*;\s*(.*?)\s*\)([\s\S]*?)@endfor/g, (_, initExpr, conditionExpr, incrementExpr, content) => {
      try {
        // We need to use a safer approach for for-loops that doesn't rely on eval or with statements
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
          const array = this.data[arrayName]
          if (Array.isArray(array)) {
            limitValue = array.length
          }
          else {
            console.error(`Invalid array in for loop condition: ${arrayName}`)
            return ''
          }
        }
        else {
          // Try to evaluate the limit from the data context
          try {
            limitValue = Number(this.data[limitExpr]) || 5 // Default to 5 if not a valid number
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
          const iterationContext = { ...this.data, [loopVarName]: i }

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
                  const array = this.data[arrayName]
                  if (Array.isArray(array) && i < array.length) {
                    const item = array[i]
                    return String(item[propertyName] || '')
                  }
                }
                // Handle array access with ternary like users[i].isActive ? 'Active' : 'Inactive'
                const arrayTernaryMatch = expr.match(/(\w+)\[(\w+)\]\.(\w+)\s*\?\s*['"](.*?)['"]\s*:\s*['"](.*?)['"]/)
                if (arrayTernaryMatch && arrayTernaryMatch[2] === loopVarName) {
                  const arrayName = arrayTernaryMatch[1]
                  const propertyName = arrayTernaryMatch[3]
                  const array = this.data[arrayName]
                  if (Array.isArray(array) && i < array.length) {
                    const item = array[i]
                    return item[propertyName] ? arrayTernaryMatch[4] : arrayTernaryMatch[5]
                  }
                }
              }

              // For other expressions, use the ExpressionEvaluator
              return String(ExpressionEvaluator.evaluate(expr, iterationContext) || '')
            }
            catch (err) {
              console.error(`Error evaluating expression in for loop: ${expr}`, err)
              return ''
            }
          })

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
