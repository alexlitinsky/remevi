# Technical Context

## Technology Stack

### Frontend
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- shadcn/ui components

### UI Components
```typescript
// Core shadcn/ui components in use
import {
  Card,
  Tabs,
  Progress,
  Badge,
  Button
} from "@/components/ui";

// Motion components
import { motion, AnimatePresence } from "framer-motion";
```

### State Management
- React hooks (useState, useEffect)
- Context API for global state
- Clerk for auth state
- API integration for data persistence

## Development Setup

### Required Dependencies
```json
{
  "dependencies": {
    "@clerk/nextjs": "latest",
    "framer-motion": "latest",
    "lucide-react": "latest",
    "next": "14.x",
    "react": "18.x",
    "tailwindcss": "latest",
    "@radix-ui/react-tabs": "latest"
  }
}
```

### Component Patterns

#### Tabs Implementation
```typescript
<Tabs defaultValue="progress" className="w-full">
  <TabsList className="grid w-full grid-cols-2">
    <TabsTrigger value="progress">Study Progress</TabsTrigger>
    <TabsTrigger value="achievements">Achievements</TabsTrigger>
  </TabsList>
  <TabsContent value="progress">
    {/* Progress content */}
  </TabsContent>
  <TabsContent value="achievements">
    {/* Achievements content */}
  </TabsContent>
</Tabs>
```

#### Motion Animations
```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.2 }}
>
  {/* Animated content */}
</motion.div>
```

## Tool Usage

### Styling
- Tailwind CSS for responsive design
- CSS variables for theming
- Consistent class naming
- Modular CSS patterns

### Animation
- Framer Motion for transitions
- CSS animations for simple effects
- Coordinated motion sequences
- Performance optimization

## Technical Constraints

### Performance
- Optimized bundle size
- Lazy loading where appropriate
- Efficient state updates
- Minimized re-renders

### Accessibility
- ARIA labels
- Keyboard navigation
- Focus management
- Screen reader support

### Browser Support
- Modern browsers
- Progressive enhancement
- Fallback patterns
- Responsive design

## Development Patterns

### Component Structure
```typescript
// Typical component structure
interface ComponentProps {
  // Props definition
}

export function Component({ ...props }: ComponentProps) {
  // State management
  const [state, setState] = useState();

  // Effects
  useEffect(() => {
    // Side effects
  }, [dependencies]);

  // Event handlers
  const handleEvent = () => {
    // Event logic
  };

  return (
    // JSX with Tailwind classes
  );
}
```

### Data Flow
1. API calls for data
2. State updates
3. UI updates
4. Animation triggers
5. Event handling

## Integration Points

### API Integration
- RESTful endpoints
- Data validation
- Error handling
- Loading states

### Authentication
- Clerk integration
- Protected routes
- User session management
- Auth state handling

### State Management
- Local component state
- Global application state
- Persistent storage
- Cache management

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

## Achievement System Implementation
- Next.js 14 with App Router
- TypeScript for type safety
- Prisma ORM for database management
- PostgreSQL database
- Clerk for authentication
- Tailwind CSS for styling
- Framer Motion for animations
- shadcn/ui components

### Database Models
```prisma
model Achievement {
  id            String @id @default(cuid())
  name          String @unique
  description   String
  category      String
  type          String
  requirements  Json
  badgeIcon     String
  pointsAwarded Int    @default(0)
  userAchievements UserAchievement[]
}

model UserAchievement {
  id            String   @id @default(cuid())
  userId        String
  achievementId String
  unlockedAt    DateTime @default(now())
  notified      Boolean  @default(false)
  user          User     @relation(fields: [userId], references: [id])
  achievement   Achievement @relation(fields: [achievementId], references: [id])
}
```

### API Routes
- `/api/achievements` - GET achievements and user progress
- `/api/achievements/check` - POST check achievement progress

### Components
- `GlobalAchievements` - Main achievement display
- `AchievementGrid` - Achievement card grid
- `AchievementProgress` - Progress tracking
- `AchievementNotification` - Unlock notifications

### Authentication
- Clerk for user management
- Protected API routes
- User-specific achievement tracking

### State Management
- React hooks for local state
- API calls for data fetching
- Clerk hooks for auth state

### Styling
- Tailwind CSS for responsive design
- shadcn/ui for consistent UI
- Custom SVG icons for achievements
- Framer Motion for animations

### Development Tools
- Prisma Studio for database management
- TypeScript for type checking
- ESLint for code quality
- Prettier for code formatting

### Testing
- Jest for unit tests
- React Testing Library for components
- API route testing
- E2E testing with Playwright 