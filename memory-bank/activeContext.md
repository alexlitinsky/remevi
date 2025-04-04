# Active Context

## Current Focus

The application is focused on providing a streamlined learning experience with an emphasis on progress tracking and achievement visualization. Recent changes include:

- Combined Study Progress and Achievements into a single tabbed interface for better UX
- Tabs include:
  1. Study Progress - Shows learning metrics, activity, and stats
  2. Achievements - Displays global achievements
- Implementing reliable document processing with progress updates and mind map generation

## Recent Changes

- Merged separate Study Progress and Achievements sections into a unified "Learning Progress" card
- Implemented tabbed navigation using shadcn/ui Tabs components
- Maintained all existing functionality while making the UI more compact
- Progress tab includes:
  - Cards reviewed progress
  - Mastery level tracking
  - Weekly activity visualization
  - Key stats (Minutes studied, Streak, Total points)
- Fixed document processing progress tracking and state updates:
  - Improved polling mechanism for real-time progress updates
  - Fixed state management during processing to avoid flipping between loading and processing states
  - Updated mind map display to handle nodes without coordinates by calculating positions dynamically
  - Added support for maintaining state during processing stage transitions

## Active Decisions

- Using a 2-column tab layout for clear section separation
- Maintaining motion animations for progress bars and activity charts
- Keeping the card styling consistent with the rest of the application
- Using descriptive tab labels for clear navigation
- For document processing:
  - Using polling instead of WebSockets for progress updates (simpler implementation)
  - Structured progress stages (CHUNKING: 0-10%, GENERATING: 10-80%, MINDMAP: 80-100%)
  - Dynamic node position calculation for mind maps instead of storing coordinates in the database

## Project Insights

- Combining related features into tabbed interfaces helps reduce vertical scrolling
- Motion animations enhance the user experience when displaying progress
- Weekly activity visualization provides valuable insights into study patterns
- The unified card design maintains visual hierarchy while improving space efficiency
- For real-time updates during long-running processes:
  - Regular polling with clear state management is crucial for a smooth UX
  - It's important to handle intermediate states without reinitializing the entire session
  - Providing visual feedback on progress (rainbow spinner, progress bar, stage messages) maintains user engagement
  - Always validate and handle API response data with defaults to prevent UI errors

## Next Steps

- Consider adding tab persistence across sessions
- Evaluate the need for additional progress metrics
- Monitor user interaction with the tabbed interface for potential improvements
- Consider adding loading states for tab content
- For document processing and mind maps:
  - Implement more interactive mind map features (zooming, panning, node selection)
  - Consider improving mind map layout algorithms for better visualization
  - Add animations for node transitions when mind map first loads
  - Test processing with larger documents to ensure reliability

## Important Patterns
- Using Clerk for user authentication
- Achievement categories: study, mastery, streak, points
- Achievement data structure includes requirements and progress tracking
- Using Prisma for database interactions
- Progress tracking pattern for processing:
  ```typescript
  {
    isProcessing: boolean;
    processingProgress: number;
    processingStage: 'CHUNKING' | 'GENERATING' | 'MINDMAP' | 'COMPLETED' | 'ERROR';
    processedChunks: number;
    totalChunks: number;
    error?: string;
    mindMap?: {
      nodes: Array<{ id: string; label: string; type: 'main' | 'subtopic' | 'detail' }>;
      connections: Array<{ source: string; target: string; label: string; type: string }>;
    };
  }
  ```
- Mind map component with dynamic position calculation:
  ```typescript
  // Calculate positions for nodes
  const nodes = originalNodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / originalNodes.length;
    const radius = node.type === 'main' ? 0 : 200;
    return {
      ...node,
      x: 400 + radius * Math.cos(angle), // Center x = 400
      y: 300 + radius * Math.sin(angle)  // Center y = 300
    };
  });
  ```

## Recent Learnings
- Achievement system structure and categories
- Progress tracking requirements for different achievement types
- Integration points between user actions and achievement unlocking
- The importance of proper state management for updating UI components from polling data
- How to implement dynamic node positioning for graph/network visualizations
- State management patterns for handling long-running processes with multiple stages
- How to avoid excessive re-renders and state resets during polling

## Current Focus
- Achievement system implementation
- Points system integration
- Database schema for achievements
- API endpoints for achievement tracking
- UI/UX for achievement notifications
- Document processing improvements:
  - Reliable progress tracking
  - Smooth transitions between processing stages
  - Interactive mind map visualization
  - Error handling and recovery

## Recent Changes
1. Achievement System Development
   - Created achievement badge SVGs with modern design
   - Implemented achievement notification component
   - Added achievement check in QuizResults
   - Designed points system for quizzes and flashcards

2. Achievement Badge Design
   - Modern, abstract achievement template
   - Neural/learning theme
   - Unique icons for each achievement type
   - Consistent style with gradients and animations
   - Created badges for all achievement types

3. Points System Design
   - Quiz points based on accuracy
   - Flashcard points based on SRS difficulty
   - Session tracking for streaks
   - Points persistence in user profile

