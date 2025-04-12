import { compileExpression } from 'filtrex'

/**
 * Safely evaluates expressions using filtrex instead of new Function
 * This provides a more secure way to evaluate expressions without using eval or new Function
 */
export class ExpressionEvaluator {
  /**
   * Evaluates an expression using filtrex with the provided context
   *
   * @param expr The expression to evaluate
   * @param context The context object containing variables for the expression
   * @returns The result of the expression evaluation
   */
  public static evaluate(expr: string, context: Record<string, any>): any {
    try {
      // Prepare the expression for filtrex by replacing common template patterns
      const preparedExpr = this.prepareExpression(expr)

      // Compile the expression using filtrex
      const compiled = compileExpression(preparedExpr)

      // Execute the compiled expression with the provided context
      return compiled(context)
    }
    catch (error) {
      console.warn(`Error evaluating expression: ${expr}`, error)
      return null
    }
  }

  /**
   * Prepares an expression for filtrex by replacing template syntax
   *
   * @param expr The raw expression from the template
   * @returns A filtrex-compatible expression
   */
  private static prepareExpression(expr: string): string {
    // Remove template-specific syntax and convert to filtrex-compatible syntax
    let prepared = expr.trim()

    // Replace common JavaScript operators/syntax that filtrex might not support directly
    prepared = prepared.replace(/===|!==|==|!=|&&|\|\|/g, (match) => {
      switch (match) {
        case '===': return '=='
        case '!==': return '!='
        case '==': return '=='
        case '!=': return '!='
        case '&&': return 'and'
        case '||': return 'or'
        default: return match
      }
    })

    return prepared
  }

  /**
   * Evaluates an expression that should return a boolean result
   *
   * @param condition The condition expression to evaluate
   * @param context The context object containing variables for the expression
   * @returns The boolean result of the condition evaluation
   */
  public static evaluateCondition(condition: string, context: Record<string, any>): boolean {
    const result = this.evaluate(condition, context)
    return Boolean(result)
  }

  /**
   * Evaluates an object expression (like props or data objects)
   *
   * @param objectExpr The object expression to evaluate
   * @param context The context object containing variables for the expression
   * @returns The evaluated object
   */
  public static evaluateObject(objectExpr: string, context: Record<string, any>): Record<string, any> {
    try {
      // Clean up the expression to handle common formats
      const cleanExpr = objectExpr.trim()
        .replace(/^\{\s*/, '') // Remove leading {
        .replace(/\s*\}$/, '') // Remove trailing }

      // For object expressions, we need special handling
      // First check if it's a variable reference to an existing object
      if (cleanExpr in context) {
        return context[cleanExpr]
      }

      // Create a result object to build up our properties
      const result: Record<string, any> = {}

      // Split by commas, but only if they're not inside nested objects/arrays
      let depth = 0
      let currentProp = ''

      for (let i = 0; i < cleanExpr.length; i++) {
        const char = cleanExpr[i]

        if (char === '{' || char === '[') {
          depth++
          currentProp += char
        }
        else if (char === '}' || char === ']') {
          depth--
          currentProp += char
        }
        else if (char === ',' && depth === 0) {
          // Process the current property when we hit a comma at the top level
          this.processObjectProperty(currentProp, result, context)
          currentProp = ''
        }
        else {
          currentProp += char
        }
      }

      // Process the last property
      if (currentProp.trim()) {
        this.processObjectProperty(currentProp, result, context)
      }

      return result
    }
    catch (error) {
      console.warn(`Error evaluating object expression: ${objectExpr}`, error)
      return {}
    }
  }

  /**
   * Helper method to process a single property in an object expression
   *
   * @param propExpr The property expression (e.g., "key: value")
   * @param resultObj The result object to add the property to
   * @param context The context for evaluation
   */
  private static processObjectProperty(
    propExpr: string,
    resultObj: Record<string, any>,
    context: Record<string, any>,
  ): void {
    const propParts = propExpr.split(':')

    if (propParts.length < 2) {
      return // Skip invalid properties
    }

    // Get the key (removing quotes if present)
    const key = propParts[0].trim().replace(/^['"]|['"]$/g, '')

    // Join the rest back together in case there were colons in the value
    const valueExpr = propParts.slice(1).join(':').trim()

    // If it's a simple variable reference
    if (/^\w+$/.test(valueExpr) && valueExpr in context) {
      resultObj[key] = context[valueExpr]
      return
    }

    // If it's a string literal
    if ((valueExpr.startsWith('\'') && valueExpr.endsWith('\''))
      || (valueExpr.startsWith('"') && valueExpr.endsWith('"'))) {
      resultObj[key] = valueExpr.slice(1, -1) // Remove quotes
      return
    }

    // Otherwise evaluate as an expression
    resultObj[key] = this.evaluate(valueExpr, context)
  }
}
