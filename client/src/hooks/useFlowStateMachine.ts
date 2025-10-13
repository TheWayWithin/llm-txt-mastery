import { useReducer, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { DiscoveredPage } from '@shared/schema';
import { AuthUser } from '@/lib/auth-api';

// Flow states representing the user journey
export type FlowState =
  | 'INITIALIZING'
  | 'LANDING'
  | 'TIER_SELECTION'
  | 'AUTH_CHOICE'
  | 'URL_INPUT'
  | 'AUTH_CHECK'
  | 'EMAIL_CAPTURE'
  | 'TIER_LIMITS'
  | 'ANALYSIS'
  | 'REVIEW'
  | 'GENERATION'
  | 'ERROR';

// User tier type
export type UserTier = 'starter' | 'solo' | 'growth' | 'scale';

// Events that can trigger state transitions
export type FlowEvent =
  | { type: 'AUTH_RESOLVED'; user: AuthUser | null }
  | { type: 'URL_SUBMITTED'; url: string }
  | { type: 'TIER_SELECTED'; tier: UserTier }
  | { type: 'AUTH_METHOD_CHOSEN'; method: 'login' | 'signup' }
  | { type: 'EMAIL_CAPTURED'; email: string; tier: UserTier }
  | { type: 'EMAIL_RECOGNIZED'; user: AuthUser }
  | { type: 'EMAIL_VERIFIED'; user: AuthUser }
  | { type: 'ANALYSIS_COMPLETE'; analysisId: number; pages: DiscoveredPage[] }
  | { type: 'FILE_GENERATED'; fileId: number }
  | { type: 'RESET_WORKFLOW' }
  | { type: 'START_NEW_ANALYSIS' }
  | { type: 'NAVIGATE_TO_TIER_SELECTION' }
  | { type: 'BYPASS_EMAIL_CAPTURE' }
  | { type: 'PROCEED_TO_ANALYSIS' }
  | { type: 'COFFEE_PROCEED_TO_ANALYSIS' }
  | { type: 'VIEW_ANALYSIS_DETAILS' }
  | { type: 'OPEN_AUTH_MODAL' }
  | { type: 'CLOSE_AUTH_MODAL' }
  | { type: 'UPDATE_PROGRESS'; progress: Partial<ProgressContext> }
  | {
      type: 'UPDATE_ANALYSIS_PROGRESS';
      stage: string;
      totalPages?: number;
      processedPages?: number;
    }
  | { type: 'ERROR_OCCURRED'; error: ErrorContext; recoverable?: boolean }
  | { type: 'RECOVER_FROM_ERROR'; targetState?: FlowState }
  | { type: 'RETRY_CURRENT_OPERATION' };

// Error context for enhanced error handling
export interface ErrorContext {
  type: 'network' | 'validation' | 'auth' | 'analysis' | 'payment' | 'unknown';
  message: string;
  details?: string;
  code?: string;
  recoverable: boolean;
  suggestedActions: string[];
  retryable: boolean;
  timestamp: Date;
}

// Progress context for enhanced loading states
export interface ProgressContext {
  currentStep: string;
  completedSteps: string[];
  progress: number;
  analysisStage?: string;
  completedAnalysisStages?: string[];
  totalPages?: number;
  processedPages?: number;
  timeEstimate?: string;
  loadingMessage?: string;
}

// State machine context
export interface FlowContext {
  currentState: FlowState;
  previousState: FlowState | null;
  websiteUrl: string;
  userEmail: string;
  userTier: UserTier;
  analysisId: number | null;
  discoveredPages: DiscoveredPage[];
  generatedFileId: number | null;
  user: AuthUser | null;
  authLoading: boolean;
  showAuthModal: boolean;
  progress: ProgressContext;
  error: ErrorContext | null;
  retryCount: number;
  lastProcessedAnalysisId: number | null; // Track last processed analysis to prevent duplicates
  eventCounter: Map<string, number>; // Circuit breaker for runaway events
}

// URL parameters extracted from location
interface URLParams {
  url?: string;
  email?: string;
  isCoffeeReturn: boolean;
  isRerun: boolean;
}

// State machine reducer
function flowReducer(context: FlowContext, event: FlowEvent): FlowContext {
  // Circuit breaker: Track event frequency to prevent runaway loops
  const eventKey = `${context.currentState}:${event.type}`;
  const currentCount = context.eventCounter.get(eventKey) || 0;

  // Special handling for ANALYSIS_COMPLETE - should only happen once per analysis
  const maxEventCount = event.type === 'ANALYSIS_COMPLETE' ? 3 : 10;

  if (currentCount >= maxEventCount) {
    console.error(
      `🚨 CIRCUIT BREAKER: Event ${eventKey} exceeded ${maxEventCount} occurrences - ignoring`
    );
    return context;
  }

  // Update event counter
  const newEventCounter = new Map(context.eventCounter);
  newEventCounter.set(eventKey, currentCount + 1);

  // Reset counter every minute for most events, 30 seconds for critical events
  const resetTime = event.type === 'ANALYSIS_COMPLETE' ? 30000 : 60000;
  setTimeout(() => {
    newEventCounter.delete(eventKey);
  }, resetTime);

  const updatedContext = { ...context, eventCounter: newEventCounter };

  console.log(
    `🔄 State transition: ${context.currentState} + ${event.type} (count: ${currentCount + 1}/${maxEventCount})`
  );

  switch (event.type) {
    case 'AUTH_RESOLVED': {
      const { user } = event;
      const newContext = { ...updatedContext, user, authLoading: false };

      console.log(
        `🔐 AUTH_RESOLVED: currentState=${context.currentState}, hasUser=${!!user}, userTier=${user?.tier || 'none'}`
      );

      // Handle authenticated users
      if (context.currentState === 'INITIALIZING' || context.currentState === 'AUTH_CHECK') {
        if (user) {
          console.log('✅ AUTH_RESOLVED: Authenticated user - going to /analyze (URL_INPUT)');
          return {
            ...newContext,
            currentState: 'URL_INPUT',
            progress: updateProgressForState('URL_INPUT', newContext.progress),
          };
        } else {
          console.log('👤 AUTH_RESOLVED: Unauthenticated user - showing landing page');
          return {
            ...newContext,
            currentState: 'LANDING',
            progress: updateProgressForState('LANDING', newContext.progress),
          };
        }
      }

      // If auth resolves during other states, preserve user context but don't change state
      console.log('🔄 AUTH_RESOLVED: Preserving current state, updating user context');
      return newContext;
    }

    case 'NAVIGATE_TO_TIER_SELECTION': {
      console.log('🎯 NAVIGATE_TO_TIER_SELECTION: Moving from landing to tier selection');
      return {
        ...updatedContext,
        currentState: 'TIER_SELECTION',
        progress: updateProgressForState('TIER_SELECTION', updatedContext.progress),
      };
    }

    case 'TIER_SELECTED': {
      console.log(`🎯 TIER_SELECTED: tier=${event.tier}`);
      return {
        ...updatedContext,
        userTier: event.tier,
        currentState: 'AUTH_CHOICE',
        progress: updateProgressForState('AUTH_CHOICE', updatedContext.progress),
      };
    }

    case 'AUTH_METHOD_CHOSEN': {
      console.log(`🔐 AUTH_METHOD_CHOSEN: method=${event.method}`);
      // This would typically trigger navigation to /login or /signup
      // The actual navigation should be handled by the component
      return updatedContext;
    }

    case 'URL_SUBMITTED': {
      const newContext = { ...updatedContext, websiteUrl: event.url };

      console.log(
        `🌐 URL_SUBMITTED: url=${event.url}, hasUser=${!!context.user}, userTier=${context.user?.tier || 'none'}`
      );

      // For authenticated users, proceed based on tier
      if (context.user) {
        console.log(`✅ URL_SUBMITTED: User is authenticated with tier ${context.user.tier}`);
        // Coffee tier users proceed directly to analysis for optimal UX
        if (context.user.tier === 'solo') {
          console.log('☕ URL_SUBMITTED: Coffee tier user - proceeding directly to analysis');
          return { ...newContext, currentState: 'ANALYSIS' };
        } else {
          console.log('✅ URL_SUBMITTED: Regular authenticated user, showing tier limits');
          return { ...newContext, currentState: 'TIER_LIMITS' };
        }
      } else {
        console.log(
          '👤 URL_SUBMITTED: No authenticated user - this should not happen on /analyze page'
        );
        // This case should not happen on the /analyze page since it requires auth
        return { ...newContext, currentState: 'TIER_SELECTION' };
      }
    }

    case 'EMAIL_CAPTURED': {
      console.log(`📧 EMAIL_CAPTURED: ${event.email} with tier ${event.tier}`);

      // This is for the legacy email capture flow (should be rare now)
      // In the new flow, users authenticate first, then go to /analyze
      return {
        ...updatedContext,
        userEmail: event.email,
        userTier: event.tier,
        currentState: 'URL_INPUT',
        progress: updateProgressForState('URL_INPUT', updatedContext.progress),
      };
    }

    case 'EMAIL_RECOGNIZED': {
      console.log(`🔍 EMAIL_RECOGNIZED: ${event.user.email} with tier ${event.user.tier}`);

      // User was recognized - go to URL_INPUT (authenticated analysis page)
      return {
        ...updatedContext,
        user: event.user,
        userEmail: event.user.email,
        userTier: event.user.tier,
        currentState: 'URL_INPUT',
        showAuthModal: false,
        progress: updateProgressForState('URL_INPUT', context.progress),
      };
    }

    case 'EMAIL_VERIFIED': {
      console.log(`✅ EMAIL_VERIFIED: ${event.user.email} with tier ${event.user.tier}`);

      // After email verification, go to URL_INPUT (authenticated analysis page)
      return {
        ...updatedContext,
        user: event.user,
        userEmail: event.user.email,
        userTier: event.user.tier,
        currentState: 'URL_INPUT',
        showAuthModal: false,
        progress: updateProgressForState('URL_INPUT', context.progress),
      };
    }

    case 'BYPASS_EMAIL_CAPTURE': {
      return {
        ...context,
        currentState: 'TIER_LIMITS',
      };
    }

    case 'PROCEED_TO_ANALYSIS': {
      return {
        ...context,
        currentState: 'ANALYSIS',
      };
    }

    case 'COFFEE_PROCEED_TO_ANALYSIS': {
      console.log('☕ Coffee tier proceeding to analysis with premium features');
      return {
        ...context,
        currentState: 'ANALYSIS',
      };
    }

    case 'ANALYSIS_COMPLETE': {
      const transitionStart = performance.now();

      // Event deduplication: Ignore if we've already processed this analysis
      if (context.lastProcessedAnalysisId === event.analysisId) {
        console.log(
          `🚫 ANALYSIS_COMPLETE ignored: Already processed analysisId=${event.analysisId}`
        );
        return context;
      }

      // Additional safety: Only allow transition to REVIEW from ANALYSIS state
      if (context.currentState !== 'ANALYSIS') {
        console.log(
          `🚫 ANALYSIS_COMPLETE ignored: Invalid state transition from ${context.currentState}`
        );
        return context;
      }

      console.log(
        `✅ ANALYSIS_COMPLETE processed: analysisId=${event.analysisId}, pages=${event.pages.length}`
      );
      const nextState = 'REVIEW';

      const newContext = {
        ...updatedContext,
        analysisId: event.analysisId,
        discoveredPages: event.pages,
        lastProcessedAnalysisId: event.analysisId,
        currentState: nextState,
        progress: updateProgressForState(nextState, context.progress),
      };

      const transitionEnd = performance.now();
      console.log(
        `⏱️ ANALYSIS_COMPLETE state transition took ${(transitionEnd - transitionStart).toFixed(2)}ms`
      );

      return newContext;
    }

    case 'FILE_GENERATED': {
      const nextState = 'GENERATION';
      return {
        ...context,
        generatedFileId: event.fileId,
        currentState: nextState,
        progress: updateProgressForState(nextState, context.progress),
      };
    }

    case 'VIEW_ANALYSIS_DETAILS': {
      return {
        ...context,
        currentState: 'REVIEW',
      };
    }

    case 'START_NEW_ANALYSIS': {
      // Smart reset: preserve user context but clear analysis data
      console.log('🔄 START_NEW_ANALYSIS: Preserving user context, clearing analysis data');

      // Scroll to URL input field when starting new analysis
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          const urlInput = document.getElementById('website-url');
          if (urlInput) {
            urlInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            urlInput.focus();
            console.log('📍 Scrolled to URL input field for new analysis');
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            console.log('📍 Scrolled to top for new analysis (URL input not found)');
          }
        }, 100);
      }

      // Preserve user-related state
      const preservedUser = context.user;
      const preservedEmail = preservedUser?.email || context.userEmail;
      const preservedTier = preservedUser?.tier || context.userTier;

      console.log(
        `📋 Preserved context: email=${preservedEmail}, tier=${preservedTier}, hasUser=${!!preservedUser}`
      );

      // For authenticated users, always go to URL_INPUT
      // For unauthenticated users, go to LANDING or EMAIL_CAPTURE for legacy support
      const startState = preservedUser ? 'URL_INPUT' : 'LANDING';
      console.log(
        `🚀 START_NEW_ANALYSIS: Starting with ${startState} (hasUser: ${!!preservedUser})`
      );

      return {
        ...context,
        currentState: startState,
        previousState: null,
        // Clear analysis-specific data
        websiteUrl: '',
        analysisId: null,
        discoveredPages: [],
        generatedFileId: null,
        error: null,
        retryCount: 0,
        lastProcessedAnalysisId: null,
        eventCounter: new Map(),
        // Preserve user context
        userEmail: preservedEmail,
        userTier: preservedTier,
        user: preservedUser,
        showAuthModal: false,
        progress: createInitialProgress(),
      };
    }

    case 'RESET_WORKFLOW': {
      // Full reset: clear everything including user context, start with landing page
      console.log('🔄 RESET_WORKFLOW: Full reset, clearing all data including user context');
      return {
        ...context,
        currentState: 'LANDING',
        previousState: null,
        websiteUrl: '',
        userEmail: '',
        userTier: 'starter',
        analysisId: null,
        discoveredPages: [],
        generatedFileId: null,
        user: null,
        showAuthModal: false,
        error: null,
        retryCount: 0,
        lastProcessedAnalysisId: null,
        eventCounter: new Map(),
        progress: createInitialProgress(),
      };
    }

    case 'ERROR_OCCURRED': {
      return {
        ...context,
        previousState: context.currentState,
        currentState: 'ERROR',
        error: event.error,
      };
    }

    case 'RECOVER_FROM_ERROR': {
      const targetState = event.targetState || context.previousState || 'URL_INPUT';
      return {
        ...context,
        currentState: targetState,
        previousState: null,
        error: null,
        retryCount: 0,
      };
    }

    case 'RETRY_CURRENT_OPERATION': {
      const targetState = context.previousState || 'URL_INPUT';
      return {
        ...context,
        currentState: targetState,
        error: null,
        retryCount: context.retryCount + 1,
      };
    }

    case 'OPEN_AUTH_MODAL': {
      return {
        ...context,
        showAuthModal: true,
      };
    }

    case 'CLOSE_AUTH_MODAL': {
      return {
        ...context,
        showAuthModal: false,
      };
    }

    case 'UPDATE_PROGRESS': {
      return {
        ...context,
        progress: {
          ...context.progress,
          ...event.progress,
        },
      };
    }

    case 'UPDATE_ANALYSIS_PROGRESS': {
      const updatedAnalysisStages = [...(context.progress.completedAnalysisStages || [])];
      if (event.stage && !updatedAnalysisStages.includes(event.stage)) {
        // Move current stage to completed if we're advancing
        if (context.progress.analysisStage) {
          updatedAnalysisStages.push(context.progress.analysisStage);
        }
      }

      return {
        ...context,
        progress: {
          ...context.progress,
          analysisStage: event.stage,
          completedAnalysisStages: updatedAnalysisStages,
          totalPages: event.totalPages ?? context.progress.totalPages,
          processedPages: event.processedPages ?? context.progress.processedPages,
        },
      };
    }

    default:
      return context;
  }
}

