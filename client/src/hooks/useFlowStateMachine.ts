import { useReducer, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { DiscoveredPage } from '@shared/schema';
import { AuthUser } from '@/lib/auth-api';

// Flow states representing the user journey
export type FlowState = 
  | 'INITIALIZING'
  | 'URL_INPUT' 
  | 'AUTH_CHECK'
  | 'EMAIL_CAPTURE'
  | 'TIER_LIMITS'
  | 'ANALYSIS'
  | 'REVIEW'
  | 'GENERATION'
  | 'ERROR';

// User tier type
export type UserTier = 'starter' | 'coffee' | 'growth' | 'scale';

// Events that can trigger state transitions
export type FlowEvent = 
  | { type: 'AUTH_RESOLVED'; user: AuthUser | null }
  | { type: 'URL_SUBMITTED'; url: string }
  | { type: 'EMAIL_CAPTURED'; email: string; tier: UserTier }
  | { type: 'ANALYSIS_COMPLETE'; analysisId: number; pages: DiscoveredPage[] }
  | { type: 'FILE_GENERATED'; fileId: number }
  | { type: 'RESET_WORKFLOW' }
  | { type: 'BYPASS_EMAIL_CAPTURE' }
  | { type: 'PROCEED_TO_ANALYSIS' }
  | { type: 'COFFEE_PROCEED_TO_ANALYSIS' }
  | { type: 'VIEW_ANALYSIS_DETAILS' }
  | { type: 'OPEN_AUTH_MODAL' }
  | { type: 'CLOSE_AUTH_MODAL' }
  | { type: 'UPDATE_PROGRESS'; progress: Partial<ProgressContext> }
  | { type: 'UPDATE_ANALYSIS_PROGRESS'; stage: string; totalPages?: number; processedPages?: number }
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
  console.log(`🔄 State transition: ${context.currentState} + ${event.type}`);

  switch (event.type) {
    case 'AUTH_RESOLVED': {
      const { user } = event;
      const newContext = { ...context, user, authLoading: false };

      // Smart routing based on auth state and URL
      if (context.currentState === 'INITIALIZING' || context.currentState === 'AUTH_CHECK') {
        if (context.websiteUrl) {
          // URL already set, decide next step based on user
          if (user) {
            // Coffee tier users skip TIER_LIMITS and go directly to ANALYSIS for optimal experience
            if (user.tier === 'coffee') {
              console.log('☕ Coffee tier user detected - bypassing limits check, proceeding directly to analysis');
              const nextState = 'ANALYSIS';
              return { 
                ...newContext, 
                currentState: nextState,
                progress: updateProgressForState(nextState, newContext.progress)
              };
            } else {
              console.log('✅ Auth resolved with user, proceeding to limits');
              const nextState = 'TIER_LIMITS';
              return { 
                ...newContext, 
                currentState: nextState,
                progress: updateProgressForState(nextState, newContext.progress)
              };
            }
          } else {
            console.log('👤 Auth resolved without user, proceeding to email capture');
            const nextState = 'EMAIL_CAPTURE';
            return { 
              ...newContext, 
              currentState: nextState,
              progress: updateProgressForState(nextState, newContext.progress)
            };
          }
        } else {
          console.log('🌐 Auth resolved, ready for URL input');
          const nextState = 'URL_INPUT';
          return { 
            ...newContext, 
            currentState: nextState,
            progress: updateProgressForState(nextState, newContext.progress)
          };
        }
      }

      // If we're waiting for auth during email capture, resolve appropriately
      if (context.currentState === 'EMAIL_CAPTURE' && user && context.websiteUrl) {
        if (user.tier === 'coffee') {
          console.log('☕ Coffee tier auth resolved during email capture - proceeding directly to analysis');
          const nextState = 'ANALYSIS';
          return { 
            ...newContext, 
            currentState: nextState, 
            showAuthModal: false,
            progress: updateProgressForState(nextState, newContext.progress)
          };
        } else {
          console.log('🚀 Auth resolved during email capture, skipping to limits');
          const nextState = 'TIER_LIMITS';
          return { 
            ...newContext, 
            currentState: nextState, 
            showAuthModal: false,
            progress: updateProgressForState(nextState, newContext.progress)
          };
        }
      }

      return newContext;
    }

    case 'URL_SUBMITTED': {
      const newContext = { ...context, websiteUrl: event.url };

      // Determine next state based on auth status
      if (context.authLoading) {
        console.log('⏳ URL submitted while auth loading, checking auth first');
        return { ...newContext, currentState: 'AUTH_CHECK' };
      } else if (context.user) {
        // Coffee tier users skip TIER_LIMITS for optimal experience
        if (context.user.tier === 'coffee') {
          console.log('☕ URL submitted with Coffee tier user - proceeding directly to analysis');
          return { ...newContext, currentState: 'ANALYSIS' };
        } else {
          console.log('✅ URL submitted with authenticated user, proceeding to limits');
          return { ...newContext, currentState: 'TIER_LIMITS' };
        }
      } else {
        console.log('👤 URL submitted without auth, proceeding to email capture');
        return { ...newContext, currentState: 'EMAIL_CAPTURE' };
      }
    }

    case 'EMAIL_CAPTURED': {
      // Coffee tier users (from payment return) can bypass TIER_LIMITS
      if (event.tier === 'coffee') {
        console.log('☕ Coffee tier email captured - proceeding directly to analysis');
        return {
          ...context,
          userEmail: event.email,
          userTier: event.tier,
          currentState: 'ANALYSIS'
        };
      } else {
        return {
          ...context,
          userEmail: event.email,
          userTier: event.tier,
          currentState: 'TIER_LIMITS'
        };
      }
    }

    case 'BYPASS_EMAIL_CAPTURE': {
      return {
        ...context,
        currentState: 'TIER_LIMITS'
      };
    }

    case 'PROCEED_TO_ANALYSIS': {
      return {
        ...context,
        currentState: 'ANALYSIS'
      };
    }

    case 'COFFEE_PROCEED_TO_ANALYSIS': {
      console.log('☕ Coffee tier proceeding to analysis with premium features');
      return {
        ...context,
        currentState: 'ANALYSIS'
      };
    }

    case 'ANALYSIS_COMPLETE': {
      const nextState = 'REVIEW';
      return {
        ...context,
        analysisId: event.analysisId,
        discoveredPages: event.pages,
        currentState: nextState,
        progress: updateProgressForState(nextState, context.progress)
      };
    }

    case 'FILE_GENERATED': {
      const nextState = 'GENERATION';
      return {
        ...context,
        generatedFileId: event.fileId,
        currentState: nextState,
        progress: updateProgressForState(nextState, context.progress)
      };
    }

    case 'VIEW_ANALYSIS_DETAILS': {
      return {
        ...context,
        currentState: 'REVIEW'
      };
    }

    case 'RESET_WORKFLOW': {
      return {
        ...context,
        currentState: 'URL_INPUT',
        previousState: null,
        websiteUrl: '',
        userEmail: '',
        userTier: 'starter',
        analysisId: null,
        discoveredPages: [],
        generatedFileId: null,
        error: null,
        retryCount: 0,
        progress: createInitialProgress()
      };
    }

    case 'ERROR_OCCURRED': {
      return {
        ...context,
        previousState: context.currentState,
        currentState: 'ERROR',
        error: event.error
      };
    }

    case 'RECOVER_FROM_ERROR': {
      const targetState = event.targetState || context.previousState || 'URL_INPUT';
      return {
        ...context,
        currentState: targetState,
        previousState: null,
        error: null,
        retryCount: 0
      };
    }

    case 'RETRY_CURRENT_OPERATION': {
      const targetState = context.previousState || 'URL_INPUT';
      return {
        ...context,
        currentState: targetState,
        error: null,
        retryCount: context.retryCount + 1
      };
    }

    case 'OPEN_AUTH_MODAL': {
      return {
        ...context,
        showAuthModal: true
      };
    }

    case 'CLOSE_AUTH_MODAL': {
      return {
        ...context,
        showAuthModal: false
      };
    }

    case 'UPDATE_PROGRESS': {
      return {
        ...context,
        progress: {
          ...context.progress,
          ...event.progress
        }
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
          processedPages: event.processedPages ?? context.progress.processedPages
        }
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
    isCoffeeReturn: urlParams.get('coffee') === 'true',
    isRerun: urlParams.get('rerun') === 'true'
  };
}

// Helper function to create initial progress state
function createInitialProgress(): ProgressContext {
  return {
    currentStep: 'url-input',
    completedSteps: [],
    progress: 0,
    analysisStage: undefined,
    completedAnalysisStages: [],
    totalPages: undefined,
    processedPages: undefined,
    timeEstimate: undefined,
    loadingMessage: undefined
  };
}

// Helper function to update progress based on flow state
function updateProgressForState(state: FlowState, progress: ProgressContext): ProgressContext {
  const newProgress = { ...progress };
  
  switch (state) {
    case 'URL_INPUT':
      newProgress.currentStep = 'url-input';
      newProgress.progress = 0;
      break;
    case 'EMAIL_CAPTURE':
      newProgress.currentStep = 'email-capture';
      newProgress.completedSteps = ['url-input'];
      newProgress.progress = 20;
      break;
    case 'ANALYSIS':
      newProgress.currentStep = 'analysis';
      newProgress.completedSteps = ['url-input', 'email-capture'];
      newProgress.progress = 40;
      newProgress.analysisStage = 'discovery';
      newProgress.completedAnalysisStages = [];
      break;
    case 'REVIEW':
      newProgress.currentStep = 'review';
      newProgress.completedSteps = ['url-input', 'email-capture', 'analysis'];
      newProgress.progress = 70;
      newProgress.analysisStage = undefined;
      newProgress.completedAnalysisStages = ['discovery', 'content-fetch', 'ai-analysis', 'finalization'];
      break;
    case 'GENERATION':
      newProgress.currentStep = 'generation';
      newProgress.completedSteps = ['url-input', 'email-capture', 'analysis', 'review'];
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
    userTier = 'coffee';
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
    retryCount: 0
  };
}

// Main hook
export function useFlowStateMachine() {
  const { user, loading: authLoading } = useAuth();
  const [location] = useLocation();

  // Parse URL parameters
  const urlParams = useMemo(() => parseURLParams(location), [location]);

  // Initialize state machine
  const [context, dispatch] = useReducer(
    flowReducer,
    createInitialState(urlParams, authLoading)
  );

  // Handle URL parameter changes
  useEffect(() => {
    if (urlParams.url && urlParams.url !== context.websiteUrl) {
      console.log('🌐 URL parameter detected:', urlParams.url);
      dispatch({ type: 'URL_SUBMITTED', url: urlParams.url });
    }

    if (urlParams.email && urlParams.email !== context.userEmail) {
      console.log('📧 Email parameter detected:', urlParams.email);
      const tier = urlParams.isCoffeeReturn ? 'coffee' : 'starter';
      dispatch({ type: 'EMAIL_CAPTURED', email: urlParams.email, tier });
    }
  }, [urlParams, context.websiteUrl, context.userEmail]);

  // Handle auth state changes
  useEffect(() => {
    if (!authLoading) {
      console.log('🔐 Auth loading completed, user:', user?.email || 'none');
      dispatch({ type: 'AUTH_RESOLVED', user });
    }
  }, [authLoading, user]);

  // Computed properties for convenience
  const effectiveEmail = user?.email || context.userEmail;
  const effectiveTier = user?.tier || context.userTier;
  
  // Determine component visibility based on state
  const visibility = {
    urlInput: context.currentState === 'URL_INPUT',
    authLoading: context.currentState === 'AUTH_CHECK' && authLoading,
    emailCapture: context.currentState === 'EMAIL_CAPTURE' && !authLoading && !user,
    tierLimits: context.currentState === 'TIER_LIMITS',
    analysis: context.currentState === 'ANALYSIS',
    review: context.currentState === 'REVIEW' && context.analysisId !== null,
    generation: context.currentState === 'GENERATION' && context.generatedFileId !== null,
    error: context.currentState === 'ERROR'
  };

  // Action creators
  const actions = {
    submitUrl: (url: string) => dispatch({ type: 'URL_SUBMITTED', url }),
    captureEmail: (email: string, tier: UserTier) => dispatch({ type: 'EMAIL_CAPTURED', email, tier }),
    proceedToAnalysis: () => dispatch({ type: 'PROCEED_TO_ANALYSIS' }),
    coffeeProceedToAnalysis: () => dispatch({ type: 'COFFEE_PROCEED_TO_ANALYSIS' }),
    completeAnalysis: (analysisId: number, pages: DiscoveredPage[]) => 
      dispatch({ type: 'ANALYSIS_COMPLETE', analysisId, pages }),
    generateFile: (fileId: number) => dispatch({ type: 'FILE_GENERATED', fileId }),
    resetWorkflow: () => dispatch({ type: 'RESET_WORKFLOW' }),
    viewAnalysisDetails: () => dispatch({ type: 'VIEW_ANALYSIS_DETAILS' }),
    openAuthModal: () => dispatch({ type: 'OPEN_AUTH_MODAL' }),
    closeAuthModal: () => dispatch({ type: 'CLOSE_AUTH_MODAL' }),
    updateProgress: (progress: Partial<ProgressContext>) => dispatch({ type: 'UPDATE_PROGRESS', progress }),
    updateAnalysisProgress: (stage: string, totalPages?: number, processedPages?: number) => 
      dispatch({ type: 'UPDATE_ANALYSIS_PROGRESS', stage, totalPages, processedPages }),
    reportError: (error: ErrorContext) => dispatch({ type: 'ERROR_OCCURRED', error }),
    recoverFromError: (targetState?: FlowState) => dispatch({ type: 'RECOVER_FROM_ERROR', targetState }),
    retryCurrentOperation: () => dispatch({ type: 'RETRY_CURRENT_OPERATION' })
  };

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
    actions
  };
}

// Export additional types for use in components
export type { FlowContext as FlowMachineContext };