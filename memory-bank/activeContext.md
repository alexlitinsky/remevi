# Active Context

## Current Focus
- Implementing universal feedback functionality across the application
- Improving user engagement and feedback collection
- Maintaining clean component architecture with Next.js best practices
- Implementing legal pages and footer structure
- Enhancing user upload limits and tracking

## Recent Changes
- Created a universal feedback button component that appears on all pages
- Moved feedback functionality from page-specific to application-wide
- Implemented proper client-side component handling for interactive elements
- Simplified footer by removing redundant "Report Issue" button
- Added Privacy Policy and Terms of Service pages
- Implemented upload limits and tracking functionality
- Created UploadCounter component for user feedback

## Key Decisions
1. Feedback Button:
   - Created as a separate client component (`FeedbackButton.tsx`)
   - Positioned consistently at bottom-right of every page
   - Uses mailto link for MVP stage (hello@remevi.com)
   - Styled with primary colors and shadow for visibility
   - Implemented as a floating button for easy access

2. Component Architecture:
   - Separated client-side interactive components from server components
   - Used 'use client' directive for components with event handlers
   - Maintained clean separation of concerns

3. Upload Management:
   - Implemented upload limit tracking per user
   - Created functions to check and update upload counts
   - Added visual feedback through UploadCounter component

4. Legal Framework:
   - Added comprehensive Privacy Policy
   - Implemented Terms of Service
   - Integrated legal pages into footer navigation

## Next Steps
- Consider implementing a more sophisticated feedback system in the future
- Potentially add analytics to track feedback button usage
- Consider adding different feedback channels (e.g., chat, form) as the product grows
- Implement user dashboard for upload limit management
- Add upgrade path for users who need more uploads

## Active Patterns
- Client Components: Used for interactive elements
- Layout Components: Universal UI elements shared across pages
- Floating UI: Fixed position elements for important actions
- User Limits: Tracking and enforcing usage limits
- Legal Compliance: Maintaining necessary legal documentation

## Recent Learnings
- Next.js client/server component separation best practices
- Proper handling of event handlers in Next.js 13+
- Universal component implementation in layouts
- User limit tracking and enforcement patterns
- Legal requirements for SaaS applications