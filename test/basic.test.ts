import { describe, expect, it } from 'vitest'
import { BladeHtml, Component } from '../src'
import { ExpressionEvaluator } from '../src/utils/ExpressionEvaluator'

describe('bladeHtml', () => {
  it('should render a simple template with variables', () => {
    const blade = new BladeHtml()

    blade.registerTemplate('greeting', `<h1>Hello, {{ name }}!</h1>`)

    const result = blade.render('greeting', { name: 'World' })

    expect(result).toBe('<h1>Hello, World!</h1>')
  })

  it('should handle conditional rendering with @if directive', () => {
    const blade = new BladeHtml()

    blade.registerTemplate('conditional', `
      <div>
        @if(showMessage)
          <p>{{ message }}</p>
        @else
          <p>No message</p>
        @endif
      </div>
    `)

    const resultWithMessage = blade.render('conditional', {
      showMessage: true,
      message: 'Hello there!',
    })

    const resultWithoutMessage = blade.render('conditional', {
      showMessage: false,
    })

    expect(resultWithMessage).toContain('<p>Hello there!</p>')
    expect(resultWithoutMessage).toContain('<p>No message</p>')
  })

  it('should handle loops with @foreach directive', () => {
    const blade = new BladeHtml()

    blade.registerTemplate('loop', `
      <ul>
        @foreach(items as item)
          <li>{{ item }}</li>
        @endforeach
      </ul>
    `)

    const result = blade.render('loop', {
      items: ['Apple', 'Banana', 'Cherry'],
    })

    expect(result).toContain('<li>Apple</li>')
    expect(result).toContain('<li>Banana</li>')
    expect(result).toContain('<li>Cherry</li>')
  })

  it('should support template inheritance with @extends and @section', () => {
    const blade = new BladeHtml()

    blade.registerTemplate('layout', `
      <!DOCTYPE html>
      <html>
      <head>
        <title>@yield('title', 'Default Title')</title>
      </head>
      <body>
        <div class="content">
          @yield('content')
        </div>
      </body>
      </html>
    `)

    blade.registerTemplate('page', `
      @extends('layout')
      
      @section('title')
        My Page Title
      @endsection
      
      @section('content')
        <h1>Welcome to my page!</h1>
        <p>This is the content.</p>
      @endsection
    `)

    const result = blade.render('page')

    // Check for title content, being flexible with whitespace
    expect(result.replace(/\s+/g, ' ')).toContain('<title> My Page Title </title>')
    expect(result).toContain('<h1>Welcome to my page!</h1>')
    expect(result).toContain('<p>This is the content.</p>')
  })

  it('should support components', () => {
    const blade = new BladeHtml()

    class AlertComponent extends Component {
      render(): string {
        const type = this.props.type || 'info'

        return `
          <div class="alert alert-${type}">
            ${this.slot('default', 'Default alert message')}
          </div>
        `
      }
    }

    blade.registerComponent('alert', AlertComponent)

    blade.registerTemplate('page', `
      <div>
        @component('alert', { type: 'warning' })
          <p>This is a warning message!</p>
        @endcomponent
      </div>
    `)

    const result = blade.render('page')

    expect(result).toContain('<div class="alert alert-warning">')
    expect(result).toContain('<p>This is a warning message!</p>')
  })

  it('should support custom directives', () => {
    const blade = new BladeHtml()

    blade.registerDirective('uppercase', (args, data) => {
      try {
        // Evaluate expression using the safer ExpressionEvaluator
        const value = ExpressionEvaluator.evaluate(args, data)
        return String(value).toUpperCase()
      }
      catch {
        return ''
      }
    })

    blade.registerTemplate('page', `<p>@uppercase(name)</p>`)

    const result = blade.render('page', { name: 'John Doe' })

    expect(result).toBe('<p>JOHN DOE</p>')
  })
})
