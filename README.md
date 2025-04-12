# BladeHtml

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

A Blade-like template engine for TypeScript, inspired by [Laravel](https://laravel.com/)'s [Blade](https://laravel.com/docs/12.x/blade) template engine.

> [!CAUTION]
> This is a work in progress and may have bugs. Use at your own risk.

## Features

- **Template Inheritance**: Extend layouts with `@extends` and define sections with `@section`/`@endsection`
- **Components**: Create reusable UI components with props and slots
- **Directives**: Use built-in directives like `@if`, `@foreach`, `@include` or create custom ones
- **Expressions**: Output variables with `{{ $var }}` syntax with automatic HTML escaping
- **Raw Output**: Output unescaped HTML with `{!! $var !!}` syntax
- **Type Safety**: Fully written in TypeScript with type definitions
- **Security**: Uses [filtrex](https://github.com/joewalnes/filtrex) for safe expression evaluation without `eval` or `new Function`

## Installation

```bash
pnpm add blade-html
# or
npm install blade-html
# or
yarn add blade-html
```

## Quick Start

```typescript
import { BladeHtml } from 'blade-html'

// Create a new BladeHtml instance
const blade = new BladeHtml()

// Register a template
blade.registerTemplate('greeting', `
  <div>
    <h1>Hello, {{ name }}!</h1>
    @if(showMessage)
      <p>{{ message }}</p>
    @endif
  </div>
`)

// Render the template with data
const html = blade.render('greeting', {
  name: 'World',
  showMessage: true,
  message: 'Welcome to BladeHtml!'
})

console.log(html)
```

## Template Inheritance

BladeHtml supports template inheritance similar to Laravel's Blade:

```typescript
// Layout template
blade.registerTemplate('layout', `
<!DOCTYPE html>
<html>
<head>
  <title>@yield('title', 'Default Title')</title>
</head>
<body>
  <header>
    @yield('header')
  </header>

  <main>
    @yield('content')
  </main>

  <footer>
    @yield('footer', '&copy; ' + new Date().getFullYear())
  </footer>
</body>
</html>
`)

// Page template
blade.registerTemplate('page', `
@extends('layout')

@section('title')
  My Page Title
@endsection

@section('header')
  <h1>Welcome to My Page</h1>
@endsection

@section('content')
  <p>This is the main content of the page.</p>
@endsection
`)

// Render the page
const html = blade.render('page')
```

## Components

Create reusable components with props and slots:

```typescript
import { Component } from 'blade-html'

// Define a component class
class AlertComponent extends Component {
  render(): string {
    const type = this.props.type || 'info'

    return `
      <div class="alert alert-${type}">
        <strong>${type.toUpperCase()}:</strong>
        ${this.slot('default', 'Default alert message')}
      </div>
    `
  }
}

// Register the component
blade.registerComponent('alert', AlertComponent)

// Use the component in a template
blade.registerTemplate('page', `
  <div>
    @component('alert', { type: 'warning' })
      <p>This is a warning message!</p>
    @endcomponent
  </div>
`)
```

## Custom Directives

Create custom directives to extend the template engine:

```typescript
import { ExpressionEvaluator } from 'blade-html/utils/ExpressionEvaluator'

// Register a custom directive
blade.registerDirective('uppercase', (args, data) => {
  try {
    // Safely evaluate the expression using ExpressionEvaluator
    const value = ExpressionEvaluator.evaluate(args, data)
    return String(value).toUpperCase()
  }
  catch {
    return ''
  }
})

// Use the custom directive in a template
blade.registerTemplate('page', `
  <div>
    <p>@uppercase(name)</p>
  </div>
`)

// Render with data
const html = blade.render('page', { name: 'John Doe' })
// Output: <div><p>JOHN DOE</p></div>
```

## Security

BladeHtml prioritizes security in template rendering:

### Safe Expression Evaluation

Instead of using JavaScript's `eval()` or `new Function()` for expression evaluation (which can lead to code injection vulnerabilities), BladeHtml uses [filtrex](https://github.com/joewalnes/filtrex) - a safe expression evaluation library that:

- Provides a controlled environment for evaluating expressions
- Prevents arbitrary code execution
- Limits expressions to a safe subset of operations

### HTML Escaping

All output from `{{ }}` expressions is automatically HTML-escaped to prevent XSS attacks. Use the `{!! !!}` syntax only when you explicitly need to output unescaped HTML and you trust the content.

### Object Expression Handling

When passing data to components or includes, object expressions are safely parsed and evaluated without using `eval` or `new Function`.

## Written by AI

This project was written by [relliv](https://github.com/relliv) with the help of [Windsurf](https://windsurf.com/editor) and [Claude 3.7 Sonnet](https://www.anthropic.com/news/claude-3-7-sonnet) model. All the codes and structure are not thought planned and are created experimentally with the sole purpose of creating a blade-like experience. Please be careful when using it.

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
