import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { BladeHtml, Component } from '../src/index'
import { ExpressionEvaluator } from '../src/utils/ExpressionEvaluator'

/**
 * Example demonstrating the use of Blade HTML with safer expression evaluation using filtrex
 * This example loads template files from the examples/templates directory and renders them
 */

// Helper function to load a single template file
function loadTemplate(name: string): string {
  // Use import.meta.url instead of __dirname (which is not available in ES modules)
  const currentDir = new URL('.', import.meta.url).pathname

  // Handle namespaced paths like 'components.alert'
  const parts = name.split('.')
  let templatePath: string

  if (parts.length > 1) {
    // If it's a namespaced path (e.g., 'components.alert', 'layouts.partials.header')
    const namespace = parts[0]
    const templateName = parts.slice(1).join('.')

    // Special case for layouts - look in examples/layouts directory
    if (namespace === 'layouts') {
      templatePath = join(currentDir, 'layouts', `${templateName}.blade.html`)
    }
    else {
      templatePath = join(currentDir, namespace, `${templateName}.blade.html`)
    }
  }
  else {
    // Check if it's a layout file first
    const layoutPath = join(currentDir, 'layouts', `${name}.blade.html`)

    try {
      // Try to access the file to see if it exists
      statSync(layoutPath)
      templatePath = layoutPath
    }
    catch {
      // If not found in layouts, default to pages directory
      templatePath = join(currentDir, 'pages', `${name}.blade.html`)
    }
  }

  return readFileSync(templatePath, 'utf-8')
}

// Helper function to recursively load all templates from a directory
function loadTemplatesFromDirectory(directory: string, blade: BladeHtml, namePrefix: string = ''): void {
  const currentDir = new URL('.', import.meta.url).pathname
  const templatesDir = join(currentDir, directory)
  const templateExtension = '.blade.html'

  // Function to recursively process directories
  function processDirectory(dir: string, namePrefix: string = ''): void {
    const items = readdirSync(dir)

    for (const item of items) {
      const itemPath = join(dir, item)
      const stats = statSync(itemPath)

      if (stats.isDirectory()) {
        // If it's a directory, process it recursively with updated prefix
        const newPrefix = namePrefix ? `${namePrefix}.${item}` : item
        processDirectory(itemPath, newPrefix)
      }
      else if (stats.isFile() && item.endsWith(templateExtension)) {
        // If it's a template file, register it
        const templateName = item.slice(0, -templateExtension.length)
        const fullTemplateName = namePrefix
          ? `${namePrefix}.${templateName}`
          : templateName

        // Read and register the template
        const templateContent = readFileSync(itemPath, 'utf-8')
        blade.registerTemplate(fullTemplateName, templateContent)
        console.warn(`📄 Registered template: ${fullTemplateName}`)
      }
    }
  }

  // Start processing from the root templates directory
  processDirectory(templatesDir, namePrefix)
}

// Create a new BladeHtml instance
const blade = new BladeHtml()

// Load and register all template files
try {
  // Method 1: Register templates individually
  console.warn('Method 1: Registering individual templates:')
  blade.registerTemplate('layouts.main-layout', loadTemplate('layouts.main-layout'))
  blade.registerTemplate('pages.page', loadTemplate('pages.page'))

  // Register component templates with namespaced paths
  blade.registerTemplate('components.alert', loadTemplate('components.alert'))
  blade.registerTemplate('components.card', loadTemplate('components.card'))
  blade.registerTemplate('components.user-profile', loadTemplate('components.user-profile'))

  // Method 2: Load all templates recursively from directory
  console.warn('\nMethod 2: Loading templates recursively from directory:')
  loadTemplatesFromDirectory('pages', blade)
  loadTemplatesFromDirectory('components', blade, 'components')

  // Load layouts from the examples directory
  const examplesDir = new URL('.', import.meta.url).pathname
  try {
    const layoutsDir = join(examplesDir, 'layouts')
    console.warn('\nLoading layouts from examples directory:')

    // Function to recursively process layouts directory
    function processLayoutsDirectory(dir: string, namePrefix: string = 'layouts'): void {
      const items = readdirSync(dir)

      for (const item of items) {
        const itemPath = join(dir, item)
        const stats = statSync(itemPath)

        if (stats.isDirectory()) {
          // If it's a directory, process it recursively with updated prefix
          const newPrefix = `${namePrefix}.${item}`
          processLayoutsDirectory(itemPath, newPrefix)
        }
        else if (stats.isFile() && item.endsWith('.blade.html')) {
          // If it's a template file, register it
          const templateName = item.slice(0, -'.blade.html'.length)
          const fullTemplateName = `${namePrefix}.${templateName}`

          // Read and register the template
          const templateContent = readFileSync(itemPath, 'utf-8')
          blade.registerTemplate(fullTemplateName, templateContent)
          console.warn(`📄 Registered layout template: ${fullTemplateName}`)
        }
      }
    }

    // Start processing from the layouts directory
    processLayoutsDirectory(layoutsDir)
  }
  catch (error) {
    console.error('Error loading layouts:', error)
  }

  // Create component classes
  class AlertComponent extends Component {
    render(): string {
      const type = this.props.type || 'info'

      return `<div class="alert alert-${type}">
        ${this.slot('default', '')}
      </div>`
    }
  }

  class CardComponent extends Component {
    render(): string {
      const title = this.props.title || ''
      const footer = this.props.footer || ''

      return `<div class="card">
        <div class="card-header">
          <h3>${title}</h3>
        </div>
        <div class="card-body">
          ${this.slot('default', '')}
        </div>
        ${footer ? `<div class="card-footer">${footer}</div>` : ''}
      </div>`
    }
  }

  class UserProfileComponent extends Component {
    render(): string {
      const user = this.props.user || {}

      return `<div class="user-profile card">
        <div class="user-header">
          <h3>${user.name || 'Unknown User'}</h3>
          ${user.verified ? '<span class="badge badge-success">Verified</span>' : ''}
        </div>
        <div class="user-body">
          <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
          <p><strong>Role:</strong> ${user.role || 'User'}</p>
          
          ${user.bio
            ? `<div class="bio">
            <h4>Bio</h4>
            <p>${user.bio}</p>
          </div>`
            : ''}
          
          ${user.stats
            ? `<div class="stats">
            <h4>Stats</h4>
            <ul>
              <li>Posts: ${user.stats.posts || 0}</li>
              <li>Followers: ${user.stats.followers || 0}</li>
              <li>Following: ${user.stats.following || 0}</li>
            </ul>
          </div>`
            : ''}
        </div>
      </div>`
    }
  }

  // Register component classes with both namespaced and non-namespaced names
  blade.registerComponent('components.alert', AlertComponent)
  blade.registerComponent('components.card', CardComponent)
  blade.registerComponent('components.user-profile', UserProfileComponent)

  // Also register with original names for backward compatibility
  blade.registerComponent('alert', AlertComponent)
  blade.registerComponent('card', CardComponent)
  blade.registerComponent('user-profile', UserProfileComponent)

  console.warn('✅ All templates loaded successfully!')
}
catch (error) {
  console.error('Error loading templates:', error)
}

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

// Render the page template with data
const renderedHtml = blade.render('page', data)

// Output the rendered HTML
console.warn('🔄 Rendering page with safer expression evaluation...\n')
console.warn(`⬇️ Output: \n\n${renderedHtml}\n`)

// You could also write to a file
// import { writeFileSync } from 'fs';
// writeFileSync('output.html', renderedHtml);
