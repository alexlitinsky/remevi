# Technical Context

## Technology Stack

### Frontend
1. Framework
   - Next.js 14 (App Router)
   - React 18
   - TypeScript 5

2. Styling
   - Tailwind CSS
   - Shadcn/ui components
   - CSS Modules (where needed)

3. State Management
   - Zustand for global state
   - React hooks for local state
   - Server state with Next.js

4. Animation
   - Framer Motion
   - CSS transitions
   - Tailwind animations

### Development Tools
1. Package Management
   - PNPM
   - TypeScript
   - ESLint
   - Prettier

2. Version Control
   - Git
   - GitHub

3. Development Environment
   - VS Code
   - Chrome DevTools
   - React DevTools

## Implementation Details

### Component Architecture
1. Quiz Components
   ```typescript
   // Quiz types
   type QuizType = 'mcq' | 'frq' | 'mixed';
   
   // Question types
   interface BaseQuestion {
     id: string;
     question: string;
     type: QuizType;
     hint?: string;
   }
   
   interface MCQQuestion extends BaseQuestion {
     type: 'mcq';
     options: string[];
     correctAnswer: string;
   }
   
   interface FRQQuestion extends BaseQuestion {
     type: 'frq';
     correctAnswer: string;
   }
   ```

2. State Management
   ```typescript
   // Quiz store
   interface QuizState {
     questions: (MCQQuestion | FRQQuestion)[];
     currentQuestionIndex: number;
     answers: Record<string, Answer>;
     view: 'config' | 'quiz' | 'results';
   }
   ```

### Key Features

1. Keyboard Navigation
   ```typescript
   // MCQ shortcuts
   const handleKeyPress = (e: KeyboardEvent) => {
     if (e.key >= '1' && e.key <= '4') {
       // Handle number keys
     }
     if (e.key === 'Enter' || e.key === ' ') {
       // Handle submission
     }
   };
   ```

2. Animation System
   ```typescript
   // Framer Motion variants
   const variants = {
     initial: { opacity: 0, y: 20 },
     animate: { opacity: 1, y: 0 },
     exit: { opacity: 0, y: -20 }
   };
   ```

## Development Setup

### Environment Requirements
- Node.js 18+
- PNPM 8+
- Git

### Project Structure
```
src/
├── app/                 # Next.js app router
├── components/
│   ├── quiz/           # Quiz components
│   └── ui/             # Shared UI components
├── stores/             # Zustand stores
├── types/              # TypeScript types
├── lib/                # Utilities
└── styles/             # Global styles
```

### Build & Deploy
1. Development
   ```bash
   pnpm dev
   ```

2. Production
   ```bash
   pnpm build
   pnpm start
   ```

## Technical Constraints

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ features
- CSS Grid and Flexbox

### Performance
1. Bundle Size
   - Component code splitting
   - Dynamic imports
   - Tree shaking

2. Runtime
   - Memoization
   - Debounced events
   - Optimized re-renders

### Accessibility
1. ARIA Support
   - Proper roles
   - Keyboard navigation
   - Screen reader support

2. Color Contrast
   - WCAG 2.1 compliance
   - Dark mode support

## Dependencies

### Core
```json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "zustand": "^4.0.0",
  "framer-motion": "^10.0.0",
  "tailwindcss": "^3.0.0",
  "@shadcn/ui": "latest"
}
```

### Development
```json
{
  "@types/react": "^18.0.0",
  "@typescript-eslint/eslint-plugin": "^6.0.0",
  "eslint": "^8.0.0",
  "prettier": "^3.0.0"
}
```

## Tool Usage Patterns

### State Management
1. Zustand Stores
   - Atomic updates
   - Selector optimization
   - Action creators

2. React Hooks
   - Custom hooks
   - Memoization
   - Effect cleanup

### Component Patterns
1. Composition
   - Higher-order components
   - Render props
   - Custom hooks

2. Performance
   - useMemo
   - useCallback
   - React.memo

## Known Technical Limitations
1. Browser Storage
   - LocalStorage limits
   - Session persistence

2. Performance
   - Animation frame drops
   - Large state updates

3. Mobile
   - Keyboard handling
   - Touch interactions

## Future Technical Considerations
1. Performance Monitoring
   - Analytics integration
   - Error tracking
   - Performance metrics

2. Offline Support
   - Service workers
   - State persistence
   - Sync management

3. Scalability
   - Code splitting
   - Lazy loading
   - Cache management 