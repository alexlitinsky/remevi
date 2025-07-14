# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server with HMR (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run TypeScript type checking
npm run typecheck

# Initialize/start Convex backend (run in separate terminal)
npx convex dev
```

## Architecture Overview

This is a full-stack React SaaS application built with:

- **React Router v7** - Full-stack framework with SSR, handling both frontend routing and backend API endpoints
- **Convex** - Real-time serverless database and backend functions (in `convex/` directory)
- **Clerk** - Authentication and user management integrated via React Router
- **Polar.sh** - Subscription billing and payment processing with webhook handling
- **TailwindCSS v4** - Utility-first CSS framework
- **shadcn/ui components** - Reusable UI components in `app/components/ui/`

### Key Architectural Patterns

1. **Route-based Architecture**: Routes in `app/routes/` define both UI and data loading logic using React Router's loader/action patterns

2. **Authentication Flow**: 
   - Clerk handles auth via `@clerk/react-router`
   - Protected routes check authentication in loaders
   - User data syncs to Convex on first sign-in

3. **Subscription Management**:
   - Polar.sh handles billing with products/pricing fetched dynamically
   - Webhook at `/webhook/polar` processes subscription events
   - Subscription status stored in Convex and checked for feature access

4. **Real-time Data**: Convex provides real-time updates via React hooks (`useQuery`, `useMutation`) for seamless data synchronization

5. **AI Chat Integration**: OpenAI-powered chat in dashboard uses streaming responses with conversation history stored in Convex

## Important Implementation Details

- **Environment Variables**: All credentials are in `.env.local` (Convex, Clerk, Polar, OpenAI)
- **Deployment**: Configured for Vercel with `@vercel/react-router` preset
- **Type Safety**: Full TypeScript with generated types from Convex schema
- **Server Components**: React Router v7 supports both client and server rendering
- **Webhook Security**: Polar webhooks validated using HMAC signature verification

## Common Development Tasks

When implementing new features:
1. Add routes to `app/routes/` directory following existing patterns
2. Use Convex functions in `convex/` for backend logic
3. Leverage existing UI components from `app/components/ui/`
4. Follow the authentication pattern using Clerk's React Router integration
5. For paid features, check subscription status using the existing helpers