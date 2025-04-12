import { BladeHtml, Component } from '../src/index'

// Create a new BladeHtml instance
const blade = new BladeHtml()

// Define a layout template
const layoutTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>@yield('title', 'Default Title')</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      background-color: #f4f4f4;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 5px;
    }
    footer {
      margin-top: 30px;
      padding: 20px;
      background-color: #f4f4f4;
      text-align: center;
      border-radius: 5px;
    }
    .container {
      padding: 20px;
    }
    .card {
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 15px;
      margin-bottom: 15px;
    }
  </style>
</head>
<body>
  <header>
    <h1>@yield('header', 'Default Header')</h1>
  </header>

  <div class="container">
    @yield('content')
  </div>

  <footer>
    &copy; @date(new Date().getFullYear()) BladeHtml Example
  </footer>
</body>
</html>
`

// Define a page template that extends the layout
const pageTemplate = `
@extends('layout')

@section('title')
  BladeHtml Example - Home Page
@endsection

@section('header')
  Welcome to BladeHtml
@endsection

@section('content')
  <div class="card">
    <h2>About BladeHtml</h2>
    <p>BladeHtml is a Blade-like template engine for TypeScript, inspired by Laravel's Blade templating system.</p>
  </div>

  <div class="card">
    <h2>Features</h2>
    <ul>
      @foreach(features as feature)
        <li>{{ feature }}</li>
      @endforeach
    </ul>
  </div>

  @if(showExtraContent)
    <div class="card">
      <h2>Extra Content</h2>
      <p>This content is conditionally shown.</p>
    </div>
  @endif

  @include('alert', { type: 'info', message: 'This is an example alert component.' })

  <div class="card">
    <h2>User Profile</h2>
    @component('user-profile', { user })
  </div>
@endsection
`

// Define a simple alert component template
const alertTemplate = `
<div class="alert alert-{{ type }}" style="padding: 15px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: {{ type === 'info' ? '#d1ecf1' : type === 'warning' ? '#fff3cd' : '#f8d7da' }};">
  <strong>{{ type.charAt(0).toUpperCase() + type.slice(1) }}!</strong> {{ message }}
</div>
`

// Define a user profile component class
class UserProfileComponent extends Component {
  render(): string {
    // eslint-disable-next-line unused-imports/no-unused-vars
    const user = this.props.user || {}

    return `
      <div class="user-profile">
        <h3>{{ user.name }}</h3>
        <p><strong>Email:</strong> {{ user.email }}</p>
        <p><strong>Role:</strong> {{ user.role }}</p>
        
        @if(user.bio)
          <div class="bio">
            <h4>Bio</h4>
            <p>{{ user.bio }}</p>
          </div>
        @endif
        
        ${this.slot('default', '<p>No additional information provided.</p>')}
      </div>
    `
  }
}

// Register templates and components
blade.registerTemplate('layout', layoutTemplate)
blade.registerTemplate('page', pageTemplate)
blade.registerTemplate('alert', alertTemplate)
blade.registerComponent('user-profile', UserProfileComponent)

// Define data for rendering
const data = {
  features: [
    'Template inheritance with @extends and @section',
    'Components with props and slots',
    'Conditional rendering with @if/@else',
    'Loops with @foreach',
    'Custom directives',
    'Variable interpolation',
  ],
  showExtraContent: true,
  user: {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'Administrator',
    bio: 'John is a software developer with 5 years of experience in web development.',
  },
}

// Render the page template with data
const renderedHtml = blade.render('page', data)

// Output the rendered HTML
console.warn(renderedHtml)

// You could also write to a file
// import { writeFileSync } from 'fs';
// writeFileSync('output.html', renderedHtml);
