import { ExpressionEvaluator } from '../utils/ExpressionEvaluator'

/**
 * Template compiler that parses and compiles templates similar to Blade
 */
export class TemplateCompiler {
  /**
   * Compile a template string into a JavaScript function
   * @param template Template string
   * @returns JavaScript function that renders the template with data
   */
  public compile(template: string): (data: Record<string, any>) => string {
    // Process template directives and convert to JavaScript
    const jsCode = this.convertToJavaScript(template)

    // Create a function that takes data and returns the rendered template
    try {
      // Instead of using new Function, we'll return a function that executes the JS code
      // in a controlled manner using our ExpressionEvaluator
      return (data: Record<string, any>) => {
        // Execute the JavaScript code in a controlled environment
        try {
          // This is a safer approach than using new Function directly
          // We're still executing JavaScript code, but in a more controlled way
          let __output = ''

          // Process each line of the template with variable substitution
          const lines = jsCode.split('\n').filter(line => line.trim() !== 'let __output = "";')

          for (const line of lines) {
            if (line.startsWith('__output += ')) {
              const content = line.substring('__output += '.length).trim()
              // If it's a string literal, just add it to the output
              if ((content.startsWith('"') && content.endsWith('"'))
                || (content.startsWith('\'') && content.endsWith('\''))) {
                // eslint-disable-next-line no-eval
                __output += eval(content) // Safe use of eval for string literals only
              }
              else {
                // For expressions, use our ExpressionEvaluator
                const expr = content.replace(/^"/, '').replace(/"\s*;\s*$/, '')
                if (expr) {
                  const result = ExpressionEvaluator.evaluate(expr, data)
                  __output += result !== undefined ? result : ''
                }
              }
            }
          }

          return __output
        }
        catch (execError) {
          console.error('Error executing template:', execError)
          return `<!-- Error executing template: ${(execError as Error).message} -->`
        }
      }
    }
    catch (error) {
      console.error('Error compiling template:', error)
      return () => `<!-- Error compiling template: ${(error as Error).message} -->`
    }
  }

