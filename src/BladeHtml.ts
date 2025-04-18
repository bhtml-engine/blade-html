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
  private rootDir!: string
  private aliases: Map<string, string> = new Map() // alias => directory

  /**
   * Register an alias (namespace) for a root directory
   * @param alias Alias name (e.g., 'theme1')
   * @param dir Absolute path to the root directory
   */
  public registerAlias(alias: string, dir: string): this {
    this.aliases.set(alias, dir)
    return this
  }

  /**
   * Resolve a template/component name with alias (e.g., theme1::pages.home)
   * Returns { dir, name } if alias found, else null
   */
  private resolveAlias(name: string): { dir: string, name: string } | null {
    const match = name.match(/^([\w-]+)::(.+)$/)
    if (!match)
      return null
    const alias = match[1]
    const rest = match[2]
    const dir = this.aliases.get(alias)
    if (!dir)
      return null
    return { dir, name: rest }
  }

  /**
   * Constructor for BladeHtml
   * @param rootDir Optional root directory for templates and components
   */
  constructor(rootDir: string = dirname(fileURLToPath(import.meta.url))) {
    this.engine = new Engine()
    this.compiler = new TemplateCompiler()
    this.componentRegistry = new ComponentRegistry()
    this.directiveRegistry = new DirectiveRegistry()

    // Register common directives
    this.registerCommonDirectives()

    // If rootDir is provided, set it as the base directory for templates and components
    if (rootDir) {
      this.rootDir = rootDir
      if (existsSync(rootDir)) {
        // Only use subdirectories under rootDir for templates/components
        const templateDirs: string[] = []
        const componentDirs: string[] = []

        const pagesDir = join(rootDir, 'pages')
        const layoutsDir = join(rootDir, 'layouts')
        const componentsDir = join(rootDir, 'components')

        if (existsSync(pagesDir) && statSync(pagesDir).isDirectory()) {
          templateDirs.push(pagesDir)
        }
        if (existsSync(layoutsDir) && statSync(layoutsDir).isDirectory()) {
          templateDirs.push(layoutsDir)
        }
        if (existsSync(componentsDir) && statSync(componentsDir).isDirectory()) {
          componentDirs.push(componentsDir)
        }
        this.setTemplateDirs(templateDirs)
        this.setComponentDirs(componentDirs)
      }
      else {
        console.warn(`Root directory '${rootDir}' does not exist. Using default settings.`)
      }
    }
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
    // Support registering with alias (theme1::pages.home)
    // Always register with the name as provided, do not flatten to dir::name
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
    // Alias support: theme1::components.alert
    const aliasInfo = this.resolveAlias(name)
    if (aliasInfo) {
      const aliasComponentDirs = [
        join(aliasInfo.dir, 'components'),
        join(aliasInfo.dir, 'pages'),
        join(aliasInfo.dir, 'layouts'),
        aliasInfo.dir,
      ]
      for (const dir of aliasComponentDirs) {
        const parts = aliasInfo.name.split('.')
        const possiblePaths: string[] = []
        if (parts.length > 1) {
          const namespace = parts.slice(0, -1).join('/')
          const componentName = parts[parts.length - 1]
          possiblePaths.push(join(dir, namespace, `${componentName}.blade.html`))
          possiblePaths.push(join(dir, `${componentName}.blade.html`))
        }
        else {
          possiblePaths.push(join(dir, `${aliasInfo.name}.blade.html`))
        }
        for (const componentPath of possiblePaths) {
          if (existsSync(componentPath)) {
            const templateContent = readFileSync(componentPath, 'utf-8')
            const ComponentClass = class DynamicComponent extends Component {
              render(): string {
                let content = this.processExpressions(templateContent)
                for (const [slotName, slotContent] of this.slots.entries()) {
                  if (slotName === 'default') {
                    const slotOrContentMatch = content.match(/\{\{\s*(slot|content)\s*\}\}/)
                    if (slotOrContentMatch) {
                      content = content.replace(/\{\{\s*(slot|content)\s*\}\}/, slotContent)
                    }
                  }
                  else {
                    content = content.replace(
                      new RegExp(`\{\{\s*slot\(['"\s]*${slotName}['"\s]*\)\s*\}\}`, 'g'),
                      slotContent,
                    )
                  }
                }
                return content
              }
            }
            this.registerComponent(name, ComponentClass)
            return true
          }
        }
      }
    }
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
                  const slotOrContentMatch = content.match(/\{\{\s*(slot|content)\s*\}\}/)
                  if (slotOrContentMatch) {
                    // Replace only the first occurrence of either {{ slot }} or {{ content }}
                    content = content.replace(/\{\{\s*(slot|content)\s*\}\}/, slotContent)
                  }
                  // else {
                  //   content += slotContent
                  // }
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

    // Move getTemplateContent to be a class method (already defined elsewhere, so remove from here)

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
      const content = this.getTemplateContent(templateName)
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
   * Get template content by name, with alias support
   * @param name Template name
   * @returns Template content string or '' if not found
   */
  public getTemplateContent(name: string): string {
    const aliasInfo = this.resolveAlias(name)
    if (aliasInfo) {
      try {
        return this.engine.getTemplateContent(`${aliasInfo.dir}::${aliasInfo.name}`)
      }
      catch {
        console.warn(`Could not load template (alias): ${name}`)
        return ''
      }
    }
    try {
      return this.engine.getTemplateContent(name)
    }
    catch {
      console.warn(`Could not load template: ${name}`)
      return ''
    }
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
              // Process the template with the component's props and slots
              let content = this.processExpressions(templateContent)

              // Replace slot placeholders with actual slot content
              for (const [slotName, slotContent] of this.slots.entries()) {
                if (slotName === 'default') {
                  // If there's no explicit {{ slot }} placeholder, append the content to the template
                  const slotOrContentMatch = content.match(/\{\{\s*(slot|content)\s*\}\}/)
                  if (slotOrContentMatch) {
                    // Replace only the first occurrence of either {{ slot }} or {{ content }}
                    content = content.replace(/\{\{\s*(slot|content)\s*\}\}/, slotContent)
                    // Do NOT append slotContent at the end if a placeholder was present
                  }
                  // else {
                  //   content += slotContent
                  // }
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
      const namespaceDir = join(this.rootDir, namespace)
      const templateExtension = '.blade.html'

      // Function to recursively process directories
      const processDirectory = (dir: string, namePrefix: string = namespace): void => {
        try {
          if (!existsSync(dir) || !statSync(dir).isDirectory()) {
            // Directory does not exist or is not a directory, skip
            return
          }
          const items = readdirSync(dir)
          if (!Array.isArray(items)) {
            // Not iterable, skip
            return
          }
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
   * @param nameOrContent Template name or inline template content
   * @param data Data for template rendering
   * @param autoLoadDependencies Whether to automatically load dependencies (default: true)
   */
  public render(nameOrContent: string, data: Record<string, any> = {}, autoLoadDependencies: boolean = true): string {
    // Alias error handling: if '::' is present, ensure alias is registered
    if (nameOrContent.includes('::')) {
      const alias = nameOrContent.split('::')[0]
      if (!this.aliases.has(alias)) {
        throw new Error(`Alias '${alias}' is not registered`)
      }
    }
    // Inline template detection
    let isInlineTemplate = false
    let templateName = nameOrContent

    // Check if the template is already registered (including alias resolution)
    let isRegistered = false
    try {
      this.engine.getTemplateContent(templateName)
      isRegistered = true
    }
    catch {
      // Not registered, proceed to inline detection
    }

    if (!isRegistered && (
      nameOrContent.includes('@')
      || nameOrContent.includes('{{')
      || nameOrContent.includes('<')
      || !nameOrContent.match(/^[\w.]+$/)
    )) {
      isInlineTemplate = true
      templateName = `inline_template_${Date.now()}`
      this.registerTemplate(templateName, nameOrContent)
    }
    // Dependency loading
    if (autoLoadDependencies) {
      const defaultNamespaces = ['pages', 'layouts', 'components']
      this.loadTemplatesAndRegisterComponents(defaultNamespaces, templateName)
    }
    this.engine.setData(data)
    // Try rendering the template as registered (including alias form)
    // Ensure we only render if the template exists (without accessing private property)
    try {
      this.engine.getTemplateContent(templateName)
    }
    catch {
      throw new Error(`Template '${templateName}' not found`)
    }
    let content = this.engine.render(templateName)
    if (isInlineTemplate) {
      this.engine.unregisterTemplate(templateName)
    }
    content = ComponentProcessor.process(
      content,
      {
        create: (componentName, props) => {
          if (!this.componentRegistry.has(componentName)) {
            if (!this.loadComponent(componentName)) {
              if (!componentName.includes('.')) {
                const commonNamespaces = ['components']
                for (const namespace of commonNamespaces) {
                  const namespacedName = `${namespace}.${componentName}`
                  if (this.loadComponent(namespacedName)) {
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
    // Register with both directiveRegistry and engine for compatibility
    const builtins = [
      ['json', CommonDirectives.json],
      ['raw', CommonDirectives.raw],
      ['date', CommonDirectives.date],
      ['class', CommonDirectives.class],
      ['style', CommonDirectives.style],
      ['dump', CommonDirectives.dump],
      ['concat', CommonDirectives.concat],
      ['formatDate', CommonDirectives.formatDate],
    ] as const
    for (const [name, handler] of builtins) {
      this.directiveRegistry.register(name, handler)
      this.engine.registerDirective(name, handler)
    }
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