// Parse URL parameters
function parseURLParams(location: string): URLParams {
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  return {
    url: urlParams.get('url') || undefined,
    email: urlParams.get('email') || undefined,
    isCoffeeReturn: urlParams.get('solo') === 'true',
    isRerun: urlParams.get('rerun') === 'true',
  };
}

// Helper function to create initial progress state
function createInitialProgress(): ProgressContext {
  return {
    currentStep: 'getting-started',
    completedSteps: [],
    progress: 0,
    analysisStage: undefined,
    completedAnalysisStages: [],
    totalPages: undefined,
    processedPages: undefined,
    timeEstimate: undefined,
    loadingMessage: undefined,
  };
}

// Helper function to update progress based on flow state
function updateProgressForState(state: FlowState, progress: ProgressContext): ProgressContext {
  const newProgress = { ...progress };

  switch (state) {
    case 'LANDING':
    case 'TIER_SELECTION':
    case 'AUTH_CHOICE':
      newProgress.currentStep = 'getting-started';
      newProgress.completedSteps = [];
      newProgress.progress = 0;
      break;
    case 'EMAIL_CAPTURE':
      newProgress.currentStep = 'email-capture';
      newProgress.completedSteps = [];
      newProgress.progress = 10;
      break;
    case 'URL_INPUT':
      newProgress.currentStep = 'url-input';
      newProgress.completedSteps = ['getting-started', 'email-capture'];
      newProgress.progress = 20;
      break;
    case 'TIER_LIMITS':
      newProgress.currentStep = 'tier-setup';
      newProgress.completedSteps = ['getting-started', 'email-capture', 'url-input'];
      newProgress.progress = 30;
      break;
    case 'ANALYSIS':
      newProgress.currentStep = 'analysis';
      newProgress.completedSteps = ['getting-started', 'email-capture', 'url-input', 'tier-setup'];
      newProgress.progress = 40;
      newProgress.analysisStage = 'discovery';
      newProgress.completedAnalysisStages = [];
      break;
    case 'REVIEW':
      newProgress.currentStep = 'review';
      newProgress.completedSteps = [
        'getting-started',
        'email-capture',
        'url-input',
        'tier-setup',
        'analysis',
      ];
      newProgress.progress = 70;
      newProgress.analysisStage = undefined;
      newProgress.completedAnalysisStages = [
        'discovery',
        'content-fetch',
        'ai-analysis',
        'finalization',
      ];
      break;
    case 'GENERATION':
      newProgress.currentStep = 'generation';
      newProgress.completedSteps = [
        'getting-started',
        'email-capture',
        'url-input',
        'tier-setup',
        'analysis',
        'review',
      ];
      newProgress.progress = 100;
      break;
  }

  return newProgress;
}

