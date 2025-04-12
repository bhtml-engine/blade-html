import type { Component } from './Component'
import { ExpressionEvaluator } from '../utils/ExpressionEvaluator'

/**
 * Helper class to process component directives in templates
 */
export class ComponentProcessor {
  /**
   * Process @component directives in a template
   * @param content Template content
   * @param componentRegistry Component registry to get components from
   * @param componentRegistry.create Function to create components
   * @param data Data context for evaluating expressions
   * @returns Processed content with components rendered
   */
  public static process(
    content: string,
    componentRegistry: { create: (name: string, props: Record<string, any>) => Component | undefined },
    data: Record<string, any>,
  ): string {
    return content.replace(/@component\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*(\{.*?\})\s*)?\)([\s\S]*?)@endcomponent/g, (_, componentName, propsExpr, slotContent) => {
      try {
        // Get the component from the registry
        const component = componentRegistry.create(componentName, {})

        if (!component) {
          return `<!-- Component "${componentName}" not found -->`
        }

        // Parse props if provided
        let props = {}
        if (propsExpr) {
          // Evaluate props expression using the safer ExpressionEvaluator
          props = ExpressionEvaluator.evaluateObject(propsExpr, data)
        }

        // Set component props
        Object.assign(component.props, props)

        // Set default slot content
        component.setSlot('default', slotContent.trim())

        // Render the component
        return component.render()
      }
      catch (error) {
        console.error(`Error processing component ${componentName}:`, error)
        return `<!-- Error rendering component "${componentName}" -->`
      }
    })
  }
}
