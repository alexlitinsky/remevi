# Technical Context

## Tech Stack
- Next.js 14 with App Router
- TypeScript
- Prisma ORM
- Tailwind CSS
- shadcn/ui components
- OpenAI API for AI processing
- PDF processing libraries
- Framer Motion for animations
- Clerk for authentication

## Development Setup
- Package Manager: pnpm
- Database: PostgreSQL
- Authentication: Clerk
- API Routes: Next.js API routes
- State Management: React hooks + Context API + Custom stores

## Technical Constraints
1. PDF Processing:
   - Limited by OpenAI token limits
   - Processing time varies with document size
   - Chunking needed for large documents
   - Progress tracking through polling (2s interval)
   - State persistence during page refreshes needed

2. Real-time Updates:
   - Using polling for progress updates
   - No WebSocket implementation yet
   - Progress tracking through database updates
   - Need caching for processing state

3. Database Schema:
   - Deck model includes processing fields:
     - processingProgress: Float
     - processingStage: Enum
     - processedChunks: Int
     - totalChunks: Int
     - error: String?
   - Achievement system models:
     - Achievement: Core achievement data
     - UserAchievement: Junction table for user achievements
     - Points: User points tracking
     - Streaks: User study streaks

## Dependencies
- Core:
  - next: ^14.0.0
  - react: ^18.0.0
  - typescript: ^5.0.0
  - prisma: ^5.0.0
  - tailwindcss: ^3.0.0
  - @clerk/nextjs: Latest
  - openai: Latest
  - framer-motion: Latest
  - zustand: Latest

- UI:
  - @radix-ui/react-*: Latest
  - shadcn/ui: Latest
  - lucide-react: Latest
  - @heroicons/react: Latest

- Development:
  - eslint: Latest
  - prettier: Latest
  - typescript-eslint: Latest
  - tailwindcss-animate: Latest

## Tool Usage
1. PDF Processing:
   - Custom chunking algorithm
   - OpenAI for content generation
   - Progress tracking at each stage
   - Dynamic mind map generation

2. Database Operations:
   - Prisma Client for all DB operations
   - Transaction support for atomic updates
   - Real-time progress tracking
   - Upsert pattern for constraint management

3. UI Components:
   - shadcn/ui for base components
   - Custom components for specific features
   - Tailwind for styling
   - Framer Motion for animations

## API Structure
1. `/api/generate-chunks`:
   - Handles PDF processing
   - Updates progress in stages
   - Returns processing status

2. `/api/deck/[id]`:
   - GET: Fetches deck status
   - Updates: Through separate endpoints

3. `/api/achievements`:
   - GET: Retrieves all achievements and user progress
   - POST: Admin/system updates to achievements

4. `/api/achievements/check`:
   - POST: Checks for newly unlocked achievements
   - Handles point awards
   - Returns newly unlocked achievements

## Error Handling
1. Processing Errors:
   - Stored in deck.error
   - Displayed in UI
   - Allows retry

2. API Errors:
   - Standard HTTP status codes
   - Error messages in response
   - Client-side error boundaries

3. Achievement System:
   - Upsert pattern to prevent constraint violations
   - Try-catch blocks to continue processing on individual failures
   - Structured error logging

## Performance Considerations
1. Processing:
   - Batch operations where possible
   - Progress updates at meaningful intervals
   - Careful memory management

2. UI:
   - Optimistic updates
   - Debounced polling
   - Smooth progress animations

3. Achievement System:
   - Efficient database queries
   - Batch achievement checks
   - Caching unlocked achievements

## Security
1. Authentication:
   - Clerk for user management
   - Protected API routes
   - User-specific data access

2. Data:
   - Input validation
   - SQL injection prevention
   - Rate limiting on API routes

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
- Custom stores for component state

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
    "@radix-ui/react-tabs": "latest",
    "prisma": "latest"
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
- Custom scrollbar styling

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

### Session Management
```typescript
// Session handling pattern
const useStudySessionStore = create<StudySessionStore>((set, get) => ({
  // State fields
  sessionId: null,
  sessionStartTime: null,
  
  // Actions
  startSession: async () => {
    const { sessionId } = get();
    
    // Clean up existing session if any
    if (sessionId) {
      await get().endSession();
    }
    
    // Create new session
    // ...
  },
  
  endSession: async () => {
    // Clean up properly
    set({
      sessionId: null,
      sessionStartTime: null
    });
    // ...
  }
}));
```

### Achievement System
```typescript
// Achievement check endpoint
export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { quizScore, streakDays, cardsStudied } = body;
    
    // Check achievements logic
    // ...
    
    // Use upsert pattern for new achievements
    await db.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId: user.id,
          achievementId: achievement.id,
        },
      },
      update: {
        notified: false,
      },
      create: {
        userId: user.id,
        achievementId: achievement.id,
        notified: false
      }
    });
    
    // ...
  } catch (error) {
    console.error('[ACHIEVEMENTS_CHECK]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
```

## Development Setup

### Environment Requirements
- Node.js 18+
- PNPM 8+
- Git
- PostgreSQL

### Project Structure
```
src/
├── app/                 # Next.js app router
│   └── api/             # API routes
├── components/
│   ├── achievements/    # Achievement components
│   ├── deck/            # Deck components
│   ├── quiz/            # Quiz components
│   ├── session-v2/      # Study session components
│   └── ui/              # Shared UI components
├── hooks/               # Custom React hooks
├── stores/              # State stores
├── types/               # TypeScript types
├── lib/                 # Utilities
└── styles/              # Global styles
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
  "framer-motion": "^10.0.0",
  "tailwindcss": "^3.0.0",
  "@clerk/nextjs": "latest",
  "prisma": "^5.0.0"
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
1. Custom Stores
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
  
  @@unique([userId, achievementId])
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
- `DeckAchievements` - Deck-specific achievements

### Mind Map Visualization
- Advanced hierarchical layout algorithm
- Graph analysis for node importance
- Custom scrollbar styling
- Type-based node styling
- Multi-stage positioning algorithm
- Connection rendering and labeling 

## Quiz System Implementation

### Question Types
- MCQ (Multiple Choice Questions)
  - Options array with correct index
  - Type-safe implementation
  - Difficulty levels
  - Hints support

- FRQ (Free Response Questions)
  - Multiple correct answers
  - Case sensitivity option
  - Type-safe implementation
  - Difficulty levels
  - Hints support

### Type System
```typescript
type StudyContentWithQuestions = {
  id: string;
  question: string;
  hint: string | null;
  topic: string;
  mcqContent: {
    options: string[];
    correctOptionIndex: number;
  } | null;
  frqContent: {
    answers: string[];
  } | null;
};

type QuizDifficulty = 'easy' | 'medium' | 'hard';
```

### Component Structure
```
components/
  quiz/
    MCQQuestion.tsx
    FRQQuestion.tsx
    QuizProgress.tsx
    QuizResults.tsx
    QuizTimer.tsx
```

### State Management
- Question state handling
- Answer tracking
- Score calculation
- Progress persistence
- Timer implementation (planned) 