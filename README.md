# Prayer

An Angular 20 app scaffolded with NgRx for state management, persisted to `localStorage`, and styled with Angular Material using a brown-themed palette. The focus is on managing Lists, Topics, and Requests; the Prayer section is intentionally left unimplemented for now.

## Features

- State management with NgRx (entity adapters for lists, topics, requests)
- Local persistence via a meta-reducer that hydrates from and writes to `localStorage`
- Angular Material UI with a centered title header and a floating add button on each page
- Lists page: card layout with rounded borders and a right-aligned badge showing topic counts; tap to open Topics; swipe right to delete with confirmation
- Topics page: scoped by selected list (via route `topics/:listId`), back button to Lists
- Requests page: simple list of requests with created date

Tip: To reset data, clear the app's local storage key in your browser devtools (usually under Application > Local Storage > `prayer-app-state`).

## Development server

To start a local development server, run:

```bash
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use:

```bash
npm test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Architecture overview

- NgRx root store with slices: `lists`, `topics`, `requests`
- Local storage meta-reducer for persistence/hydration
- Standalone components and lazy-loaded routes:
	- `/` → Lists
	- `/topics/:listId` → Topics for a specific list
	- `/requests` → Requests

Key files:

- `src/app/store/` — store setup, reducers, actions, selectors
- `src/app/features/` — Lists, Topics, Requests components
- `src/app/shared/` — dialogs and directives (e.g., swipe-to-delete)

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
