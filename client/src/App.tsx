import { Switch, Route } from 'wouter';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { initAnalytics } from '@/lib/analytics';
import { initializeEnzuzo } from '@/lib/enzuzo';
import Home from '@/pages/home';
import CoffeeSuccess from '@/pages/coffee-success';
import Dashboard from '@/pages/dashboard';
import Pricing from '@/pages/pricing';
import VerifyEmail from '@/pages/verify-email';
import { AboutPage } from '@/pages/about';
import { DocsPage } from '@/pages/docs';
import { ContactPage } from '@/pages/contact';
import { PrivacyPage } from '@/pages/privacy';
import { TermsPage } from '@/pages/terms';
import CookiesPage from '@/pages/cookies';
import { BlogPage } from '@/pages/blog';
import SignupPage from '@/pages/signup';
import LoginPage from '@/pages/login';
import ForgotPasswordPage from '@/pages/forgot-password';
import ResetPasswordPage from '@/pages/reset-password';
import AnalyzePage from '@/pages/analyze';
import ValidatePage from '@/pages/validate';
import CheckEmailPage from '@/pages/check-email';
import NotFound from '@/pages/not-found';
import AnalysisDetailPage from '@/pages/analysis-detail';

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/analyze" component={AnalyzePage} />
      <Route path="/validate" component={ValidatePage} />
      <Route path="/analysis/:id" component={AnalysisDetailPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/about" component={AboutPage} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/privacy-policy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/cookies" component={CookiesPage} />
      <Route path="/blog" component={BlogPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/check-email" component={CheckEmailPage} />
      <Route path="/coffee-success" component={CoffeeSuccess} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Initialize Analytics (GTM preferred, GA4 fallback)
    initAnalytics();
    // Initialize Enzuzo GDPR solution (will handle consent)
    initializeEnzuzo();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner position="top-center" />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
