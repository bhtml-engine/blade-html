# Blade HTML Examples

This directory contains examples demonstrating how to use the Blade HTML template engine.

## Running the Examples

To run the examples, use the following command from the project root:

```bash
pnpm dlx tsx ./examples/index.ts
```

## Example Features

### Basic Template Features

- Template inheritance with `@extends` and `@section`
- Components with props and slots
- Conditional rendering with `@if/@else`
- Loops with `@foreach`
- Custom directives
- Variable interpolation with safe expression evaluation

### Recursive Template Loading

The examples demonstrate how to load templates recursively from subdirectories. This is useful for organizing templates in larger projects.

#### Directory Structure

```text
layouts/                    # Root-level layouts directory
├── layout.blade.html       # Main layout template
└── partials/               # Partials used in layouts
    ├── header.blade.html   # Header partial template
    └── footer.blade.html   # Footer partial template

examples/
├── pages/                  # Page templates
│   └── page.blade.html     # Page template that extends layout
└── components/             # Component templates
    ├── alert.blade.html    # Alert component template
    ├── card.blade.html     # Card component template
    └── user-profile.blade.html # User profile component template
```

#### Loading Templates Recursively

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
