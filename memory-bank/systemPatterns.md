# System Patterns

## Architecture Overview
```mermaid
graph TD
    UI[UI Layer] --> API[API Layer]
    API --> DB[Database]
    API --> AI[AI Processing]
    
    subgraph UI Layer
        Pages[Pages] --> Components[Components]
        Components --> States[State Management]
    end
    
    subgraph API Layer
        Routes[API Routes] --> Controllers[Controllers]
        Controllers --> Services[Services]
    end
    
    subgraph AI Processing
        PDF[PDF Processing] --> Chunks[Chunking]
        Chunks --> OpenAI[OpenAI API]
        OpenAI --> MindMap[Mind Map]
    end
```

## Key Design Patterns

### 1. Processing State Pattern
```typescript
type ProcessingStage = 'CHUNKING' | 'GENERATING' | 'MINDMAP' | 'COMPLETED' | 'ERROR';

interface ProcessingState {
  progress: number;
  stage: ProcessingStage;
  processedChunks: number;
  totalChunks: number;
  error?: string;
}
```

### 2. Component Patterns
1. State Components:
   ```typescript
   interface StateProps {
     deck?: DeckData;
     onRetry?: () => void;
   }
   ```

2. Progress Tracking:
   ```typescript
   const useProgress = (deckId: string) => {
     const [progress, setProgress] = useState(0);
     // Polling logic
     return { progress, stage, error };
   };
   ```

### 3. API Patterns
1. Route Handlers:
   ```typescript
   export async function GET(req: Request) {
     try {
       // Auth check
       // Data fetch
       // Response
     } catch (error) {
       // Error handling
     }
   }
   ```

2. Progress Updates:
   ```typescript
   async function updateProgress(deckId: string, progress: number) {
     await db.deck.update({
       where: { id: deckId },
       data: { processingProgress: progress }
     });
   }
   ```

## Component Relationships

### 1. Study Session Flow
```mermaid
graph LR
    Page[Page] --> DeckLoader[DeckLoader]
    DeckLoader --> ProcessingState[ProcessingState]
    DeckLoader --> StudyState[StudyState]
    ProcessingState --> HomeButton[HomeButton]
    StudyState --> FlashCard[FlashCard]
```

### 2. Processing Flow
```mermaid
graph TD
    Upload[Upload] --> Process[Process]
    Process --> Chunk[Chunk]
    Chunk --> Generate[Generate]
    Generate --> MindMap[MindMap]
    MindMap --> Complete[Complete]
```

## Critical Implementation Paths

### 1. Document Processing
1. Upload & Validation
2. PDF Chunking
3. OpenAI Processing
4. Mind Map Generation
5. Progress Tracking

### 2. Study Session
1. Deck Loading
2. State Determination
3. Progress Monitoring
4. State Transitions
5. User Interaction

## Error Handling Patterns

### 1. API Errors
```typescript
interface APIError {
  code: string;
  message: string;
  details?: unknown;
}

function handleAPIError(error: unknown): APIError {
  // Error transformation logic
}
```

### 2. UI Error States
```typescript
interface ErrorState {
  type: 'processing' | 'network' | 'validation';
  message: string;
  retry?: () => void;
}
```

## State Management

### 1. Processing State
```typescript
const ProcessingContext = createContext<{
  stage: ProcessingStage;
  progress: number;
  error?: string;
}>(null);
```

### 2. Study Session State
```typescript
interface StudySessionState {
  currentCard: number;
  totalCards: number;
  completed: boolean;
}
```

## Data Flow Patterns

### 1. Progress Updates
```mermaid
graph TD
    API[API] --> DB[Database]
    DB --> Poll[Polling]
    Poll --> UI[UI Update]
    UI --> User[User Feedback]
```

### 2. Error Propagation
```mermaid
graph TD
    Error[Error] --> Handler[Error Handler]
    Handler --> State[State Update]
    State --> UI[UI Update]
    UI --> User[User Feedback]
```

## Technical Decisions

### Framework Choices
1. Next.js 14 with App Router
2. TypeScript for type safety
3. Tailwind CSS for styling
4. Framer Motion for animations
5. Zustand for state management

