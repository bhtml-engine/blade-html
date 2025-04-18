# Blade HTML Examples

This directory contains examples demonstrating how to use the Blade HTML template engine, a flexible and secure templating system with automatic template and component discovery.

## Running the Examples

To run the examples, use the following command from the project root:

```bash
pnpm dlx tsx ./examples/index.ts
```

This will generate the rendered HTML in the console and also save it to `dist/output.html`.

## Key Features

### Template System

- **Template Inheritance**: Extend base layouts with `@extends` and define content sections with `@section`/`@endsection`
- **Automatic Template Discovery**: Templates are automatically discovered from directories without manual registration
- **Namespaced Templates**: Support for organizing templates in namespaces (e.g., `layouts.partials.header`)
- **Recursive Loading**: Templates can be loaded from nested subdirectories

### Component System

- **Dynamic Components**: Components with props and slots
- **Lazy Loading**: Components are only registered when actually used in templates
- **Namespaced Components**: Support for both namespaced and non-namespaced component references
- **Slot Content**: Components can define default and named slots

### Expression Evaluation

- **Secure Evaluation**: Uses Filtrex for safe expression evaluation without `eval()` or `new Function()`
- **Variable Interpolation**: Interpolate variables with `{{ expression }}` syntax
- **Conditional Rendering**: Use `@if(condition)`, `@else`, and `@endif` directives
- **Loops**: Iterate over arrays with `@foreach(items as item)` and `@endforeach`

### Directives

- **Built-in Directives**:
  - `@json`: Output JSON representation of a variable
  - `@raw`: Output raw HTML without escaping
  - `@date`: Format dates
  - `@class`: Conditionally add CSS classes
  - `@style`: Generate inline styles
  - `@dump`: Debug output of variables
  - `@concat`: Concatenate strings and expressions

## Project Structure

- `examples/pages/`: Page templates
- `examples/layouts/`: Layout templates and partials
- `examples/components/`: Component templates
- `examples/index.ts`: Main example script

## Advanced Features

- **Template Dependency Analysis**: Automatically analyzes template dependencies
- **Dynamic Path Resolution**: No hardcoded paths for template loading
- **Component Aliasing**: Components can be referenced by multiple names
- **Expression Default Values**: Support for default values with `||` operator
- **Nested Property Access**: Access nested object properties with dot notation

## Directory Structure

The project uses a structured approach to organize templates and components:

```text
examples/
├── pages/                  # Page templates
│   └── home.blade.html     # Main page template that extends layout
├── layouts/                # Layout templates directory
│   ├── main-layout.blade.html  # Main layout template
│   └── partials/           # Partials used in layouts
│       ├── header.blade.html   # Header partial template
│       └── footer.blade.html   # Footer partial template
└── components/             # Component templates
    ├── alert.blade.html    # Alert component template
    ├── badge.blade.html    # Badge component template
    ├── card.blade.html     # Card component template
    └── user-profile.blade.html # User profile component template
```

## Template Usage Examples

### Template Inheritance

Templates can extend other templates using the `@extends` directive:

```html
@extends('layouts.main-layout')

@section('title', 'Blade HTML Examples')

@section('content')
  <h2>Welcome to Blade HTML</h2>
  <!-- Page content here -->
@endsection
```

### Component Usage

Components can be included with the `@component` directive:

```html
@component('components.alert', { type: 'info' })
  <strong>Info:</strong> This is an alert message!
@endcomponent
```

### Namespaced References

Templates and components can be referenced using namespaced notation:

```html
<!-- Include a partial -->
@include('layouts.partials.header')

<!-- Use a component -->
@component('components.card', { title: 'Card Title' })
  Card content here
@endcomponent
```

The example demonstrates two methods for loading templates:

1. **Individual Registration**: Register each template manually
2. **Recursive Loading**: Load all templates from a directory and its subdirectories

```typescript
// Method 1: Register templates individually
blade.registerTemplate('layout', loadTemplate('layouts.layout'))
blade.registerTemplate('alert', loadTemplate('components.alert'))

// Method 2: Load all templates recursively from directory
loadTemplatesFromDirectory('pages', blade)
loadTemplatesFromDirectory('components', blade, 'components')
loadTemplatesFromDirectory('layouts', blade, 'layouts')
```

#### Using Templates from Subdirectories

Templates in subdirectories are registered with dot notation:

```html
<!-- Include a layout partial -->
@include('layouts.partials.header', { title: 'My Title' })

<!-- Include a component template -->
@component('components.alert', { type: 'warning' })
  <strong>Warning:</strong> This is a warning message.
@endcomponent

<!-- Extend a layout template -->
@extends('layouts.layout')
```

### Safe Expression Evaluation

All examples use the `ExpressionEvaluator` utility which leverages filtrex for safer expression evaluation, replacing unsafe `new Function()` and `eval()` calls.

## Component Examples

The examples include several component implementations:

- **Alert Component**: A simple alert box with customizable type
- **Card Component**: A card with header, body, and optional footer
- **User Profile Component**: A more complex component displaying user information

Each component demonstrates different aspects of the component system, including props handling and slot content.
