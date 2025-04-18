import { describe, expect, it } from 'vitest'
import { Component } from '../../src/components/Component'

// Create a concrete implementation of the abstract Component class for testing
class TestComponent extends Component {
  render(): string {
    return this.processExpressions('<div>{{ message }}</div>')
  }
}

describe('component', () => {
  describe('basic functionality', () => {
    it('should process expressions in templates', () => {
      const component = new TestComponent({ message: 'Hello World' })
      expect(component.render()).toBe('<div>Hello World</div>')
    })

    it('should handle missing variables gracefully', () => {
      const component = new TestComponent({})
      expect(component.render()).toBe('<div></div>')
    })

    it('should escape HTML in expressions', () => {
      const component = new TestComponent({ message: '<script>alert("XSS")</script>' })
      expect(component.render()).toBe('<div>&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;</div>')
    })
  })

  describe('slots', () => {
    it('should handle default slots', () => {
      class SlotComponent extends Component {
        render(): string {
          return `<div>${this.slot()}</div>`
        }
      }

      const component = new SlotComponent()
      component.setSlot('default', 'Default content')
      expect(component.render()).toBe('<div>Default content</div>')
    })

    it('should handle named slots', () => {
      class SlotComponent extends Component {
        render(): string {
          return `<div>
            <header>${this.slot('header', '')}</header>
            <main>${this.slot('content', 'Default content')}</main>
            <footer>${this.slot('footer', '')}</footer>
          </div>`
        }
      }

      const component = new SlotComponent()
      component.setSlot('header', 'Header content')
      component.setSlot('footer', 'Footer content')

      const rendered = component.render()
      expect(rendered).toContain('<header>Header content</header>')
      expect(rendered).toContain('<main>Default content</main>')
      expect(rendered).toContain('<footer>Footer content</footer>')
    })

    it('should use default content when slot is not provided', () => {
      class SlotComponent extends Component {
        render(): string {
          return `<div>${this.slot('default', 'Default content')}</div>`
        }
      }

      const component = new SlotComponent()
      expect(component.render()).toBe('<div>Default content</div>')
    })
  })

  describe('conditional rendering', () => {
    it('should handle @if directive', () => {
      class ConditionalComponent extends Component {
        render(): string {
          return this.processExpressions('@if(show)Visible@endif')
        }
      }

      const component1 = new ConditionalComponent({ show: true })
      const component2 = new ConditionalComponent({ show: false })

      expect(component1.render()).toBe('Visible')
      expect(component2.render()).toBe('')
    })

    it('should handle @if/@else directive', () => {
      class ConditionalComponent extends Component {
        render(): string {
          return this.processExpressions('@if(show)Visible@elseHidden@endif')
        }
      }

      const component1 = new ConditionalComponent({ show: true })
      const component2 = new ConditionalComponent({ show: false })

      expect(component1.render()).toBe('Visible')
      expect(component2.render()).toBe('Hidden')
    })

    it('should handle complex conditions', () => {
      class ConditionalComponent extends Component {
        render(): string {
          return this.processExpressions('@if(count > 5)Many@elseA few@endif')
        }
      }

      const component1 = new ConditionalComponent({ count: 10 })
      const component2 = new ConditionalComponent({ count: 3 })

      expect(component1.render()).toBe('Many')
      expect(component2.render()).toBe('A few')
    })

    it('should handle simple conditions', () => {
      class ConditionalComponent extends Component {
        render(): string {
          return this.processExpressions('@if(a)True@elseFalse@endif')
        }
      }

      const component1 = new ConditionalComponent({ a: true })
      const component2 = new ConditionalComponent({ a: false })

      expect(component1.render()).toBe('True')
      expect(component2.render()).toBe('False')
    })
  })

  describe('expression evaluation', () => {
    it('should handle simple property access', () => {
      class ExprComponent extends Component {
        render(): string {
          return this.processExpressions('{{ name }}')
        }
      }

      const component = new ExprComponent({ name: 'John' })
      expect(component.render()).toBe('John')
    })

    it('should handle nested property access', () => {
      class ExprComponent extends Component {
        render(): string {
          return this.processExpressions('{{ user.name }}')
        }
      }

      const component = new ExprComponent({ user: { name: 'John' } })
      expect(component.render()).toBe('John')
    })

    it('should handle default values with || operator', () => {
      class ExprComponent extends Component {
        render(): string {
          return this.processExpressions('{{ name || \'Guest\' }}')
        }
      }

      const component1 = new ExprComponent({ name: 'John' })
      const component2 = new ExprComponent({})

      expect(component1.render()).toBe('John')
      expect(component2.render()).toBe('Guest')
    })

    it('should handle expressions with content variable', () => {
      class SlotComponent extends Component {
        render(): string {
          return this.processExpressions('<div>{{ content }}</div>')
        }
      }

      const component = new SlotComponent()
      component.setSlot('default', 'Slot content')
      expect(component.render()).toBe('<div>Slot content</div>')
    })

    it('should handle expressions with content || default', () => {
      class SlotComponent extends Component {
        render(): string {
          return this.processExpressions('<div>{{ content || \'Default\' }}</div>')
        }
      }

      const component1 = new SlotComponent()
      component1.setSlot('default', 'Slot content')

      const component2 = new SlotComponent()

      expect(component1.render()).toBe('<div>Slot content</div>')
      expect(component2.render()).toBe('<div>Default</div>')
    })
  })
})
