# Technical Context

## Technology Stack
1. Frontend:
   - Next.js 14 (App Router)
   - TypeScript
   - Tailwind CSS
   - Shadcn/ui Components
   - Zustand (State Management)

2. UI Components:
   - Dialog (Modal system)
   - Select (Dropdown menus)
   - Slider (Numeric input)
   - Button (Actions)
   - Progress (Status indicators)

3. State Management:
   - Zustand for global state
   - React hooks for local state
   - localStorage for persistence
   - URL state for navigation

## Development Setup
1. Package Management:
   - pnpm (preferred)
   - Strict dependency versioning
   - Development scripts

2. Code Organization:
   ```
   src/
   ├── components/
   │   └── quiz/
   │       ├── QuizHeader.tsx
   │       ├── QuizQuestion.tsx
   │       └── QuizConfigModal.tsx
   ├── stores/
   │   └── useQuizStore.ts
   ├── types/
   │   └── quiz.ts
   └── lib/
       └── quiz.ts
   ```

3. Styling:
   - Tailwind CSS for utilities
   - CSS modules for components
   - Global styles for theme
   - CSS variables for tokens

## Technical Constraints
1. Browser Support:
   - Modern browsers only
   - ES6+ features
   - CSS Grid/Flexbox
   - Local storage

2. Performance:
   - Client-side rendering
   - State persistence
   - Keyboard event handling
   - Modal rendering

3. Accessibility:
   - Keyboard navigation
   - ARIA attributes
   - Focus management
   - Screen reader support

## Tool Usage
1. Development:
   - VS Code
   - ESLint
   - Prettier
   - TypeScript

2. Testing:
   - Jest
   - React Testing Library
   - Cypress (planned)

3. Build:
   - Next.js build system
   - PostCSS processing
   - Bundle optimization

## Dependencies
1. Core:
   ```json
   {
     "next": "^14.0.0",
     "react": "^18.0.0",
     "typescript": "^5.0.0",
     "tailwindcss": "^3.0.0",
     "zustand": "^4.0.0"
   }
   ```

2. UI:
   ```json
   {
     "@radix-ui/react-dialog": "^1.0.0",
     "@radix-ui/react-select": "^1.0.0",
     "@radix-ui/react-slider": "^1.0.0",
     "class-variance-authority": "^0.7.0",
     "lucide-react": "^0.300.0"
   }
   ```

3. Development:
   ```json
   {
     "@types/react": "^18.0.0",
     "eslint": "^8.0.0",
     "prettier": "^3.0.0"
   }
   ```

## Implementation Notes
1. Modal System:
   - Using shadcn Dialog
   - Custom positioning
   - Theme integration
   - Keyboard handling

2. State Management:
   - Atomic updates
   - Selector optimization
   - Persistence strategy
   - Error recovery

3. Event Handling:
   - Keyboard shortcuts
   - Focus management
   - Event delegation
   - Cleanup routines

## Current Tooling
1. VS Code Extensions:
   - Tailwind CSS IntelliSense
   - ESLint
   - Prettier
   - TypeScript

2. Browser Tools:
   - React DevTools
   - Redux DevTools
   - Chrome DevTools
   - Accessibility tools

3. CLI Tools:
   - pnpm
   - next
   - eslint
   - tsc

## Development Practices

### Code Organization
- Feature-based structure
- Shared components
- Type definitions
- Utility functions

### Testing Strategy
- Unit tests (Jest)
- Integration tests
- E2E tests (Playwright)
- Performance monitoring

### CI/CD
- Vercel deployment
- GitHub Actions
- Automated testing
- Environment management

## Current Technical Focus
1. Quiz session stability
2. Timer accuracy
3. State persistence
4. Error handling
5. Performance optimization 