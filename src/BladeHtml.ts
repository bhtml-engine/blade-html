import { ComponentProcessor } from './components/ComponentProcessor'
import { ComponentRegistry } from './components/ComponentRegistry'
import { Engine } from './core/Engine'
import { TemplateCompiler } from './core/TemplateCompiler'
import { CommonDirectives } from './directives/CommonDirectives'
import { DirectiveRegistry } from './directives/DirectiveRegistry'

/**
 * Main BladeHtml class that brings together all the components of the template engine
 */
export class BladeHtml {
  private engine: Engine
  private compiler: TemplateCompiler
  private componentRegistry: ComponentRegistry
  private directiveRegistry: DirectiveRegistry

  /**
   * Constructor for BladeHtml
   */
  constructor() {
    this.engine = new Engine()
    this.compiler = new TemplateCompiler()
    this.componentRegistry = new ComponentRegistry()
    this.directiveRegistry = new DirectiveRegistry()

    // Register common directives
    this.registerCommonDirectives()
  }

  /**
   * Register a template with a name
   * @param name Template name
   * @param content Template content
   */
  public registerTemplate(name: string, content: string): this {
    this.engine.registerTemplate(name, content)
    return this
  }

  /**
   * Register a component
   * @param name Component name
   * @param componentClass Component class constructor
   */
  public registerComponent(name: string, componentClass: any): this {
    this.componentRegistry.register(name, componentClass)
    return this
  }

  /**
   * Register a custom directive
   * @param name Directive name (without the @ symbol)
   * @param handler Function that processes the directive
   */
  public registerDirective(name: string, handler: (args: string, data: Record<string, any>) => string): this {
    this.directiveRegistry.register(name, handler)
    this.engine.registerDirective(name, handler)
    return this
  }

  /**
   * Render a template with data
   * @param name Template name
   * @param data Data for template rendering
   */
  public render(name: string, data: Record<string, any> = {}): string {
    this.engine.setData(data)
    let content = this.engine.render(name)

    // Process component directives
    content = ComponentProcessor.process(content, this.componentRegistry, data)

    return content
  }

  /**
   * Compile a template string into a render function
   * @param template Template string
   */
  public compile(template: string): (data: Record<string, any>) => string {
    return this.compiler.compile(template)
  }

  /**
   * Render a component with props and slots
   * @param name Component name
   * @param props Component properties
   * @param slots Named slots with content
   */
  public renderComponent(
    name: string,
    props: Record<string, any> = {},
    slots: Record<string, string> = {},
  ): string {
    return this.componentRegistry.render(name, props, slots)
  }

  /**
   * Register common directives
   */
  private registerCommonDirectives(): void {
    this.registerDirective('json', CommonDirectives.json)
    this.registerDirective('raw', CommonDirectives.raw)
    this.registerDirective('date', CommonDirectives.date)
    this.registerDirective('class', CommonDirectives.class)
    this.registerDirective('style', CommonDirectives.style)
    this.registerDirective('dump', CommonDirectives.dump)
  }

  /**
   * Get the engine instance
   */
  public getEngine(): Engine {
    return this.engine
  }

  /**
   * Get the component registry
   */
  public getComponentRegistry(): ComponentRegistry {
    return this.componentRegistry
  }

  /**
   * Get the directive registry
   */
  public getDirectiveRegistry(): DirectiveRegistry {
    return this.directiveRegistry
  }
}
