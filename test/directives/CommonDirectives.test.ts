import { describe, expect, it } from 'vitest'
import { CommonDirectives } from '../../src/directives/CommonDirectives'

describe('common directives', () => {
  describe('@json directive', () => {
    it('should convert a value to JSON', () => {
      const data = { user: { name: 'John', age: 30 } }
      const result = CommonDirectives.json('user', data)

      expect(result).toContain('"name": "John"')
      expect(result).toContain('"age": 30')
    })

    it('should handle errors gracefully', () => {
      const data = {}
      const result = CommonDirectives.json('nonexistent', data)

      expect(result).toBeUndefined()
    })
  })

  describe('@raw directive', () => {
    it('should output raw content without escaping', () => {
      const data = { html: '<strong>Bold text</strong>' }
      const result = CommonDirectives.raw('html', data)

      expect(result).toBe('<strong>Bold text</strong>')
    })

    it('should handle null/undefined values', () => {
      const data = { html: null }
      const result = CommonDirectives.raw('html', data)

      expect(result).toBe('')
    })

    it('should handle errors gracefully', () => {
      const data = {}
      const result = CommonDirectives.raw('nonexistent', data)

      expect(result).toBe('')
    })
  })

  describe('@date directive', () => {
    it('should format a date with default format', () => {
      const now = new Date()
      const data = { date: now.toISOString() }
      const result = CommonDirectives.date('date', data)

      expect(result).not.toBe('')
      expect(result).not.toBe('Invalid Date')
    })

    it('should format a date with specified format', () => {
      const data = { date: '2025-01-01T12:00:00Z' }
      const result = CommonDirectives.date('date, "toDateString"', data)

      expect(result).toContain('2025')
    })

    it('should handle invalid dates', () => {
      const data = { date: 'not-a-date' }
      const result = CommonDirectives.date('date', data)

      expect(result).toBe('Invalid Date')
    })

    it('should handle errors gracefully', () => {
      const data = {}
      const result = CommonDirectives.date('nonexistent', data)

      expect(result).toBe('Invalid Date')
    })
  })

  describe('@class directive', () => {
    it('should conditionally add CSS classes', () => {
      const data = { isActive: true, isDisabled: false }
      const result = CommonDirectives.class('[\'active\' => isActive, \'disabled\' => isDisabled]', data)

      expect(result).toBe('active')
    })

    it('should handle multiple true conditions', () => {
      const data = { isActive: true, isPrimary: true }
      const result = CommonDirectives.class('[\'active\' => isActive, \'primary\' => isPrimary]', data)

      expect(result).toBe('active primary')
    })

    it('should handle all false conditions', () => {
      const data = { isActive: false, isDisabled: false }
      const result = CommonDirectives.class('[\'active\' => isActive, \'disabled\' => isDisabled]', data)

      expect(result).toBe('')
    })

    it('should handle errors gracefully', () => {
      const data = {}
      const result = CommonDirectives.class('invalid syntax', data)

      expect(result).toBe('')
    })
  })

  describe('@style directive', () => {
    it('should conditionally add inline styles', () => {
      const data = { color: 'red', display: 'block' }
      const result = CommonDirectives.style('[\'color\' => color, \'display\' => display]', data)

      expect(result).toContain('color: red')
      expect(result).toContain('display: block')
    })

    it('should handle falsy values', () => {
      const data = { color: 'red', display: null }
      const result = CommonDirectives.style('[\'color\' => color, \'display\' => display]', data)

      expect(result).toBe('color: red')
      expect(result).not.toContain('display')
    })

    it('should handle errors gracefully', () => {
      const data = {}
      const result = CommonDirectives.style('invalid syntax', data)

      expect(result).toBe('')
    })
  })

  describe('@dump directive', () => {
    it('should output a debug representation of a variable', () => {
      const data = { user: { name: 'John', age: 30 } }
      const result = CommonDirectives.dump('user', data)

      expect(result).toContain('<pre>')
      expect(result).toContain('"name": "John"')
      expect(result).toContain('"age": 30')
      expect(result).toContain('</pre>')
    })

    it('should handle primitive values', () => {
      const data = { value: 42 }
      const result = CommonDirectives.dump('value', data)

      expect(result).toBe('<pre>42</pre>')
    })

    it('should handle errors gracefully', () => {
      const data = {}
      const result = CommonDirectives.dump('nonexistent', data)

      expect(result).toBe('<pre>undefined</pre>')
    })
  })

  describe('@concat directive', () => {
    it('should concatenate string literals', () => {
      const data = {}
      const result = CommonDirectives.concat('\'Hello, \' + \'World!\'', data)

      expect(result).toBe('Hello, \' + \'World!')
    })

    it('should concatenate variables and string literals', () => {
      const data = { name: 'John' }
      const result = CommonDirectives.concat('\'Hello, \' + name', data)

      expect(result).toBe('Hello, John')
    })

    it('should handle single quoted strings', () => {
      const data = {}
      const result = CommonDirectives.concat('\'Hello, World!\'', data)

      expect(result).toBe('Hello, World!')
    })

    it('should handle double quoted strings', () => {
      const data = {}
      const result = CommonDirectives.concat('"Hello, World!"', data)

      expect(result).toBe('Hello, World!')
    })

    it('should handle single expressions', () => {
      const data = { greeting: 'Hello, World!' }
      const result = CommonDirectives.concat('greeting', data)

      expect(result).toBe('Hello, World!')
    })

    it('should handle errors gracefully', () => {
      const data = {}
      const result = CommonDirectives.concat('nonexistent', data)

      expect(result).toBe('')
    })
  })
})
