import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BladeHtml } from '../src/index'
import { ExpressionEvaluator } from '../src/utils/ExpressionEvaluator'

const themeFolder = 'theme-1'

// Get the current directory (equivalent to __dirname in CommonJS)
const currentDir = join(dirname(fileURLToPath(import.meta.url)), themeFolder)

console.warn('currentDir', currentDir)

// Define paths for templates and output
const outputDir = join(currentDir, '../../', 'dist')

/**
 * Example demonstrating the use of Blade HTML with safer expression evaluation using filtrex
 * This example uses the enhanced BladeHtml class that automatically loads templates and registers components
 */

// Create output directory if it doesn't exist
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true })
}

// Create a new BladeHtml instance with root directory
const blade = new BladeHtml(currentDir)

// Register an alias for this theme directory
blade.registerAlias('theme1', currentDir)

// Log the initialization
console.warn('🔍 Initialized BladeHtml with root directory:', currentDir)
console.warn('🔗 Registered alias: theme1 ->', currentDir)

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
    // Parse arguments: value, format
    const argsMatch = args.match(/^(.*?)(?:,\s*['"]([^'"]+)['"])?$/)
    if (!argsMatch)
      return ''
    const valueExpr = argsMatch[1]
    const format = argsMatch[2] || 'YYYY-MM-DD'

    let value = ExpressionEvaluator.evaluate(valueExpr, data)
    // Normalize date string if in YYYY-MM-DD format
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      value = value.replace(/-/g, '/')
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime()))
      return 'Invalid Date'

    if (format === 'YYYY-MM-DD') {
      return date.toISOString().slice(0, 10)
    }
    if (format === 'locale') {
      return date.toLocaleDateString()
    }
    // Add more format cases as needed
    return date.toString()
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

if (!existsSync(`dist/${themeFolder}`)) {
  mkdirSync(`dist/${themeFolder}`)
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

// --- Alias rendering example ---
const aliasTemplateName = 'theme1::pages.home'
const renderedAliasHtml = blade.render(aliasTemplateName, data)
console.warn('🔄 Rendering page using alias (theme1::pages.home)...\n')
console.warn(`⬇️ Alias Output: \n\n${renderedAliasHtml}\n`)

// You could also write to a file

writeFileSync(`dist/${themeFolder}/template-path-output.html`, renderedHtml)

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

writeFileSync(`dist/${themeFolder}/inline-template-output.html`, inlineRenderedHtml)

// #endregion

// #region For Loop Directive Example

// Example of @for loop directive with inline template
console.warn('\n🔄 Rendering @for loop example with inline template...')

const forLoopExample = blade.render(`
<div class="for-loop-example">
  <h2>For Loop Directive Example</h2>
  
  <div class="user-list">
    <h3>{{ title || 'User List' }}</h3>
    
    @if(users)
      <div class="user-count">Total users: {{ users.length }}</div>
      
      <ul class="user-items">
        @for(let i = 0; i < users.length; i = i + 1)
          <li class="user-item">
            <div class="user-number">{{ i + 1 }}</div>
            <div class="user-name">{{ users[i].name }}</div>
            <div class="user-email">{{ users[i].email }}</div>
            <span class="status">
              Status
            </span>
          </li>
        @endfor
      </ul>
    @else
      <p class="no-users">No users found</p>
    @endif
  </div>
  
  <div class="manual-loop-example">
    <h3>Manual Iteration Example</h3>
    <table class="user-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Name</th>
          <th>Email</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        @for(let i = 0; i < users.length; i = i + 1)
          <tr class="{{ i % 2 === 0 ? 'true' : 'false' }}">
            <td>{{ i + 1 }}</td>
            <td>{{ users[i].name }}</td>
            <td>{{ users[i].email }}</td>
            <td>{{ users[i].isActive }}</td>
          </tr>
        @endfor
      </tbody>
    </table>
  </div>
</div>`, {
  title: 'User Directory',
  users: [
    { name: 'John Doe', email: 'john@example.com', isActive: true },
    { name: 'Jane Smith', email: 'jane@example.com', isActive: true },
    { name: 'Bob Johnson', email: 'bob@example.com', isActive: false },
    { name: 'Alice Williams', email: 'alice@example.com', isActive: true },
    { name: 'Charlie Brown', email: 'charlie@example.com', isActive: false },
  ],
})

// Output the rendered for loop HTML
console.warn(`⬇️ For Loop Example Output: \n\n${forLoopExample}\n`)

// Write to a file
writeFileSync(join(outputDir, `${themeFolder}/for-loop-example.html`), forLoopExample)

// #endregion

// #region Custom Root Directory Example

// Example of using a custom root directory
console.warn('\n📚 Example of using a custom root directory')

// Create a BladeHtml instance with a custom root directory
const customRootDir = join(currentDir, '..')
const customBlade = new BladeHtml(customRootDir)

// Render an inline template with the custom instance
const customExample = customBlade.render(`
<div class="custom-root-example">
  <h2>Custom Root Directory Example</h2>
  <p>This template is rendered using a BladeHtml instance with a custom root directory:</p>
  <code>${customRootDir}</code>
</div>
`)

// Output the rendered HTML
console.warn(`⬇️ Custom Root Directory Example Output: \n\n${customExample}\n`)

// Write to a file
writeFileSync(join(outputDir, `${themeFolder}/custom-root-example.html`), customExample)

// #endregion
