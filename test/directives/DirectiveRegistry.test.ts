import { describe, expect, it } from 'vitest'
import { DirectiveRegistry } from '../../src/directives/DirectiveRegistry'

describe('directive registry', () => {
  describe('registration and retrieval', () => {
    it('should register and check for directives', () => {
      const registry = new DirectiveRegistry()

      registry.register('test', () => 'test result')

      expect(registry.has('test')).toBe(true)
      expect(registry.has('nonexistent')).toBe(false)
    })

    it('should get directive handlers', () => {
      const registry = new DirectiveRegistry()
      const handler = () => 'test result'

      registry.register('test', handler)

      expect(registry.get('test')).toBe(handler)
      expect(registry.get('nonexistent')).toBeUndefined()
    })
  })

  describe('directive processing', () => {
    it('should process directives with arguments and data', () => {
      const registry = new DirectiveRegistry()

      registry.register('uppercase', (args, data) => {
        const value = data[args.trim()]
        return value ? value.toUpperCase() : ''
      })

      const result = registry.process('uppercase', 'name', { name: 'John' })

      expect(result).toBe('JOHN')
    })

    it('should handle errors in directive processing', () => {
      const registry = new DirectiveRegistry()

      registry.register('error', () => {
        throw new Error('Test error')
      })

      const result = registry.process('error', '', {})

      expect(result).toContain('<!-- Error in directive @error -->')
    })

    it('should handle non-existent directives', () => {
      const registry = new DirectiveRegistry()

      const result = registry.process('nonexistent', '', {})

      expect(result).toBe('<!-- Directive "nonexistent" not found -->')
    })
  })

  describe('directive listing', () => {
    it('should list all registered directives', () => {
      const registry = new DirectiveRegistry()

      registry.register('directive1', () => '')
      registry.register('directive2', () => '')

      const directives = registry.getNames()

      expect(directives).toContain('directive1')
      expect(directives).toContain('directive2')
      expect(directives.length).toBe(2)
    })
  })
})
