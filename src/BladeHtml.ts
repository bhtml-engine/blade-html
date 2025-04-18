import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Component } from './components/Component'
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
  private templateDirs: string[] = []
  private componentDirs: string[] = []

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
   * Set the template directories to search for templates
   * @param dirs Array of directory paths
   */
  public setTemplateDirs(dirs: string[]): this {
    this.templateDirs = dirs
    return this
  }

  /**
   * Set the component directories to search for components
   * @param dirs Array of directory paths
   */
  public setComponentDirs(dirs: string[]): this {
    this.componentDirs = dirs
    return this
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
   * Dynamically load and register a component
   * @param name Component name (can be namespaced with dots)
   */
  public loadComponent(name: string): boolean {
    // If component is already registered, no need to load it
    if (this.componentRegistry.has(name)) {
      return true
    }

    // Try to find the component in the component directories
    for (const dir of this.componentDirs) {
      // Handle namespaced components (e.g., 'components.alert')
      const parts = name.split('.')
      const possiblePaths: string[] = []

      if (parts.length > 1) {
        // For namespaced components, use the namespace as subdirectory
        const namespace = parts.slice(0, -1).join('/')
        const componentName = parts[parts.length - 1]
        possiblePaths.push(join(dir, namespace, `${componentName}.blade.html`))
        possiblePaths.push(join(dir, `${componentName}.blade.html`)) // Also try without namespace
      }
      else {
        // For non-namespaced components, try several possible locations
        possiblePaths.push(join(dir, `${name}.blade.html`)) // Direct in component dir
        possiblePaths.push(join(dir, 'components', `${name}.blade.html`)) // In components subdir

        // Also try with common namespaces
        const commonNamespaces = ['components']
        for (const namespace of commonNamespaces) {
          const namespacedName = `${namespace}.${name}`
          if (this.componentRegistry.has(namespacedName)) {
            // Create a reference to the component registry for use in the component class
            const componentRegistry = this.componentRegistry

            // Create an alias for the component
            const ComponentClass = class DynamicComponent extends Component {
              render(): string {
                // Create a component instance with the namespaced name
                const component = componentRegistry.create(namespacedName, this.props)
                // Set all slots from this component to the namespaced component
                for (const [slotName, slotContent] of Object.entries(this.slots)) {
                  component.setSlot(slotName, slotContent)
                }
                // Render the namespaced component
                return component.render()
              }
            }
            // Register the component with the non-namespaced name
            this.registerComponent(name, ComponentClass)
            console.warn(`🧩 Registered component alias: ${name} -> ${namespacedName}`)
            return true
          }
        }
      }

      // Try all possible paths
      for (const componentPath of possiblePaths) {
        // Check if the component file exists
        if (existsSync(componentPath)) {
          // Read the component template
          const templateContent = readFileSync(componentPath, 'utf-8')

          // Create a component class from the template that processes expressions
          const ComponentClass = class DynamicComponent extends Component {
            render(): string {
              // Process the template with the component's props and slots
              let content = this.processExpressions(templateContent)

              // Replace slot placeholders with actual slot content
              for (const [slotName, slotContent] of this.slots.entries()) {
                if (slotName === 'default') {
                  // Replace the default slot (content between @component and @endcomponent)
                  // If there's no explicit {{ slot }} placeholder, append the content to the template
                  if (content.includes('{{ slot }}') || content.includes('{{slot}}')) {
                    content = content.replace(/\{\{\s*slot\s*\}\}/g, slotContent)
                  }
                  else {
                    // If no slot placeholder, just append the content at the end
                    content += slotContent
                  }
                }
                else {
                  // Replace named slots
                  content = content.replace(
                    new RegExp(`\\{\\{\\s*slot\\(['"\\s]*${slotName}['"\\s]*\\)\\s*\\}\\}`, 'g'),
                    slotContent,
                  )
                }
              }

              return content
            }
          }

          // Register the component
          this.registerComponent(name, ComponentClass)
          console.warn(`🧩 Dynamically registered component: ${name}`)
          return true
        }
      }
    }

    return false
  }

  /**
   * Analyze template dependencies starting from an initial template
   * @param initialTemplateName The name of the initial template
   * @returns A set of component names used in the template dependency tree
   */
  public analyzeTemplateDependencies(initialTemplateName: string): Set<string> {
    const usedComponents = new Set<string>()
    const processedTemplates = new Set<string>()
    const templateQueue: string[] = [initialTemplateName]

    // Regex patterns for different directives
    const componentRegex = /@component\s*\(\s*['"](([^'"]+))['"]\s*[,)]?/g
    const includeRegex = /@include\s*\(\s*['"](([^'"]+))['"]\s*[,)]?/g
    const extendsRegex = /@extends\s*\(\s*['"](([^'"]+))['"]\s*\)/g
    const yieldRegex = /@yield\s*\(\s*['"](([^'"]+))['"]\s*\)/g
    const sectionRegex = /@section\s*\(\s*['"](([^'"]+))['"]\s*\)/g

    // Helper to add both namespaced and non-namespaced versions of component names
    const addComponentName = (name: string): void => {
      if (name.startsWith('components.') || !name.includes('.')) {
        usedComponents.add(name)

        // If it's a namespaced component, also add the short name
        if (name.startsWith('components.')) {
          usedComponents.add(name.substring('components.'.length))
        }

        // If it's a non-namespaced component, also add with components. prefix
        if (!name.includes('.')) {
          usedComponents.add(`components.${name}`)
        }
      }
    }

    // Helper to extract template names from a content string using a regex
    const extractTemplateNames = (content: string, regex: RegExp): string[] => {
      const names: string[] = []
      regex.lastIndex = 0 // Reset regex state

      let match = regex.exec(content)
      while (match !== null) {
        names.push(match[1])
        match = regex.exec(content)
      }

      return names
    }

    // Function to get template content by name
    const getTemplateContent = (name: string): string => {
      try {
        // Try to get the template content from the engine
        return this.engine.getTemplateContent(name)
      }
      catch {
        // Catch without binding the error variable
        console.warn(`Could not load template: ${name}`)
        return ''
      }
    }

    // Process templates in the queue
    while (templateQueue.length > 0) {
      const templateName = templateQueue.shift()!

      // Skip if already processed
      if (processedTemplates.has(templateName)) {
        continue
      }

      processedTemplates.add(templateName)
      console.warn(`Analyzing template dependencies: ${templateName}`)

      // Get template content
      const content = getTemplateContent(templateName)
      if (!content)
        continue

      // Find all component references - ONLY these are registered as components
      const componentNames = extractTemplateNames(content, componentRegex)
      for (const name of componentNames) {
        // Only register actual components, not templates that are included
        if (name.startsWith('components.') || !name.includes('.')) {
          addComponentName(name)
        }
      }

      // Find all include references and add to queue for template dependency tracking
      // but do NOT register these as components
      const includeNames = extractTemplateNames(content, includeRegex)
      templateQueue.push(...includeNames)

      // Find all extends references and add to queue for template dependency tracking
      // but do NOT register these as components
      const extendsNames = extractTemplateNames(content, extendsRegex)
      templateQueue.push(...extendsNames)

      // Also check for yield and section (though these don't directly reference templates)
      extractTemplateNames(content, yieldRegex)
      extractTemplateNames(content, sectionRegex)
    }

    return usedComponents
  }

  /**
   * Register only the components that are actually used in a template
   * @param usedComponents Set of component names to register
   */
  public registerUsedComponents(usedComponents: Set<string>): void {
    // Register only the components that are actually used
    usedComponents.forEach((componentName: string) => {
      try {
        // Handle both namespaced and non-namespaced component names
        const shortName = componentName.startsWith('components.')
          ? componentName.substring('components.'.length)
          : componentName

        // The full namespaced name for the component
        const fullName = componentName.includes('.')
          ? componentName
          : `components.${componentName}`

        // Skip if already registered
        if (this.componentRegistry.has(shortName) || this.componentRegistry.has(fullName)) {
          return
        }

        // First try to load the component using the existing method
        if (this.loadComponent(componentName)) {
          return
        }

        // If that fails, try to create a component from a template
        try {
          // Get the template content - this will be for a component template
          let templateContent = ''

          // Try with the full name first
          try {
            templateContent = this.engine.getTemplateContent(fullName)
          }
          catch {
            // If that fails, try with the short name
            try {
              templateContent = this.engine.getTemplateContent(shortName)
            }
            catch {
              // If both fail, we can't create a component
              throw new Error(`Could not find template for component: ${componentName}`)
            }
          }

          // Create a component class from the template content
          const ComponentClass = class TemplateComponent extends Component {
            render(): string {
              return templateContent
            }
          }

          // Register with both namespaced and non-namespaced names for compatibility
          this.registerComponent(fullName, ComponentClass)
          this.registerComponent(shortName, ComponentClass)
          console.warn(`🧩 Registered component: ${fullName} (alias: ${shortName})`)
        }
        catch (templateError) {
          console.warn(`⚠️ Could not create component from template: ${templateError}`)
          throw templateError
        }
      }
      catch (error) {
        console.warn(`⚠️ Could not register component ${componentName}: ${error}`)
      }
    })
  }

  /**
   * Load templates from a namespace and analyze dependencies to register only used components
   * @param namespaces Array of namespaces to load templates from
   * @param initialTemplate The initial template to render
   */
  public loadTemplatesAndRegisterComponents(namespaces: string[], initialTemplate: string): void {
    // Discover all templates in the project and register them
    namespaces.forEach((namespace) => {
      try {
        // Try to find templates in this namespace
        this.discoverAndRegisterTemplates(namespace)
      }
      catch (error) {
        console.warn(`Could not load templates from ${namespace}: ${error}`)
      }
    })

    // Analyze dependencies starting from the initial template
    const usedComponents = this.analyzeTemplateDependencies(initialTemplate)
    console.warn('\nComponents used in template dependency tree:')
    usedComponents.forEach((comp: string) => console.warn(`- ${comp}`))

    // Register only the components that are actually used
    this.registerUsedComponents(usedComponents)

    console.warn('✅ All templates loaded successfully!')
  }

  /**
   * Discover and register templates from a namespace
   * @param namespace Namespace to discover templates from
   */
  private discoverAndRegisterTemplates(namespace: string): void {
    console.warn(`Discovering templates in namespace: ${namespace}`)

    try {
      // Get the current directory - use import.meta.url in ESM context
      const currentDir = dirname(fileURLToPath(import.meta.url))
      const namespaceDir = join(currentDir, '..', 'examples', namespace)
      const templateExtension = '.blade.html'

      // Function to recursively process directories
      const processDirectory = (dir: string, namePrefix: string = namespace): void => {
        try {
          const items = readdirSync(dir)

          for (const item of items) {
            const itemPath = join(dir, item)
            const stats = statSync(itemPath)

            if (stats.isDirectory()) {
              // If it's a directory, process it recursively with updated prefix
              const newPrefix = `${namePrefix}.${item}`
              processDirectory(itemPath, newPrefix)
            }
            else if (stats.isFile() && item.endsWith(templateExtension)) {
              // If it's a template file, register it
              const templateName = item.slice(0, -templateExtension.length)
              const fullTemplateName = `${namePrefix}.${templateName}`

              // Read and register the template
              const templateContent = readFileSync(itemPath, 'utf-8')
              this.registerTemplate(fullTemplateName, templateContent)
              console.warn(`📄 Registered template: ${fullTemplateName}`)

              // We no longer register components here - they will be registered on-demand
              // when they're actually used in templates via the registerUsedComponents method
            }
          }
        }
        catch (error) {
          console.warn(`Error processing directory ${dir}: ${error}`)
        }
      }

      // Start processing from the namespace directory
      processDirectory(namespaceDir)
    }
    catch (error) {
      console.warn(`Could not discover templates in namespace ${namespace}: ${error}`)
    }
  }

  /**
   * Render a template with data
   * @param name Template name
   * @param data Data for template rendering
   * @param autoLoadDependencies Whether to automatically load dependencies (default: true)
   */
  public render(name: string, data: Record<string, any> = {}, autoLoadDependencies: boolean = true): string {
    // If autoLoadDependencies is true, load templates and register components
    if (autoLoadDependencies) {
      // Default namespaces to load templates from
      const defaultNamespaces = ['pages', 'layouts', 'components']
      this.loadTemplatesAndRegisterComponents(defaultNamespaces, name)
    }

    this.engine.setData(data)
    let content = this.engine.render(name)

    // Process component directives with dynamic component loading
    content = ComponentProcessor.process(
      content,
      {
        create: (componentName, props) => {
          // Try to load the component if it's not already registered
          if (!this.componentRegistry.has(componentName)) {
            // First try to load the component with the exact name
            if (!this.loadComponent(componentName)) {
              // If not found, try with common namespaces for non-namespaced components
              if (!componentName.includes('.')) {
                const commonNamespaces = ['components']
                for (const namespace of commonNamespaces) {
                  const namespacedName = `${namespace}.${componentName}`
                  if (this.loadComponent(namespacedName)) {
                    // If found with namespace, create an alias
                    const componentRegistry = this.componentRegistry
                    const ComponentClass = class DynamicComponent extends Component {
                      render(): string {
                        const component = componentRegistry.create(namespacedName, this.props)
                        for (const [slotName, slotContent] of Object.entries(this.slots)) {
                          component.setSlot(slotName, slotContent)
                        }
                        return component.render()
                      }
                    }
                    this.registerComponent(componentName, ComponentClass)
                    console.warn(`🧩 Dynamically registered component: ${componentName}`)
                    break
                  }
                }
              }
            }
          }

          try {
            return this.componentRegistry.create(componentName, props)
          }
          catch (error) {
            console.error(`Error creating component ${componentName}:`, error)
            return undefined
          }
        },
      },
      data,
    )

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
