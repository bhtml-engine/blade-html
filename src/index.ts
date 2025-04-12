/**
 * BladeHtml - A Blade-like template engine for TypeScript
 */

// Core exports
export { BladeHtml } from './BladeHtml'
// Component system exports
export { Component } from './components/Component'
export { ComponentRegistry } from './components/ComponentRegistry'
export { BaseTemplate } from './core/BaseTemplate'

export { Engine } from './core/Engine'
export { TemplateCompiler } from './core/TemplateCompiler'

export { CommonDirectives } from './directives/CommonDirectives'
// Directive system exports
export { DirectiveRegistry } from './directives/DirectiveRegistry'
export type { DirectiveHandler } from './directives/DirectiveRegistry'