### Code Organization
1. Component Structure:
   ```
   components/
     quiz/
       Quiz.tsx
       QuizQuestion.tsx
       QuizConfigModal.tsx
       QuizResults.tsx
       FRQAnswerSection.tsx
   ```

2. State Management:
   ```
   stores/
     useQuizStore.ts
     useSettingsStore.ts
     useAchievementStore.ts
   ```

3. Types:
   ```
   types/
     quiz.ts
     settings.ts
   ```

### Testing Strategy
1. Unit tests for core logic
2. Integration tests for quiz flow
3. E2E tests for critical paths
4. Accessibility testing

### Future Considerations
1. Performance monitoring
2. Analytics integration
3. Mobile optimization
4. Offline support
5. Multi-language support

## State Management

### Quiz Session Management
1. Session Validation
   ```typescript
   isValidSession: () => {
     return Boolean(
       sessionId && 
       questions.length > 0 &&
       currentQuestionIndex < questions.length &&
       answers && 
       Object.keys(answers).length > 0
     );
   }
   ```

2. Session Persistence
   - Use Zustand persist middleware
   - Persist critical state:
     - Questions and answers
     - Current progress
     - UI state (view, explanations)
   - Clear session on explicit actions

3. Session Recovery
   - Validate session on quiz start
   - Restore UI state with answers
   - Preserve explanation visibility
   - Handle incomplete sessions

### UI/UX Patterns

1. Visual Hierarchy
   - Card-based layouts for content grouping
   - Gradient backgrounds for primary actions
   - Consistent button heights:
     - Primary: h-14
     - Secondary: h-12
   - Visual feedback for states:
     - Correct/incorrect answers
     - Loading states
     - Active states

2. Interactive Elements
   - Button States:
     - Hover: scale(1.02)
     - Active: scale(0.98)
     - Loading: Custom spinner
     - Disabled: Reduced opacity
   - Input Fields:
     - Clear focus states
     - Error highlighting
     - Multiline support where needed
   - Navigation:
     - Consistent back buttons
     - Clear exit points
     - Progress indicators

3. Animations
   - Button hover/active states
   - Loading states
   - View transitions
   - Feedback animations
   - Modal transitions

## Component Architecture

1. Quiz Components
   - QuizConfigModal: Configuration and quiz start
   - QuizQuestion: Question display and interaction
   - QuizResults: Results display and analytics
   - FRQAnswerSection: Free response handling

2. State Flow
   ```
   Config -> Quiz -> Results
      ^        |
      |________|
   (via settings)
   ```

3. Session Flow
   ```
   New Quiz -> Configure -> Start
   Return   -> Validate -> Resume/Reset
   Settings -> Cleanup  -> New Config
   ```

## Data Patterns

1. Quiz State
   - Core state (questions, answers)
   - UI state (view, loading)
   - Progress tracking
   - Session management

2. Persistence Strategy
   - Local storage for session data
   - API endpoints for quiz operations
   - Error handling for network issues

3. Type Safety
   - Strong typing for quiz state
   - Question type discrimination
   - Answer validation

## Error Handling

1. Session Errors
   - Invalid session recovery
   - Network failures
   - State corruption

2. User Feedback
   - Toast notifications
   - Error boundaries
   - Loading states

## Performance Considerations

1. State Updates
   - Batch related changes
   - Minimize persistence payload
   - Optimize re-renders

2. Session Management
   - Clear invalid sessions
   - Handle large answer sets
   - Manage storage limits

3. Achievement Checks
   - Batch processing
   - Caching strategies
   - Efficient queries

4. Points Updates
   - Atomic operations
   - Transaction handling
   - Cache invalidation

## Technical Implementation

### Achievement Check Flow
```mermaid
graph TD
    Action[User Action] --> Check[Check Achievements]
    Check --> Unlock[Unlock New Achievements]
    Unlock --> Notify[Show Notification]
    Notify --> Update[Update User Profile]
```

### Points Calculation
```typescript
interface PointsCalculation {
  quiz: {
    accuracy: number;
    streak: number;
    timeBonus: number;
  };
  flashcard: {
    difficulty: Difficulty;
    streak: number;
    sessionBonus: number;
  };
}
```