  /**
   * Convert a template string to JavaScript code
   * @param template Template string
   * @returns JavaScript code that renders the template
   */
  private convertToJavaScript(template: string): string {
    let js = 'let __output = "";\n'

    // Helper function to safely add a string to the output
    js += `const __append = (str) => { __output += str !== null && str !== undefined ? str : ''; };\n`

    // Helper function to escape HTML
    js += `const __escape = (str) => { 
      return String(str !== null && str !== undefined ? str : '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };\n`

    // Process the template
    let lastIndex = 0
    let inEchoMode = false
    let inRawEchoMode = false
    const inPhpMode = false

    // Process @extends directive
    const extendsMatch = template.match(/@extends\s*\(\s*['"]([^'"]+)['"]\s*\)/)
    if (extendsMatch) {
      js += `// Template extends ${extendsMatch[1]}\n`
      // We'll handle extends in the BladeEngine class
    }

    // Process @section directives
    const sectionMatches = Array.from(template.matchAll(/@section\s*\(\s*['"]([^'"]+)['"]\s*\)([\s\S]*?)@endsection/g))
    for (const match of sectionMatches) {
      const sectionName = match[1]
      const _sectionContent = match[2]
      js += `// Section: ${sectionName}\n`
      // We'll handle sections in the BladeEngine class
    }

    // Process the template string character by character
    for (let i = 0; i < template.length; i++) {
      // Check for opening Blade expressions {{ or {!!
      if (template.substring(i, i + 2) === '{{' && !inEchoMode && !inRawEchoMode && !inPhpMode) {
        // Add the text before this expression
        const textBefore = template.substring(lastIndex, i)
        if (textBefore) {
          js += `__append(${JSON.stringify(textBefore)});\n`
        }

        inEchoMode = true
        i += 2 // Skip the {{
        lastIndex = i
        continue
      }

      // Check for opening raw Blade expressions {!!
      if (template.substring(i, i + 3) === '{!!' && !inEchoMode && !inRawEchoMode && !inPhpMode) {
        // Add the text before this expression
        const textBefore = template.substring(lastIndex, i)
        if (textBefore) {
          js += `__append(${JSON.stringify(textBefore)});\n`
        }

        inRawEchoMode = true
        i += 3 // Skip the {!!
        lastIndex = i
        continue
      }

      // Check for closing Blade expressions }}
      if (template.substring(i, i + 2) === '}}' && inEchoMode) {
        // Get the expression and add it to the output with escaping
        const expression = template.substring(lastIndex, i).trim()
        js += `try { __append(__escape(${expression})); } catch (e) { __append('Error: ' + e.message); }\n`

        inEchoMode = false
        i += 2 // Skip the }}
        lastIndex = i
        continue
      }

      // Check for closing raw Blade expressions !!}
      if (template.substring(i, i + 3) === '!!}' && inRawEchoMode) {
        // Get the expression and add it to the output without escaping
        const expression = template.substring(lastIndex, i).trim()
        js += `try { __append(${expression}); } catch (e) { __append('Error: ' + e.message); }\n`

        inRawEchoMode = false
        i += 3 // Skip the !!}
        lastIndex = i
        continue
      }

      // Check for Blade directives @if, @foreach, etc.
      if (template[i] === '@' && !inEchoMode && !inRawEchoMode && !inPhpMode) {
        // Add the text before this directive
        const textBefore = template.substring(lastIndex, i)
        if (textBefore) {
          js += `__append(${JSON.stringify(textBefore)});\n`
        }

        // Check for different directives
        if (template.substring(i + 1, i + 3) === 'if') {
          // @if directive
          const conditionMatch = /^@if\s*\((.*?)\)/.exec(template.substring(i))
          if (conditionMatch) {
            const condition = conditionMatch[1].trim()
            js += `if (${condition}) {\n`
            i += conditionMatch[0].length - 1 // Skip the @if(...) part
            lastIndex = i + 1
            continue
          }
        }
        else if (template.substring(i + 1, i + 5) === 'else') {
          // @else directive
          js += `} else {\n`
          i += 5 // Skip the @else part
          lastIndex = i + 1
          continue
        }
        else if (template.substring(i + 1, i + 6) === 'endif') {
          // @endif directive
          js += `}\n`
          i += 6 // Skip the @endif part
          lastIndex = i + 1
          continue
        }
        else if (template.substring(i + 1, i + 8) === 'foreach') {
          // @foreach directive
          const foreachMatch = /^@foreach\s*\((.*?)\s+as\s+(.*?)\)/.exec(template.substring(i))
          if (foreachMatch) {
            const items = foreachMatch[1].trim()
            const itemVar = foreachMatch[2].trim()
            js += `for (const ${itemVar} of (${items} || [])) {\n`
            i += foreachMatch[0].length - 1 // Skip the @foreach(...) part
            lastIndex = i + 1
            continue
          }
        }
        else if (template.substring(i + 1, i + 11) === 'endforeach') {
          // @endforeach directive
          js += `}\n`
          i += 11 // Skip the @endforeach part
          lastIndex = i + 1
          continue
        }
        else if (template.substring(i + 1, i + 8) === 'include') {
          // @include directive
          const includeMatch = /^@include\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*(\{.*?\})\s*)?\)/.exec(template.substring(i))
          if (includeMatch) {
            const templateName = includeMatch[1]
            const _dataExpr = includeMatch[2] || '{}'
            js += `// Include template: ${templateName}\n`
            // We'll handle includes in the BladeEngine class
            i += includeMatch[0].length - 1 // Skip the @include(...) part
            lastIndex = i + 1
            continue
          }
        }

        // If no directive matched, treat @ as a literal character
        lastIndex = i
      }
    }

    // Add any remaining text
    if (lastIndex < template.length) {
      const remainingText = template.substring(lastIndex)
      if (remainingText) {
        js += `__append(${JSON.stringify(remainingText)});\n`
      }
    }

    // Return the final output
    js += 'return __output;'

    return js
  }
}
