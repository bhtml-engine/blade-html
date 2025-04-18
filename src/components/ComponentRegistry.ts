import type { Component } from './Component'

/**
 * Registry for managing and rendering components
 */
export class ComponentRegistry {
  private components: Map<string, new (props: Record<string, any>) => Component> = new Map()

  /**
   * Register a component class with a name
   * @param name Component name
   * @param componentClass Component class constructor
   */
  public register(name: string, componentClass: new (props: Record<string, any>) => Component): void {
    this.components.set(name, componentClass)
  }

  /**
   * Check if a component is registered
   * @param name Component name
   */
  public has(name: string): boolean {
    return this.components.has(name)
  }

  /**
   * Create a component instance
   * @param name Component name
   * @param props Component properties
   */
  public create(name: string, props: Record<string, any> = {}): Component {
    const ComponentClass = this.components.get(name)

    if (!ComponentClass) {
      throw new Error(`Component "${name}" not found`)
    }

    return new ComponentClass(props)
  }

  /**
   * Render a component with props and slots
   * @param name Component name
   * @param props Component properties
   * @param slots Named slots with content
   */
  public render(
    name: string,
    props: Record<string, any> = {},
    slots: Record<string, string> = {},
  ): string {
    const component = this.create(name, props)

    // Set slots
    for (const [slotName, content] of Object.entries(slots)) {
      component.setSlot(slotName, content)
    }

    return component.render()
  }

  /**
   * Get all registered component names
   */
  public getNames(): string[] {
    return Array.from(this.components.keys())
  }
}