// Initial state factory
function createInitialState(urlParams: URLParams, authLoading: boolean): FlowContext {
  let initialState: FlowState = 'INITIALIZING';
  let websiteUrl = '';
  let userEmail = '';
  let userTier: UserTier = 'starter';

  // Handle URL parameters
  if (urlParams.url) {
    websiteUrl = urlParams.url;
  }

  if (urlParams.email) {
    userEmail = urlParams.email;
  }

  if (urlParams.isCoffeeReturn && urlParams.email) {
    userTier = 'solo';
  }

  return {
    currentState: initialState,
    previousState: null,
    websiteUrl,
    userEmail,
    userTier,
    analysisId: null,
    discoveredPages: [],
    generatedFileId: null,
    user: null,
    authLoading,
    showAuthModal: false,
    progress: createInitialProgress(),
    error: null,
    retryCount: 0,
    lastProcessedAnalysisId: null,
    eventCounter: new Map(),
  };
}

// Main hook
export function useFlowStateMachine() {
  const { user, loading: authLoading, recognizeEmailUser } = useAuth();
  const [location] = useLocation();

  // Parse URL parameters
  const urlParams = useMemo(() => parseURLParams(location), [location]);

  // Initialize state machine
  const [context, dispatch] = useReducer(flowReducer, createInitialState(urlParams, authLoading));

  // Handle URL parameter changes
  useEffect(() => {
    if (urlParams.url && urlParams.url !== context.websiteUrl) {
      console.log(
        `🌐 URL parameter detected: ${urlParams.url}, currentState: ${context.currentState}, authLoading: ${authLoading}, hasUser: ${!!user}`
      );
      dispatch({ type: 'URL_SUBMITTED', url: urlParams.url });
    }

    if (urlParams.email && urlParams.email !== context.userEmail) {
      console.log(
        `📧 Email parameter detected: ${urlParams.email}, isCoffeeReturn: ${urlParams.isCoffeeReturn}`
      );
      const tier = urlParams.isCoffeeReturn ? 'solo' : 'starter';
      dispatch({ type: 'EMAIL_CAPTURED', email: urlParams.email, tier });
    }
  }, [urlParams, context.websiteUrl, context.userEmail, context.currentState, authLoading, user]);

  // Handle auth state changes
  useEffect(() => {
    if (!authLoading) {
      console.log(
        `🔐 Auth loading completed, user: ${user?.email || 'none'}, tier: ${user?.tier || 'none'}, currentState: ${context.currentState}`
      );
      dispatch({ type: 'AUTH_RESOLVED', user });
    } else {
      console.log(`⏳ Auth still loading, currentState: ${context.currentState}`);
    }
  }, [authLoading, user, context.currentState]);

  // Computed properties for convenience
  const effectiveEmail = user?.email || context.userEmail;
  const effectiveTier = user?.tier || context.userTier;

  // Determine component visibility based on state
  const visibility = {
    landing: context.currentState === 'LANDING',
    tierSelection: context.currentState === 'TIER_SELECTION',
    authChoice: context.currentState === 'AUTH_CHOICE',
    urlInput: context.currentState === 'URL_INPUT',
    authLoading: context.currentState === 'AUTH_CHECK' && authLoading,
    emailCapture: context.currentState === 'EMAIL_CAPTURE' && !authLoading && !user,
    tierLimits: context.currentState === 'TIER_LIMITS',
    analysis: context.currentState === 'ANALYSIS',
    review: context.currentState === 'REVIEW' && context.analysisId !== null,
    generation: context.currentState === 'GENERATION' && context.generatedFileId !== null,
    error: context.currentState === 'ERROR',
  };

  // Debug visibility logic for troubleshooting
  console.log(
    `👁️ VISIBILITY: state=${context.currentState}, authLoading=${authLoading}, hasUser=${!!user}, emailCapture=${visibility.emailCapture}, tierLimits=${visibility.tierLimits}, analysis=${visibility.analysis}`
  );

  // Stable action creators with useCallback to prevent unnecessary re-renders
  const actions = useMemo(
    () => ({
      // Navigation actions
      navigateToTierSelection: () => dispatch({ type: 'NAVIGATE_TO_TIER_SELECTION' }),
      selectTier: (tier: UserTier) => dispatch({ type: 'TIER_SELECTED', tier }),
      chooseAuthMethod: (method: 'login' | 'signup') =>
        dispatch({ type: 'AUTH_METHOD_CHOSEN', method }),

      // Analysis flow actions
      submitUrl: (url: string) => dispatch({ type: 'URL_SUBMITTED', url }),
      captureEmail: (email: string, tier: UserTier) =>
        dispatch({ type: 'EMAIL_CAPTURED', email, tier }),
      recognizeEmail: (user: AuthUser) => dispatch({ type: 'EMAIL_RECOGNIZED', user }),
      verifyEmail: (user: AuthUser) => dispatch({ type: 'EMAIL_VERIFIED', user }),
      proceedToAnalysis: () => dispatch({ type: 'PROCEED_TO_ANALYSIS' }),
      coffeeProceedToAnalysis: () => dispatch({ type: 'COFFEE_PROCEED_TO_ANALYSIS' }),
      completeAnalysis: (analysisId: number, pages: DiscoveredPage[]) =>
        dispatch({ type: 'ANALYSIS_COMPLETE', analysisId, pages }),
      generateFile: (fileId: number) => dispatch({ type: 'FILE_GENERATED', fileId }),

      // Workflow control actions
      resetWorkflow: () => dispatch({ type: 'RESET_WORKFLOW' }),
      startNewAnalysis: () => dispatch({ type: 'START_NEW_ANALYSIS' }),
      viewAnalysisDetails: () => dispatch({ type: 'VIEW_ANALYSIS_DETAILS' }),

      // UI state actions
      openAuthModal: () => dispatch({ type: 'OPEN_AUTH_MODAL' }),
      closeAuthModal: () => dispatch({ type: 'CLOSE_AUTH_MODAL' }),
      updateProgress: (progress: Partial<ProgressContext>) =>
        dispatch({ type: 'UPDATE_PROGRESS', progress }),
      updateAnalysisProgress: (stage: string, totalPages?: number, processedPages?: number) =>
        dispatch({ type: 'UPDATE_ANALYSIS_PROGRESS', stage, totalPages, processedPages }),

      // Error handling actions
      reportError: (error: ErrorContext) => dispatch({ type: 'ERROR_OCCURRED', error }),
      recoverFromError: (targetState?: FlowState) =>
        dispatch({ type: 'RECOVER_FROM_ERROR', targetState }),
      retryCurrentOperation: () => dispatch({ type: 'RETRY_CURRENT_OPERATION' }),
    }),
    []
  );

  return {
    // State
    currentState: context.currentState,
    previousState: context.previousState,
    websiteUrl: context.websiteUrl,
    userEmail: context.userEmail,
    userTier: context.userTier,
    analysisId: context.analysisId,
    discoveredPages: context.discoveredPages,
    generatedFileId: context.generatedFileId,
    user: context.user,
    authLoading: context.authLoading,
    showAuthModal: context.showAuthModal,
    progress: context.progress,
    error: context.error,
    retryCount: context.retryCount,

    // Computed properties
    effectiveEmail,
    effectiveTier,

    // Component visibility
    visibility,

    // Actions
    actions,
  };
}

// Export additional types for use in components
export type { FlowContext as FlowMachineContext };
