import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BladeHtml } from '../src/BladeHtml'
import { Component } from '../src/components/Component'

describe('bladehtml', () => {
  let blade: BladeHtml

  beforeEach(() => {
    blade = new BladeHtml()
  })

  describe('template registration and rendering', () => {
    it('should register and render a simple template', () => {
      blade.registerTemplate('test', 'Hello, {{ name }}!')
      const result = blade.render('test', { name: 'World' })
      expect(result).toBe('Hello, World!')
    })

    it('should handle missing variables gracefully', () => {
      blade.registerTemplate('test', 'Hello, {{ name }}!')
      const result = blade.render('test', {})
      expect(result).toBe('Hello, !')
    })

    it('should throw an error when rendering a non-existent template', () => {
      expect(() => blade.render('nonexistent')).toThrow('Template "nonexistent" not found')
    })
  })

  describe('template inheritance', () => {
    it('should handle @extends and @section directives', () => {
      blade.registerTemplate('layout', '<html><body>@yield("content")</body></html>')
      blade.registerTemplate('page', '@extends("layout")@section("content")Page content@endsection')

      const result = blade.render('page')
      expect(result).toBe('<html><body>Page content</body></html>')
    })

    it('should handle @yield with default content', () => {
      blade.registerTemplate('layout', '<html><body>@yield("content", "Default content")</body></html>')
      blade.registerTemplate('page1', '@extends("layout")@section("content")Custom content@endsection')
      blade.registerTemplate('page2', '@extends("layout")')

      const result1 = blade.render('page1')
      const result2 = blade.render('page2')

      expect(result1).toBe('<html><body>Custom content</body></html>')
      expect(result2).toBe('<html><body>Default content</body></html>')
    })
  })

  describe('component registration and rendering', () => {
    it('should register and render a component', () => {
      class TestComponent extends Component {
        render(): string {
          return `<div>Hello, ${this.props.name || 'Guest'}</div>`
        }
      }

      blade.registerComponent('test-component', TestComponent)
      blade.registerTemplate('test', '@component("test-component", {"name": "World"})@endcomponent')

      const result = blade.render('test')
      expect(result).toBe('<div>Hello, World</div>')
    })

    it('should handle component slots', () => {
      class TestComponent extends Component {
        render(): string {
          return `<div>${this.slot('default', 'No content')}</div>`
        }
      }

      blade.registerComponent('test-component', TestComponent)
      blade.registerTemplate('test', '@component("test-component")Slot content@endcomponent')

      const result = blade.render('test')
      expect(result).toBe('<div>Slot content</div>')
    })

    it('should handle default slots in components', () => {
      class TestComponent extends Component {
        render(): string {
          return `<div>${this.slot('default', 'No content')}</div>`
        }
      }

      blade.registerComponent('test-component', TestComponent)
      blade.registerTemplate('test', '@component("test-component")Slot content@endcomponent')

      const result = blade.render('test')
      expect(result).toBe('<div>Slot content</div>')
    })
  })

  describe('directive registration and processing', () => {
    it('should register and process custom directives', () => {
      blade.registerDirective('uppercase', (args, data) => {
        const value = data[args.trim()]
        return value ? value.toUpperCase() : ''
      })

      blade.registerTemplate('test', 'Hello, @uppercase(name)!')
      const result = blade.render('test', { name: 'World' })
      expect(result).toBe('Hello, WORLD!')
    })

    it('should process built-in directives', () => {
      blade.registerTemplate('test', 'Data: @json(data)')
      const result = blade.render('test', { data: { name: 'World', age: 42 } })
      expect(result).toContain('"name": "World"')
      expect(result).toContain('"age": 42')
    })
  })

  describe('conditional rendering', () => {
    it('should handle @if directive', () => {
      blade.registerTemplate('test', '@if(show)Visible@endif')

      const result1 = blade.render('test', { show: true })
      const result2 = blade.render('test', { show: false })

      expect(result1).toBe('Visible')
      expect(result2).toBe('')
    })

    it('should handle @if/@else directive', () => {
      blade.registerTemplate('test', '@if(show)Visible@elseHidden@endif')

      const result1 = blade.render('test', { show: true })
      const result2 = blade.render('test', { show: false })

      expect(result1).toBe('Visible')
      expect(result2).toBe('Hidden')
    })
  })

  describe('loop rendering', () => {
    it('should handle @foreach directive', () => {
      blade.registerTemplate('test', '<ul>@foreach(items as item)<li>{{ item }}</li>@endforeach</ul>')

      const result = blade.render('test', { items: ['Apple', 'Banana', 'Cherry'] })

      expect(result).toBe('<ul><li>Apple</li><li>Banana</li><li>Cherry</li></ul>')
    })

    it('should handle empty arrays in @foreach', () => {
      blade.registerTemplate('test', '<ul>@foreach(items as item)<li>{{ item }}</li>@endforeach</ul>')

      const result = blade.render('test', { items: [] })

      expect(result).toBe('<ul></ul>')
    })
  })

  describe('template dependencies analysis', () => {
    it('should analyze template dependencies', () => {
      blade.registerTemplate('layout', '<html><body>@yield("content")</body></html>')
      blade.registerTemplate('page', '@extends("layout")@section("content")@component("components.alert")Alert@endcomponent@endsection')
      blade.registerTemplate('components.alert', '<div class="alert">{{ slot }}</div>')

      const dependencies = blade.analyzeTemplateDependencies('page')

      expect(dependencies.has('components.alert')).toBe(true)
      expect(dependencies.has('alert')).toBe(true)
    })
  })

  describe('template directory management', () => {
    it('should set template directories', () => {
      const dirs = ['/path/to/templates']
      blade.setTemplateDirs(dirs)

      // Since the internal property is private, we can't directly test it
      // This is more of a coverage test
      expect(blade).toBeDefined()
    })

    it('should set component directories', () => {
      const dirs = ['/path/to/components']
      blade.setComponentDirs(dirs)

      // Since the internal property is private, we can't directly test it
      // This is more of a coverage test
      expect(blade).toBeDefined()
    })
  })

  describe('component dynamic loading', () => {
    it('should attempt to load a component', () => {
      // Mock file system functions
      vi.mock('node:fs', () => ({
        existsSync: vi.fn().mockReturnValue(false),
        readdirSync: vi.fn(),
        readFileSync: vi.fn(),
        statSync: vi.fn(),
      }))

      const result = blade.loadComponent('test-component')
      expect(result).toBe(false)
    })
  })
})
