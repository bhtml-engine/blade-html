import type { DirectiveHandler } from './DirectiveRegistry'
import { ExpressionEvaluator } from '../utils/ExpressionEvaluator'

/**
 * Collection of common directives similar to Blade's built-in directives
 */
export class CommonDirectives {
  /**
   * @json directive - Outputs a JSON representation of a variable
   */
  public static json: DirectiveHandler = (args, data) => {
    try {
      // Evaluate the expression using the safer ExpressionEvaluator
      const value = ExpressionEvaluator.evaluate(args, data)

      return JSON.stringify(value, null, 2)
    }
    catch (error) {
      console.error(`Error in @json directive: ${args}`, error)
      return '{}'
    }
  }

  /**
   * @raw directive - Outputs raw HTML without escaping
   */
  public static raw: DirectiveHandler = (args, data) => {
    try {
      // Evaluate the expression using the safer ExpressionEvaluator
      const value = ExpressionEvaluator.evaluate(args, data)

      return String(value ?? '')
    }
    catch (error) {
      console.error(`Error in @raw directive: ${args}`, error)
      return ''
    }
  }

  /**
   * @date directive - Formats a date
   */
  public static date: DirectiveHandler = (args, data) => {
    try {
      // Parse arguments: @date(value, format)
      const argsMatch = args.match(/^(.*?)(?:,\s*['"]([^'"]+)['"])?$/)

      if (!argsMatch) {
        return ''
      }

      const valueExpr = argsMatch[1]
      const format = argsMatch[2] || 'toLocaleString'

      // Evaluate the expression using the safer ExpressionEvaluator
      const value = ExpressionEvaluator.evaluate(valueExpr, data)

      // Convert to date and format
      const date = new Date(value)

      if (Number.isNaN(date.getTime())) {
        return 'Invalid Date'
      }

      if (typeof date[format as keyof Date] === 'function') {
        return (date[format as keyof Date] as (this: Date) => string).call(date)
      }

      return date.toLocaleString()
    }
    catch (error) {
      console.error(`Error in @date directive: ${args}`, error)
      return ''
    }
  }

  /**
   * @class directive - Conditionally adds CSS classes
   */
  public static class: DirectiveHandler = (args, data) => {
    try {
      // Parse arguments: @class(['class-name' => condition, ...])
      const argsStr = args.replace(/^\[\s*|\s*\]$/g, '')
      const classPairs = argsStr.split(/,\s*/)

      const classes = classPairs
        .map((pair) => {
          const [className, condition] = pair.split(/\s*=>\s*/)

          // Remove quotes from class name
          const cleanClassName = className.replace(/^['"]|['"]$/g, '')

          // Evaluate the condition using the safer ExpressionEvaluator
          const conditionResult = ExpressionEvaluator.evaluateCondition(condition, data)

          return conditionResult ? cleanClassName : ''
        })
        .filter(Boolean)
        .join(' ')

      return classes
    }
    catch (error) {
      console.error(`Error in @class directive: ${args}`, error)
      return ''
    }
  }

  /**
   * @style directive - Conditionally adds inline styles
   */
  public static style: DirectiveHandler = (args, data) => {
    try {
      // Parse arguments: @style(['property' => value, ...])
      const argsStr = args.replace(/^\[\s*|\s*\]$/g, '')
      const stylePairs = argsStr.split(/,\s*/)

      const styles = stylePairs
        .map((pair) => {
          const [property, valueExpr] = pair.split(/\s*=>\s*/)

          // Remove quotes from property name
          const cleanProperty = property.replace(/^['"]|['"]$/g, '')

          // Evaluate the value using the safer ExpressionEvaluator
          const value = ExpressionEvaluator.evaluate(valueExpr, data)

          return value ? `${cleanProperty}: ${value}` : ''
        })
        .filter(Boolean)
        .join('; ')

      return styles
    }
    catch (error) {
      console.error(`Error in @style directive: ${args}`, error)
      return ''
    }
  }

  /**
   * @dump directive - Outputs a debug representation of a variable
   */
  public static dump: DirectiveHandler = (args, data) => {
    try {
      // Evaluate the expression using the safer ExpressionEvaluator
      const value = ExpressionEvaluator.evaluate(args, data)

      // Create a debug representation
      const output = JSON.stringify(value, null, 2)

      return `<pre style="background: #f4f4f4; padding: 10px; border-radius: 5px; color: #333;">${output}</pre>`
    }
    catch (error) {
      console.error(`Error in @dump directive: ${args}`, error)
      return '<pre>Error</pre>'
    }
  }
}