## Future Considerations

1. Social Features
   - Achievement sharing
   - Leaderboards
   - Community challenges

2. Analytics
   - Achievement stats
   - User progress
   - Engagement metrics

3. Expansion
   - New achievement types
   - Custom badges
   - Special events 

## Achievement System Architecture
- Achievement data model:
  ```typescript
  interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    requirements: {
      type: string;
      value: number;
    };
    unlocked: boolean;
    progress: number;
  }
  ```
- Categories: study, mastery, streak, points
- Progress tracking per achievement
- Unlocking logic based on user actions
- API endpoints:
  - GET /api/achievements - Fetch all achievements and user progress
  - POST /api/achievements/check - Check and update achievement progress

## Component Architecture
- GlobalAchievements: Main achievement display component
- AchievementGrid: Reusable grid layout for achievements
- Achievement progress indicators and unlock animations
- Integration with user authentication (Clerk)

## Database Schema
- Achievement model in Prisma
- UserAchievement junction table for tracking unlocked achievements
- Progress tracking fields in UserProgress model

## State Management
- Achievement data fetched and managed in components
- User authentication state via Clerk
- Progress tracking through API endpoints

## API Structure
- RESTful endpoints for achievement management
- Achievement check middleware for tracking progress
- User authentication middleware for protected routes

## UI/UX Patterns
- Achievement cards with progress indicators
- Category-based filtering
- Loading states with skeleton UI
- Responsive grid layout
- Achievement unlock animations

## Error Handling
- API error states
- Loading states
- Fallback UI for missing data
- Authentication error handling

## Testing Strategy
- Unit tests for achievement logic
- Integration tests for API endpoints
- E2E tests for achievement unlocking flow

## Security
- User authentication required for achievement endpoints
- Achievement verification server-side
- Protected routes and API endpoints 

## UI Architecture

### Component Organization
- Modular components with clear separation of concerns
- Shared UI components in `@/components/ui`
- Feature-specific components in dedicated directories
- Consistent use of shadcn/ui components

### State Management
- React hooks for local state
- Context providers for global state
- Clerk for authentication state
- Progress tracking via API endpoints

### Layout Patterns
- Responsive grid systems
- Card-based content organization
- Tabbed interfaces for related content
- Motion animations for enhanced UX

## Key Design Patterns

### Progress Tracking
```typescript
interface StudyProgress {
  cardsReviewed: number;
  totalCards: number;
  masteryLevel: number;
  minutesStudied: number;
  studySessions: number;
  currentStreak: number;
  weeklyActivity: number[];
  recentMastery: { date: string; mastery: number }[];
  totalPoints: number;
}
```

### Achievement System
- Global achievements tracking
- Progress-based unlocking
- Category-based organization
- Visual feedback system

### UI Components
1. Cards
   - Consistent styling with primary/10 borders
   - Backdrop blur effects
   - Motion animations
   - Responsive layouts

2. Tabs
   - Grid-based tab lists
   - Animated content transitions
   - Clear visual hierarchy
   - Content-specific layouts

3. Progress Indicators
   - Animated progress bars
   - Weekly activity charts
   - Stats cards with icons
   - Dynamic updates

## Implementation Paths

### Progress Display
1. Fetch progress data
2. Update UI components
3. Handle loading states
4. Animate transitions

### Achievement Integration
1. Load achievements data
2. Display in grid layout
3. Track progress
4. Update unlocked status

### Combined Features
1. Unified card container
2. Tabbed navigation
3. Shared state management
4. Consistent styling

## Critical Flows

### Progress Tracking
```mermaid
graph TD
    A[User Action] --> B[Update Progress]
    B --> C[Save to Backend]
    C --> D[Update UI]
    D --> E[Trigger Achievements]
```

### Achievement System
```mermaid
graph TD
    A[Check Progress] --> B[Compare Thresholds]
    B --> C[Update Status]
    C --> D[Show Notification]
    D --> E[Update Display]
```

## Component Relationships
- Main page contains progress card
- Progress card contains tabs
- Tabs manage progress and achievements
- Shared state between components
- Consistent styling throughout 