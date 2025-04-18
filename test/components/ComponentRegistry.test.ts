import { describe, expect, it } from 'vitest'
import { Component } from '../../src/components/Component'
import { ComponentRegistry } from '../../src/components/ComponentRegistry'

// Create test component classes
class TestComponent extends Component {
  render(): string {
    return `<div>Test Component: ${this.props.message || 'No message'}</div>`
  }
}

class SlotComponent extends Component {
  render(): string {
    return `<div>${this.slot('default', 'Default content')}</div>`
  }
}

describe('component registry', () => {
  describe('registration and retrieval', () => {
    it('should register and check for components', () => {
      const registry = new ComponentRegistry()

      registry.register('test', TestComponent)

      expect(registry.has('test')).toBe(true)
      expect(registry.has('nonexistent')).toBe(false)
    })

    it('should create component instances', () => {
      const registry = new ComponentRegistry()
      registry.register('test', TestComponent)

      const component = registry.create('test', { message: 'Hello' })

      expect(component).toBeInstanceOf(TestComponent)
      expect(component.render()).toBe('<div>Test Component: Hello</div>')
    })

    it('should throw an error when creating a non-existent component', () => {
      const registry = new ComponentRegistry()

      expect(() => registry.create('nonexistent', {})).toThrow('Component "nonexistent" not found')
    })
  })

  describe('component rendering', () => {
    it('should render a component with props', () => {
      const registry = new ComponentRegistry()
      registry.register('test', TestComponent)

      const result = registry.render('test', { message: 'Hello World' })

      expect(result).toBe('<div>Test Component: Hello World</div>')
    })

    it('should render a component with slots', () => {
      const registry = new ComponentRegistry()
      registry.register('slot-test', SlotComponent)

      const result = registry.render('slot-test', {}, { default: 'Custom content' })

      expect(result).toBe('<div>Custom content</div>')
    })

    it('should render a component with multiple slots', () => {
      class MultiSlotComponent extends Component {
        render(): string {
          return `<div>
            <header>${this.slot('header', '')}</header>
            <main>${this.slot('default', '')}</main>
            <footer>${this.slot('footer', '')}</footer>
          </div>`
        }
      }

      const registry = new ComponentRegistry()
      registry.register('multi-slot', MultiSlotComponent)

      const result = registry.render(
        'multi-slot',
        {},
        {
          default: 'Main content',
          header: 'Header content',
          footer: 'Footer content',
        },
      )

      expect(result).toContain('<header>Header content</header>')
      expect(result).toContain('<main>Main content</main>')
      expect(result).toContain('<footer>Footer content</footer>')
    })
  })

  describe('component listing', () => {
    it('should list all registered components', () => {
      const registry = new ComponentRegistry()

      registry.register('component1', TestComponent)
      registry.register('component2', SlotComponent)

      const components = registry.getNames()

      expect(components).toContain('component1')
      expect(components).toContain('component2')
      expect(components.length).toBe(2)
    })
  })
})
