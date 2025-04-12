/**
 * Registry for managing custom directives
 */
export class DirectiveRegistry {
  private directives: Map<string, DirectiveHandler> = new Map()

  /**
   * Register a directive handler
   * @param name Directive name (without the @ symbol)
   * @param handler Function that processes the directive
   */
  public register(name: string, handler: DirectiveHandler): void {
    this.directives.set(name, handler)
  }

  /**
   * Check if a directive is registered
   * @param name Directive name
   */
  public has(name: string): boolean {
    return this.directives.has(name)
  }

  /**
   * Get a directive handler by name
   * @param name Directive name
   */
  public get(name: string): DirectiveHandler | undefined {
    return this.directives.get(name)
  }

  /**
   * Process a directive with arguments and data
   * @param name Directive name
   * @param args Directive arguments
   * @param data Data context
   */
  public process(name: string, args: string, data: Record<string, any>): string {
    const handler = this.directives.get(name)

    if (!handler) {
      return `<!-- Directive "${name}" not found -->`
    }

    try {
      return handler(args, data)
    }
    catch (error) {
      console.error(`Error processing directive @${name}`, error)
      return `<!-- Error in directive @${name} -->`
    }
  }

  /**
   * Get all registered directive names
   */
  public getNames(): string[] {
    return Array.from(this.directives.keys())
  }
}

/**
 * Directive handler function type
 */
export type DirectiveHandler = (args: string, data: Record<string, any>) => string