4. Document Processing Improvements
   - Fixed polling mechanism to maintain state during updates
   - Updated mind map component to calculate node positions dynamically
   - Improved progress tracking with accurate percentages
   - Added error handling and recovery options
   - Fixed processing state UI for better user feedback

## Active Decisions
1. Achievement System:
   - Achievement types and conditions
   - Points calculation methods
   - Badge design system
   - Notification timing
   - Progress tracking

2. Database Schema:
   - Achievements table
   - User achievements junction
   - Points tracking in user profile
   - Streak counting system

3. API Design:
   - Achievement check endpoint
   - User achievements endpoint
   - Achievement unlock endpoint
   - Points update endpoint

4. UI/UX Patterns:
   - Achievement notification style
   - Badge display in profile
   - Progress indicators
   - Unlock animations

5. Document Processing:
   - Using a stateful polling system instead of WebSockets
   - Only updating necessary state fields during polling
   - Using progressStage and progressPercentage for clear feedback
   - Dynamically calculating mind map layout at render time
   - Handling empty or partial data gracefully

## Current Learnings
1. User Experience:
   - Achievement feedback importance
   - Points system motivation
   - Progress visualization
   - Badge design impact
   - Keeping users engaged during long-running processes
   - Providing visual feedback during processing stages

2. Technical:
   - SVG animation techniques
   - Achievement tracking logic
   - Points calculation methods
   - Database schema design
   - Polling state management patterns
   - Dynamic graph layout algorithms
   - Error handling for async processes

## Project Insights
1. Achievement System:
   - Motivates user engagement
   - Provides clear progress metrics
   - Enhances learning experience
   - Gamification benefits

2. Technical Architecture:
   - Separate achievement logic
   - Reusable notification system
   - Efficient points tracking
   - Scalable achievement types
   - Reliable polling mechanisms
   - Robust state management patterns

## Known Issues
1. Need to implement database tables
2. API endpoints not created yet
3. Points system needs integration
4. Achievement checks needed in flashcards
5. Mind map could benefit from improved layout algorithm for complex maps
6. Consider adding caching for processing state to handle page refreshes

## Current Focus
- Implementing and fixing the study deck processing state UI and progress tracking
- Adding real-time progress updates during document processing
- Fixing mind map display and ensuring proper coordination with backend data

## Recent Changes
1. Enhanced ProcessingState component in `StudyDeckStates.tsx`:
   - Added rainbow spinner animation
   - Improved progress bar visibility
   - Added proper stage messages
   - Fixed progress percentage display
   - Added auto-reload on completion

2. Updated progress tracking in `generate-chunks/route.ts`:
   - Added proper stage tracking (CHUNKING -> GENERATING -> MINDMAP -> COMPLETED)
   - Improved progress percentage calculations
   - Added error handling and status messages
   - Enhanced mind map generation progress tracking

3. Fixed mind map display issues:
   - Added dynamic node position calculation in MindMapModal
   - Implemented circular layout algorithm
   - Added visual differentiation between node types
   - Fixed connection rendering between nodes
   - Added zoom control for better visualization

4. Improved polling mechanism in session-v2/page.tsx:
   - Fixed state management to avoid UI flipping
   - Added consistent error handling
   - Improved progress updates
   - Fixed mind map data handling
   - Added proper reload on completion

## Next Steps
1. Test the polling mechanism with larger documents
2. Consider optimizations for mind map layout with many nodes
3. Add interactivity features to mind map (node selection, details view)
4. Implement caching for processing state to handle page refreshes

## Active Decisions
1. Using polling instead of WebSockets for progress updates (simpler implementation)
2. Progress stages:
   - CHUNKING: 0-10%
   - GENERATING: 10-80%
   - MINDMAP: 80-100%
   - ERROR: Special state
3. Dynamic mind map layout calculation instead of storing coordinates in DB
4. Circular layout for mind map nodes with main concept in center

## Important Patterns
1. Progress tracking pattern:
   ```typescript
   {
     isProcessing: boolean;
     processingProgress: number;
     processingStage: 'CHUNKING' | 'GENERATING' | 'MINDMAP' | 'COMPLETED' | 'ERROR';
     processedChunks: number;
     totalChunks: number;
     error?: string;
   }
   ```

2. UI Component Structure:
   ```
   ProcessingState
   ├── RainbowSpinner
   ├── Stage Message
   ├── Progress Bar
   └── Return to Home Button
   ```

3. Mind Map Component Structure:
   ```
   MindMapModal
   ├── Header
   ├── Zoom Controls
   └── Map Canvas
       ├── Connections (SVG lines)
       └── Nodes (Positioned divs)
   ```

## Learnings
1. Progress tracking needs both stage and percentage for accurate user feedback
2. Auto-reload should wait for mind map generation to complete
3. Error states should be clearly communicated while maintaining progress info
4. Regular polling is needed for smooth progress updates
5. Mind map visualization requires dynamic layout calculation for flexibility
6. State management during polling must avoid component resets
7. Use default values for all polled data to prevent rendering errors 