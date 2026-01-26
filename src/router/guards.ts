/**
 * Router Navigation Guards and Utilities
 * 
 * Enhanced router configuration with:
 * - Authentication guards
 * - Permission-based access control
 * - Page title management
 * - Navigation helpers
 */

import type { Router, NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

/**
 * Setup enhanced navigation guards
 */
export function setupRouterGuards(router: Router): void {
  
  /**
   * Global before guard - handles authentication and permissions
   * COMMENTED OUT FOR DEVELOPMENT - NO AUTHENTICATION REQUIRED
   */
  router.beforeEach(async (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
    // const authStore = useAuthStore();
    
    // 1. Page Title Management
    const pageTitle = to.meta.pageTitle as string || 'Page';
    document.title = `${pageTitle} - ${import.meta.env.VITE_APP_NAME}`;
    
    // 2. Public routes that don't require authentication
    // const publicRoutes = ['login', 'register', 'password-reset', 'forgot-password'];
    // const isPublicRoute = publicRoutes.includes(to.name as string);
    
    // 3. Handle authentication requirements - COMMENTED OUT
    // const requiresAuth = to.meta.requiresAuth !== false; // Default to true
    
    // if (!isPublicRoute && requiresAuth && !authStore.isAuthenticated) {
    //   // Store intended destination for redirect after login
    //   sessionStorage.setItem('redirectAfterLogin', to.fullPath);
    //   
    //   next({ 
    //     name: 'login',
    //     query: { redirect: to.fullPath }
    //   });
    //   return;
    // }
    
    // 4. Redirect authenticated users away from auth pages - COMMENTED OUT
    // if (isPublicRoute && authStore.isAuthenticated) {
    //   next({ name: 'dashboard' });
    //   return;
    // }
    
    // 5. Permission-based access control - COMMENTED OUT
    // if (to.meta.permissions && Array.isArray(to.meta.permissions)) {
    //   const requiredPermissions = to.meta.permissions as string[];
    //   const hasPermission = await checkPermissions(requiredPermissions, authStore);
    //   
    //   if (!hasPermission) {
    //     console.warn('Access denied - insufficient permissions:', requiredPermissions);
    //     next({ 
    //       name: 'dashboard',
    //       query: { error: 'insufficient_permissions' }
    //     });
    //     return;
    //   }
    // }
    
    // 6. Allow navigation - ALWAYS ALLOW FOR DEVELOPMENT
    next();
  });
  
  /**
   * After each navigation - cleanup and tracking
   */
  router.afterEach((to: RouteLocationNormalized) => {
    // Scroll to top on route change
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
    
    // Track page view (if analytics enabled)
    if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
      trackPageView(to);
    }
  });
  
  /**
   * Error handler
   */
  router.onError((error) => {
    console.error('Router error:', error);
    
    // Handle chunk loading errors (lazy loading)
    if (error.message.includes('Failed to fetch dynamically imported module')) {
      console.warn('Chunk loading error - reloading page...');
      window.location.reload();
    }
  });
}

/**
 * Check if user has required permissions
 */
async function checkPermissions(requiredPermissions: string[], authStore: any): Promise<boolean> {
  // Get user permissions from auth store
  const userPermissions = authStore.user?.permissions || [];
  
  // Check if user has all required permissions
  return requiredPermissions.every(permission => 
    userPermissions.includes(permission)
  );
}

/**
 * Track page view for analytics
 */
function trackPageView(to: RouteLocationNormalized): void {
  try {
    // Example: Send to analytics service
    console.log('Page view:', {
      path: to.path,
      name: to.name,
      title: to.meta.pageTitle,
      timestamp: new Date().toISOString(),
    });
    
    // Add your analytics tracking here
    // e.g., gtag('event', 'page_view', { page_path: to.path });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
}

/**
 * Navigation helpers
 */
export const navigationHelpers = {
  /**
   * Navigate to route with error handling
   */
  async safeNavigate(router: Router, to: any): Promise<boolean> {
    try {
      await router.push(to);
      return true;
    } catch (error) {
      console.error('Navigation error:', error);
      return false;
    }
  },
  
  /**
   * Navigate back or to fallback route
   */
  goBackOrFallback(router: Router, fallback: string = '/dashboard'): void {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  },
  
  /**
   * Check if route exists
   */
  routeExists(router: Router, name: string): boolean {
    return router.hasRoute(name);
  },
  
  /**
   * Get current route breadcrumbs
   */
  getCurrentBreadcrumbs(route: RouteLocationNormalized): string[] {
    return (route.meta.breadcrumbs as string[]) || [];
  },
};

/**
 * Route guard for device-specific operations
 */
export function deviceRouteGuard(to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext): void {
  const deviceId = to.params.deviceId as string;
  
  if (!deviceId) {
    console.error('Device ID is required');
    next({ name: 'devices' });
    return;
  }
  
  // Validate device ID format
  const isValidFormat = /^\d+$/.test(deviceId) || /^DEVICE_\d+$/i.test(deviceId);
  
  if (!isValidFormat) {
    console.error('Invalid device ID format:', deviceId);
    next({ name: 'devices' });
    return;
  }
  
  next();
}

/**
 * Middleware for checking feature flags
 */
export function featureFlagGuard(feature: string) {
  return (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
    // Check if feature is enabled
    const isEnabled = import.meta.env[`VITE_FEATURE_${feature.toUpperCase()}`] === 'true';
    
    if (!isEnabled) {
      console.warn(`Feature ${feature} is not enabled`);
      next({ name: 'dashboard' });
      return;
    }
    
    next();
  };
}

export default setupRouterGuards;
