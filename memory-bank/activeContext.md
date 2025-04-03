# Active Context

## Current Focus: Quiz Implementation

### Quiz Component Architecture
The quiz system has been simplified into a clean, state-driven architecture:

1. **Main Components**:
   - `Quiz`: Root component managing view states
   - `QuizConfigModal`: Configuration UI for quiz setup
   - `QuizQuestion`: Question display and answer handling
   - `QuizResults`: Final results and statistics

2. **State Management**:
   - Using `useQuizStore` for centralized state
   - Views: 'config' | 'quiz' | 'results'
   - Handles quiz type selection, question progression, and scoring

3. **Quiz Flow**:
   ```mermaid
   graph LR
   A[Config] --> B[Questions]
   B --> C[Results]
   C --> A
   ```

### Recent Changes
- Simplified QuizConfigModal to be a card-based component
- Removed dialog/modal behavior in favor of direct rendering
- Integrated quiz components into the deck quiz page
- Removed QuizProvider and QuizLayout in favor of simpler architecture

### Active Decisions
1. Fixed question count at 10 for initial implementation
2. Using radio group for quiz type selection (mixed, MCQ, FRQ)
3. Immediate feedback on answers
4. Simple, focused UI with clear progression

### Next Steps
1. Implement question generation API
2. Add question count configuration
3. Consider adding quiz history
4. Add progress indicators
5. Implement quiz analytics

### Technical Patterns
- Client-side state management with Zustand
- Server-side data fetching for deck info
- Progressive enhancement with immediate feedback
- Responsive design with Tailwind CSS

### User Experience Goals
- Simple, intuitive quiz setup
- Clear feedback on progress
- Engaging question-answer flow
- Comprehensive results view

## Active Decisions
1. Modal Design:
   - Using fixed positioning with inset-0 for perfect centering
   - Maintaining dark theme consistency
   - Responsive design with 90vw width and max-width constraints

2. Quiz Interaction:
   - Supporting both letter and number key inputs for accessibility
   - Maintaining state between sessions for better UX

## Project Insights
1. UI Components:
   - Shadcn components require careful styling to maintain theme consistency
   - Modal positioning benefits from fixed + inset approach over default dialog positioning
   - Select components need specific handling for dark theme

2. Quiz Logic:
   - Question formatting needs to handle both MCQ and FRQ content types
   - Session recovery requires careful state management
   - Type safety is crucial for quiz state management

## Next Steps
1. Continue monitoring and improving quiz interaction UX
2. Consider adding keyboard shortcuts for quiz navigation
3. Enhance quiz session analytics and progress tracking
4. Review and optimize quiz generation performance

## Known Issues
1. Modal positioning requires specific styling to maintain proper centering
2. Select components may need additional dark theme adjustments
3. Quiz session recovery needs robust error handling 