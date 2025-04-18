import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { BladeHtml } from '../src/index'
import { ExpressionEvaluator } from '../src/utils/ExpressionEvaluator'

/**
 * Example demonstrating the use of Blade HTML with safer expression evaluation using filtrex
 * This example uses the enhanced BladeHtml class that automatically loads templates and registers components
 */

// Create a new BladeHtml instance
const blade = new BladeHtml()

// Define data for rendering
const data = {
  features: [
    'Template inheritance with @extends and @section',
    'Components with props and slots',
    'Conditional rendering with @if/@else',
    'Loops with @foreach',
    'Custom directives',
    'Variable interpolation with safe expression evaluation',
    'Protection against code injection attacks',
    'Recursive template loading from subdirectories',
  ],
  showExtraContent: true,
  user: {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Administrator',
    bio: 'John is a software developer with 5 years of experience in web development.',
    verified: true,
    stats: {
      posts: 42,
      followers: 1024,
      following: 256,
    },
  },
  title: 'Blade HTML Example',
  subtitle: 'Safer Template Engine with Filtrex',
  author: 'Blade HTML Team',
  companyName: 'Blade HTML',
  links: [
    { url: '#', text: 'Home' },
    { url: '#', text: 'About' },
    { url: '#', text: 'Contact' },
  ],
  date: '4/12/2025',
  mathExpression: '5 * 10 + 2',
  stringOperation: 'Hello ' + 'user.name',
  conditionalExpression: 'user.role === "Administrator" ? "Admin User" : "Regular User"',
}

// Register custom directives using safer expression evaluation
// This demonstrates how to create custom directives that use the ExpressionEvaluator

// Register a custom directive for formatting dates
blade.registerDirective('formatDate', (args: string, data: Record<string, any>) => {
  try {
    // For date formatting, we need to handle this specially since filtrex doesn't support methods
    if (args.includes('new Date()')) {
      return new Date().toLocaleDateString()
    }
    // If the argument is a string literal (wrapped in quotes), extract it
    if ((args.startsWith('\'') && args.endsWith('\'')) || (args.startsWith('"') && args.endsWith('"'))) {
      const dateStr = args.substring(1, args.length - 1)
      return new Date(dateStr).toLocaleDateString()
    }
    // Otherwise try to evaluate as a timestamp or date string
    const value = ExpressionEvaluator.evaluate(args, data)
    const date = new Date(value)
    return date.toLocaleDateString()
  }
  catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid Date'
  }
})

// Register a custom directive for uppercase text
blade.registerDirective('uppercase', (args: string, data: Record<string, any>) => {
  try {
    // Safely evaluate the expression using ExpressionEvaluator
    const value = ExpressionEvaluator.evaluate(args, data)
    return String(value).toUpperCase()
  }
  catch {
    return ''
  }
})

// Register a custom directive for the current year
blade.registerDirective('year', () => {
  return new Date().getFullYear().toString()
})

// Register a custom directive for concatenating strings
blade.registerDirective('concat', (args: string, data: Record<string, any>) => {
  try {
    // Split the args by '+' and evaluate each part
    const parts = args.split('+').map((part) => {
      const trimmedPart = part.trim()
      if (trimmedPart.startsWith('\'') && trimmedPart.endsWith('\'')) {
        // It's a string literal
        return trimmedPart.slice(1, -1)
      }
      else {
        // Try to evaluate as an expression
        try {
          return ExpressionEvaluator.evaluate(trimmedPart, data)
        }
        catch {
          return trimmedPart
        }
      }
    })
    return parts.join('')
  }
  catch {
    return ''
  }
})

if (!existsSync('dist')) {
  mkdirSync('dist')
}

// #region Template Path Rendering

// Define the initial template to render
const initialTemplate = 'pages.home'

// Render the template with data
// The BladeHtml class will automatically discover and register templates and components
const renderedHtml = blade.render(initialTemplate, data)

// Output the rendered HTML
console.warn('🔄 Rendering page with safer expression evaluation...\n')
console.warn(`⬇️ Output: \n\n${renderedHtml}\n`)

// You could also write to a file

writeFileSync('dist/template-path-output.html', renderedHtml)

// #endregion

// #region Inline Template Rendering

// Example of inline template rendering
console.warn('\n🔄 Rendering inline template example...\n')

// Create an inline template with various Blade features
const inlineTemplate = `
<div class="inline-example">
  <h1>{{ title }}</h1>
  
  @if(showGreeting)
    <p>Hello, {{ name }}!</p>
  @else
    <p>Welcome, guest!</p>
  @endif
  
  <ul>
    @foreach(items as item)
      <li>{{ item }}</li>
    @endforeach
  </ul>
  
  @component("alert")
    This is an alert message!
  @endcomponent
</div>
`

// Render the inline template with data
const inlineRenderedHtml = blade.render(inlineTemplate, {
  title: 'Inline Template Demo',
  name: 'User',
  showGreeting: true,
  items: ['Apple', 'Banana', 'Cherry'],
})

// Output the rendered inline HTML
console.warn(`⬇️ Inline Template Output: \n\n${inlineRenderedHtml}\n`)

writeFileSync('dist/inline-template-output.html', inlineRenderedHtml)

// #endregion
