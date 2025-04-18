# BladeHtml

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

A flexible and secure template engine for TypeScript, inspired by [Laravel](https://laravel.com/)'s [Blade](https://laravel.com/docs/12.x/blade) template engine. BladeHtml features automatic template and component discovery, secure expression evaluation, and a powerful component system.

> [!NOTE]
> BladeHtml prioritizes security and flexibility, using Filtrex for safe expression evaluation without relying on `eval()` or `new Function()`.

## Key Features

### Template System
- **Template Inheritance**: Extend layouts with `@extends` and define sections with `@section`/`@endsection`
- **Automatic Discovery**: Templates are automatically discovered from directories without manual registration
- **Namespaced Templates**: Support for organizing templates in namespaces (e.g., `layouts.partials.header`)
- **Recursive Loading**: Templates can be loaded from nested subdirectories

### Component System
- **Dynamic Components**: Create reusable UI components with props and slots
- **Lazy Loading**: Components are only registered when actually used in templates
- **Namespaced Components**: Support for both namespaced and non-namespaced component references
- **Slot Content**: Components can define default and named slots

### Expression Evaluation
- **Secure Evaluation**: Uses [filtrex](https://github.com/joewalnes/filtrex) for safe expression evaluation without `eval()` or `new Function()`
- **Variable Interpolation**: Interpolate variables with `{{ expression }}` syntax
- **Conditional Rendering**: Use `@if(condition)`, `@else`, and `@endif` directives
- **Loops**: Iterate over arrays with `@foreach(items as item)` and `@endforeach`
- **Default Values**: Support for default values with `||` operator (e.g., `{{ name || 'Guest' }}`)
- **Nested Properties**: Access nested object properties with dot notation

### Directives
- **Built-in Directives**: Includes `@json`, `@raw`, `@date`, `@class`, `@style`, `@dump`, `@concat` and more
- **Custom Directives**: Easily create and register custom directives

### Type Safety and Security
- **TypeScript Support**: Fully written in TypeScript with type definitions
- **HTML Escaping**: Automatic HTML escaping to prevent XSS attacks
- **Safe Object Expressions**: Object expressions are safely parsed and evaluated

## Installation

```bash
pnpm add blade-html
# or
npm install blade-html
# or
yarn add blade-html
```

## Quick Start

### Basic Usage

```typescript
import { BladeHtml } from 'blade-html'

// Create a new BladeHtml instance
const blade = new BladeHtml()

// Set template directories for automatic discovery
blade.setTemplateDirs([
  './templates',
  './components'
])

// Load templates and components automatically
blade.loadTemplatesAndRegisterComponents(['pages', 'layouts', 'components'], 'pages.home')

// Render the template with data
const html = blade.render('pages.home', {
  title: 'My Application',
  user: {
    name: 'John Doe',
    role: 'Administrator',
    verified: true
  },
  items: ['Item 1', 'Item 2', 'Item 3']
})

console.log(html)
```

### Manual Template Registration

```typescript
import { BladeHtml } from 'blade-html'

// Create a new BladeHtml instance
const blade = new BladeHtml()

// Register a template
blade.registerTemplate('greeting', `
  <div>
    <h1>Hello, {{ name || 'Guest' }}!</h1>
    @if(showMessage)
      <p>{{ message }}</p>
    @endif

    @foreach(items as item)
      <li>{{ item }}</li>
    @endforeach
  </div>
`)

// Render the template with data
const html = blade.render('greeting', {
  name: 'World',
  showMessage: true,
  message: 'Welcome to BladeHtml!',
  items: ['Apple', 'Banana', 'Cherry']
})
```

## Template Inheritance

BladeHtml supports powerful template inheritance similar to Laravel's Blade:

```html
<!-- layouts/main.blade.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>@yield('title', 'Default Title')</title>
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <header>
    @include('layouts.partials.header')
  </header>

  <main class="container">
    @yield('content')
  </main>

  <footer>
    @include('layouts.partials.footer')
  </footer>
</body>
</html>

<!-- pages/home.blade.html -->
@extends('layouts.main')

@section('title', 'Home Page')

@section('content')
  <h1>Welcome to {{ siteName }}</h1>

  @if(user.verified)
    <div class="verified-badge">✓ Verified Account</div>
  @endif

  <div class="features">
    @foreach(features as feature)
      <div class="feature-card">
        <h3>{{ feature.title }}</h3>
        <p>{{ feature.description }}</p>
      </div>
    @endforeach
  </div>
@endsection
```

```typescript
// In your application code
const blade = new BladeHtml()

// Set template directories
blade.setTemplateDirs(['./templates'])

// Load templates automatically
blade.loadTemplatesAndRegisterComponents(['layouts', 'pages'], 'pages.home')

// Render with data
const html = blade.render('pages.home', {
  siteName: 'BladeHtml Demo',
  user: {
    name: 'John Doe',
    verified: true
  },
  features: [
    { title: 'Template Inheritance', description: 'Extend base layouts with sections' },
    { title: 'Components', description: 'Create reusable UI components' },
    { title: 'Security', description: 'Safe expression evaluation with Filtrex' }
  ]
})
```

## Component System

BladeHtml provides a powerful component system for creating reusable UI elements:

### Component Templates

```html
<!-- components/alert.blade.html -->
<div class="alert alert-{{ type || 'info' }}">
  {{ content }}
</div>

<!-- components/card.blade.html -->
<div class="card">
  <div class="card-header">
    <h3>{{ title }}</h3>
  </div>
  <div class="card-body">
    {{ content }}
  </div>
  @if(footer)
  <div class="card-footer">
    {{ footer }}
  </div>
  @endif
</div>

<!-- components/user-profile.blade.html -->
<div class="user-profile card">
  <div class="user-header">
    <h3>{{ user.name }}</h3>
    @if(user.verified)
    <span class="badge badge-success">Verified</span>
    @endif
  </div>
  <div class="user-body">
    <p><strong>Email:</strong> {{ user.email }}</p>
    <p><strong>Role:</strong> {{ user.role }}</p>
    @if(user.bio)
    <div class="bio">
      <h4>Bio</h4>
      <p>{{ user.bio }}</p>
    </div>
    @endif
  </div>
</div>
```

### Using Components in Templates

```html
<!-- In your template -->
<h2>Basic Alert</h2>
@component('alert', { type: 'info' })
  <strong>Info:</strong> This is an informational message.
@endcomponent

<h2>Card with Footer</h2>
@component('components.card', { title: 'Feature Card', footer: 'Last updated: April 2025' })
  <p>This card component demonstrates props and slot content.</p>
  <ul>
    <li>Supports title prop</li>
    <li>Accepts slot content</li>
    <li>Optional footer</li>
  </ul>
@endcomponent

<h2>User Profile</h2>
@component('components.user-profile', { user: user })
@endcomponent
```

### Custom Component Classes

For more complex components, you can create custom component classes:

```typescript
import { Component } from 'blade-html'

class DataTableComponent extends Component {
  render(): string {
    const { columns, data, sortable = true } = this.props

    let html = '<div class="data-table-container">'
    html += '<table class="data-table">'

    // Generate table header
    html += '<thead><tr>'
    for (const column of columns) {
      html += `<th${sortable ? ' class="sortable"' : ''}>${column.label}</th>`
    }
    html += '</tr></thead>'

    // Generate table body
    html += '<tbody>'
    for (const row of data) {
      html += '<tr>'
      for (const column of columns) {
        html += `<td>${row[column.key] || ''}</td>`
      }
      html += '</tr>'
    }
    html += '</tbody>'

    html += '</table>'
    html += '</div>'

    return html
  }
}

// Register the component
blade.registerComponent('data-table', DataTableComponent)
```

## Directives

BladeHtml comes with several built-in directives and allows you to create custom ones:

### Built-in Directives

```html
<!-- Conditional rendering -->
@if(user.isAdmin)
  <div class="admin-panel">Admin controls here</div>
@elseif(user.isEditor)
  <div class="editor-tools">Editor tools here</div>
@else
  <div class="user-view">Standard user view</div>
@endif

<!-- Loops -->
@foreach(products as product)
  <div class="product-card">
    <h3>{{ product.name }}</h3>
    <p>{{ product.description }}</p>
    <span class="price">{{ product.price }}</span>
  </div>
@endforeach

<!-- JSON output -->
<script>
  const userData = @json(user);
</script>

<!-- Date formatting -->
<p>Published: @date(article.publishedAt, 'toLocaleDateString')</p>

<!-- Conditional classes -->
<div class="@class(['active' => isActive, 'disabled' => isDisabled])">Toggle me</div>

<!-- String concatenation -->
<p>@concat('Welcome back, ' + user.name + '!')</p>

<!-- Raw HTML output (use with caution) -->
<div>@raw(htmlContent)</div>

<!-- Debug output -->
@dump(debugData)
```

### Creating Custom Directives

```typescript
import { BladeHtml } from 'blade-html'
import { ExpressionEvaluator } from 'blade-html/utils/ExpressionEvaluator'

const blade = new BladeHtml()

// Currency formatter directive
blade.registerDirective('currency', (args, data) => {
  try {
    // Parse arguments: @currency(amount, currency, locale)
    const argsMatch = args.match(/^(.*?)(?:,\s*['"](.*?)['"])?(?:,\s*['"](.*?)['"])?$/)
    if (!argsMatch)
      return ''

    const valueExpr = argsMatch[1]
    const currency = argsMatch[2] || 'USD'
    const locale = argsMatch[3] || 'en-US'

    // Safely evaluate the expression
    const value = ExpressionEvaluator.evaluate(valueExpr, data)

    // Format as currency
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(value)
  }
  catch (error) {
    console.error(`Error in @currency directive: ${args}`, error)
    return ''
  }
})

// Pluralize directive
blade.registerDirective('pluralize', (args, data) => {
  try {
    // Parse arguments: @pluralize(count, singular, plural)
    const argsMatch = args.match(/^(.*?)(?:,\s*['"](.*?)['"])?(?:,\s*['"](.*?)['"])?$/)
    if (!argsMatch)
      return ''

    const countExpr = argsMatch[1]
    const singular = argsMatch[2] || 'item'
    const plural = argsMatch[3] || `${singular}s`

    // Safely evaluate the count
    const count = ExpressionEvaluator.evaluate(countExpr, data)

    // Return singular or plural form
    return `${count} ${count === 1 ? singular : plural}`
  }
  catch (error) {
    console.error(`Error in @pluralize directive: ${args}`, error)
    return ''
  }
})

// Usage in templates
blade.registerTemplate('product', `
  <div class="product">
    <h2>{{ product.name }}</h2>
    <p class="price">@currency(product.price, 'EUR', 'de-DE')</p>
    <p class="stock">@pluralize(product.stock, 'item', 'items') in stock</p>
  </div>
`)

const html = blade.render('product', {
  product: {
    name: 'Premium Headphones',
    price: 149.99,
    stock: 12
  }
})
// Output includes: <p class="price">149,99 €</p>
//                 <p class="stock">12 items in stock</p>
```

## Security

BladeHtml prioritizes security in template rendering:

### Safe Expression Evaluation with Filtrex

Instead of using JavaScript's `eval()` or `new Function()` for expression evaluation (which can lead to code injection vulnerabilities), BladeHtml uses [filtrex](https://github.com/joewalnes/filtrex) - a safe expression evaluation library that:

- Provides a controlled environment for evaluating expressions
- Prevents arbitrary code execution
- Limits expressions to a safe subset of operations

```typescript
// How expression evaluation works in BladeHtml
import { ExpressionEvaluator } from 'blade-html/utils/ExpressionEvaluator'

// Safe evaluation of expressions
const result = ExpressionEvaluator.evaluate('user.age > 18 and user.verified', {
  user: { age: 25, verified: true }
})
// result: true

// Safe evaluation of object expressions
const props = ExpressionEvaluator.evaluateObject('{ title: pageTitle, showHeader: isAdmin, count: items.length }', {
  pageTitle: 'Dashboard',
  isAdmin: true,
  items: [1, 2, 3]
})
// props: { title: 'Dashboard', showHeader: true, count: 3 }
```

### Automatic HTML Escaping

All output from `{{ }}` expressions is automatically HTML-escaped to prevent XSS attacks:

```html
<!-- User input is automatically escaped -->
<div class="comment">{{ comment.text }}</div>

<!-- If comment.text contains '<script>alert("XSS")</script>' -->
<!-- Output will be: -->
<div class="comment">&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;</div>
```

### Safe Component Props

When passing data to components, object expressions are safely parsed and evaluated:

```html
<!-- Props are safely evaluated -->
@component('user-card', {
  user: currentUser,
  showActions: userPermissions.canEdit,
  stats: { views: pageStats.views, likes: pageStats.likes }
})
@endcomponent
```

### Controlled Directive Execution

Custom directives are executed in a controlled environment, preventing arbitrary code execution:

```typescript
// Safe directive implementation
blade.registerDirective('highlight', (args, data) => {
  // Args are safely evaluated using Filtrex
  const text = ExpressionEvaluator.evaluate(args, data)
  return `<mark>${String(text)}</mark>`
})
```

## Advanced Usage

### Automatic Template and Component Discovery

```typescript
import { join } from 'node:path'
import { BladeHtml } from 'blade-html'

const blade = new BladeHtml()

// Set template directories
blade.setTemplateDirs([
  join(__dirname, 'templates')
])

// Discover and register templates from namespaces
blade.discoverAndRegisterTemplates('pages')
blade.discoverAndRegisterTemplates('layouts')
blade.discoverAndRegisterTemplates('components')

// Analyze template dependencies and register only used components
const usedComponents = blade.analyzeTemplateDependencies('pages.dashboard')
blade.registerUsedComponents(usedComponents)

// Render the template
const html = blade.render('pages.dashboard', {
  user: getCurrentUser(),
  stats: getDashboardStats()
})
```

### Template Dependency Analysis

BladeHtml can automatically analyze template dependencies to optimize component loading:

```typescript
// Load only what's needed for a specific page
blade.loadTemplatesAndRegisterComponents(
  ['pages', 'layouts', 'components'], // Namespaces to search
  'pages.product-detail' // Initial template to render
)

// This will:
// 1. Discover all templates in the specified namespaces
// 2. Analyze the dependency tree starting from 'pages.product-detail'
// 3. Register only the components that are actually used in the template tree
// 4. Prepare everything for rendering

const html = blade.render('pages.product-detail', { productId: 123 })
```

### Creating a Custom Engine Instance

```typescript
import { BladeHtml } from 'blade-html'
import { Engine } from 'blade-html/core/Engine'
import { TemplateCompiler } from 'blade-html/core/TemplateCompiler'

// Create a custom engine with specific configuration
const customEngine = new Engine()

// Add custom directives to the engine
customEngine.registerDirective('emoji', (args) => {
  const emojis = {
    smile: '😊',
    sad: '😢',
    laugh: '😂',
    heart: '❤️'
  }
  return emojis[args] || ''
})

// Create a BladeHtml instance with the custom engine
const blade = new BladeHtml()
blade.setEngine(customEngine)

// Use the custom engine
blade.registerTemplate('greeting', `
  <div>
    <h1>Hello @emoji(mood)!</h1>
    <p>Welcome to our site</p>
  </div>
`)

const html = blade.render('greeting', { mood: 'smile' })
// Output: <div><h1>Hello 😊!</h1><p>Welcome to our site</p></div>
```

## Project Status

This project was developed by [relliv](https://github.com/relliv) with the help of [Windsurf](https://windsurf.com/editor) and [Claude 3.7 Sonnet](https://www.anthropic.com/news/claude-3-7-sonnet). While the codebase is functional and secure, it's still evolving and may have areas for improvement.

Contributions, bug reports, and feature requests are welcome on the [GitHub repository](https://github.com/relliv/blade-html).

## License

[MIT](./LICENSE) License © [Eyup Erdogan](https://github.com/relliv)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/blade-html?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/blade-html
[npm-downloads-src]: https://img.shields.io/npm/dm/blade-html?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/blade-html
[bundle-src]: https://img.shields.io/bundlephobia/minzip/blade-html?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=blade-html
[license-src]: https://img.shields.io/github/license/relliv/blade-html.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/relliv/blade-html/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/blade-html
