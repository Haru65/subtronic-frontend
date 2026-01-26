import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import { useConfigStore } from "@/stores/config";
// import { useAuthStore } from "@/stores/auth"; // COMMENTED OUT FOR DEVELOPMENT

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    component: () => import("@/layouts/main-layout/MainLayout.vue"),
    children: [
      {
        path: "",
        name: "home",
        redirect: "/dashboard"
      },
      {
        path: "/dashboard",
        name: "dashboard",
        component: () => import("@/views/apps/iot/dashboard/MainDashboard.vue"),
        meta: {
          pageTitle: "Dashboard",
          breadcrumbs: ["Dashboards"],
        },
      },
      {
        path: "/devices",
        name: "devices",
        component: () => import("@/views/apps/iot/devices/Devices.vue"),
        meta: {
          pageTitle: "Devices",
          breadcrumbs: ["IOT", "Devices"],
        },
      },
      {
        path: "/devices/:id",
        name: "device-details",
        component: () => import("@/components/iot/DeviceDetailsModern.vue"),
        meta: {
          pageTitle: "Device Details",
          breadcrumbs: ["IOT", "Devices", "Details"],
        },
      },
      {
        path: "/devices/:id/legacy",
        name: "device-details-legacy",
        component: () => import("@/views/apps/iot/devices/DeviceDetails.vue"),
        meta: {
          pageTitle: "Device Details (Legacy)",
          breadcrumbs: ["IOT", "Devices", "Legacy Details"],
        },
      },
      {
        path: "/devices/:deviceId/modern",
        name: "device-details-modern",
        component: () => import("@/components/iot/DeviceDetailsModern.vue"),
        meta: {
          pageTitle: "Device Details (Modern)",
          breadcrumbs: ["IOT", "Devices", "Modern Details"],
        },
      },
      {
        path: "/devices/demo/modern",
        name: "device-details-demo",
        component: () => import("@/views/apps/iot/devices/ModernDeviceDetailsDemo.vue"),
        meta: {
          pageTitle: "Modern Device Details Demo",
          breadcrumbs: ["IOT", "Devices", "Demo"],
        },
      },
      {
        path: "/subtronic/devices/:deviceId",
        name: "subtronic-device-details",
        component: () => import("@/components/iot/SubtronicDeviceDetails.vue"),
        meta: {
          pageTitle: "Subtronic Device Details",
          breadcrumbs: ["IOT", "Subtronic", "Device Details"],
        },
      },
      {
        path: "/subtronics/devices/:deviceId",
        name: "subtronics-device-details",
        component: () => import("@/components/iot/SubtronicsDeviceDetails.vue"),
        meta: {
          pageTitle: "Subtronics Gas Monitor",
          breadcrumbs: ["IOT", "Subtronics", "Gas Monitor"],
        },
      },
      {
        path: "/subtronics/demo",
        name: "subtronics-demo",
        component: () => import("@/views/apps/iot/devices/SubtronicsDemo.vue"),
        meta: {
          pageTitle: "Subtronics Demo",
          breadcrumbs: ["IOT", "Subtronics", "Demo"],
        },
      },
      {
        path: "/reports",
        name: "reports",
        component: () => import("@/views/apps/iot/reports/Reports.vue"),
        meta: {
          pageTitle: "Reports",
          breadcrumbs: ["IOT", "Reports"],
        },
      },
      {
        path: "/alarms",
        name: "alarms",
        component: () => import("@/views/apps/iot/alarms/AlarmListing.vue"),
        meta: {
          pageTitle: "Alarms",
          breadcrumbs: ["IOT", "Alarms"],
        },
      },
      {
        path: "/device-status",
        name: "device-status",
        component: () => import("@/components/iot/DeviceStatusDashboard.vue"),
        meta: {
          pageTitle: "Device Status Dashboard",
          breadcrumbs: ["IOT", "Device Status"],
        },
      },
      {
        path: "/locations",
        name: "locations",
        component: () => import("@/views/apps/iot/locations/LocationListing.vue"),
        meta: {
          pageTitle: "Locations",
          breadcrumbs: ["IOT", "Locations"],
        },
      },
      {
        path: "/builder",
        name: "builder",
        component: () => import("@/views/LayoutBuilder.vue"),
        meta: {
          pageTitle: "Layout Builder",
          breadcrumbs: ["Layout"],
        },
      },
      {
        path: "/crafted/pages/profile",
        name: "profile",
        component: () => import("@/components/page-layouts/Profile.vue"),
        meta: {
          breadcrumbs: ["Pages", "Profile"],
        },
        children: [
          {
            path: "overview",
            name: "profile-overview",
            component: () =>
              import("@/views/crafted/pages/profile/Overview.vue"),
            meta: {
              pageTitle: "Overview",
            },
          },
          {
            path: "projects",
            name: "profile-projects",
            component: () =>
              import("@/views/crafted/pages/profile/Projects.vue"),
            meta: {
              pageTitle: "Projects",
            },
          },
          {
            path: "campaigns",
            name: "profile-campaigns",
            component: () =>
              import("@/views/crafted/pages/profile/Campaigns.vue"),
            meta: {
              pageTitle: "Campaigns",
            },
          },
          {
            path: "documents",
            name: "profile-documents",
            component: () =>
              import("@/views/crafted/pages/profile/Documents.vue"),
            meta: {
              pageTitle: "Documents",
            },
          },
          {
            path: "connections",
            name: "profile-connections",
            component: () =>
              import("@/views/crafted/pages/profile/Connections.vue"),
            meta: {
              pageTitle: "Connections",
            },
          },
          {
            path: "activity",
            name: "profile-activity",
            component: () =>
              import("@/views/crafted/pages/profile/Activity.vue"),
            meta: {
              pageTitle: "Activity",
            },
          },
        ],
      },
      {
        path: "/crafted/pages/wizards/horizontal",
        name: "horizontal-wizard",
        component: () => import("@/views/crafted/pages/wizards/Horizontal.vue"),
        meta: {
          pageTitle: "Horizontal",
          breadcrumbs: ["Pages", "Wizard"],
        },
      },
      {
        path: "/crafted/pages/wizards/vertical",
        name: "vertical-wizard",
        component: () => import("@/views/crafted/pages/wizards/Vertical.vue"),
        meta: {
          pageTitle: "Vertical",
          breadcrumbs: ["Pages", "Wizard"],
        },
      },
      {
        path: "/crafted/account",
        name: "account",
        component: () => import("@/views/crafted/account/Account.vue"),
        meta: {
          breadcrumbs: ["Crafted", "Account"],
        },
        children: [
          {
            path: "overview",
            name: "account-overview",
            component: () => import("@/views/crafted/account/Overview.vue"),
            meta: {
              pageTitle: "Overview",
            },
          },
          {
            path: "settings",
            name: "account-settings",
            component: () => import("@/views/crafted/account/Settings.vue"),
            meta: {
              pageTitle: "Settings",
            },
          },
        ],
      },
      {
        path: "/apps/customers/getting-started",
        name: "apps-customers-getting-started",
        component: () => import("@/views/apps/customers/GettingStarted.vue"),
        meta: {
          pageTitle: "Getting Started",
          breadcrumbs: ["Apps", "Customers"],
        },
      },
      {
        path: "/apps/customers/customers-listing",
        name: "apps-customers-listing",
        component: () => import("@/views/apps/customers/CustomersListing.vue"),
        meta: {
          pageTitle: "Customers Listing",
          breadcrumbs: ["Apps", "Customers"],
        },
      },
      {
        path: "/apps/customers/customer-details",
        name: "apps-customers-details",
        component: () => import("@/views/apps/customers/CustomerDetails.vue"),
        meta: {
          pageTitle: "Customers Details",
          breadcrumbs: ["Apps", "Customers"],
        },
      },
      {
        path: "/apps/subscriptions/getting-started",
        name: "apps-subscriptions-getting-started",
        component: () =>
          import("@/views/apps/subscriptions/GettingStarted.vue"),
        meta: {
          pageTitle: "Getting Started",
          breadcrumbs: ["Apps", "Subscriptions"],
        },
      },
      {
        path: "/apps/subscriptions/subscription-list",
        name: "apps-subscriptions-subscription-list",
        component: () =>
          import("@/views/apps/subscriptions/SubscriptionList.vue"),
        meta: {
          pageTitle: "Getting Started",
          breadcrumbs: ["Apps", "Subscriptions"],
        },
      },
      {
        path: "/apps/subscriptions/add-subscription",
        name: "apps-subscriptions-add-subscription",
        component: () =>
          import("@/views/apps/subscriptions/AddSubscription.vue"),
        meta: {
          pageTitle: "Add Subscription",
          breadcrumbs: ["Apps", "Subscriptions"],
        },
      },
      {
        path: "/apps/subscriptions/view-subscription",
        name: "apps-subscriptions-view-subscription",
        component: () =>
          import("@/views/apps/subscriptions/ViewSubscription.vue"),
        meta: {
          pageTitle: "View Subscription",
          breadcrumbs: ["Apps", "Subscriptions"],
        },
      },
      {
        path: "/apps/calendar",
        name: "apps-calendar",
        component: () => import("@/views/apps/Calendar.vue"),
        meta: {
          pageTitle: "Calendar",
          breadcrumbs: ["Apps"],
        },
      },
      {
        path: "/apps/chat/private-chat",
        name: "apps-private-chat",
        component: () => import("@/views/apps/chat/Chat.vue"),
        meta: {
          pageTitle: "Private Chat",
          breadcrumbs: ["Apps", "Chat"],
        },
      },
      {
        path: "/apps/chat/group-chat",
        name: "apps-group-chat",
        component: () => import("@/views/apps/chat/Chat.vue"),
        meta: {
          pageTitle: "Group Chat",
          breadcrumbs: ["Apps", "Chat"],
        },
      },
      {
        path: "/apps/chat/drawer-chat",
        name: "apps-drawer-chat",
        component: () => import("@/views/apps/chat/DrawerChat.vue"),
        meta: {
          pageTitle: "Drawer Chat",
          breadcrumbs: ["Apps", "Chat"],
        },
      },
      {
        path: "/crafted/modals/general/invite-friends",
        name: "modals-general-invite-friends",
        component: () =>
          import("@/views/crafted/modals/general/InviteFriends.vue"),
        meta: {
          pageTitle: "Invite Friends",
          breadcrumbs: ["Crafted", "Modals", "General"],
        },
      },
      {
        path: "/crafted/modals/general/view-user",
        name: "modals-general-view-user",
        component: () => import("@/views/crafted/modals/general/ViewUsers.vue"),
        meta: {
          pageTitle: "View User",
          breadcrumbs: ["Crafted", "Modals", "General"],
        },
      },
      {
        path: "/crafted/modals/general/upgrade-plan",
        name: "modals-general-upgrade-plan",
        component: () =>
          import("@/views/crafted/modals/general/UpgradePlan.vue"),
        meta: {
          pageTitle: "Upgrade Plan",
          breadcrumbs: ["Crafted", "Modals", "General"],
        },
      },
      {
        path: "/crafted/modals/general/share-and-earn",
        name: "modals-general-share-and-earn",
        component: () =>
          import("@/views/crafted/modals/general/ShareAndEarn.vue"),
        meta: {
          pageTitle: "Share And Earn",
          breadcrumbs: ["Crafted", "Modals", "General"],
        },
      },
      {
        path: "/crafted/modals/forms/new-target",
        name: "modals-forms-new-target",
        component: () => import("@/views/crafted/modals/forms/NewTarget.vue"),
        meta: {
          pageTitle: "New Target",
          breadcrumbs: ["Crafted", "Modals", "Forms"],
        },
      },
      {
        path: "/crafted/modals/forms/new-card",
        name: "modals-forms-new-card",
        component: () => import("@/views/crafted/modals/forms/NewCard.vue"),
        meta: {
          pageTitle: "New Card",
          breadcrumbs: ["Crafted", "Modals", "Forms"],
        },
      },
      {
        path: "/crafted/modals/forms/new-address",
        name: "modals-forms-new-address",
        component: () => import("@/views/crafted/modals/forms/NewAddress.vue"),
        meta: {
          pageTitle: "New Address",
          breadcrumbs: ["Crafted", "Modals", "Forms"],
        },
      },
      {
        path: "/crafted/modals/forms/create-api-key",
        name: "modals-forms-create-api-key",
        component: () =>
          import("@/views/crafted/modals/forms/CreateApiKey.vue"),
        meta: {
          pageTitle: "Create Api Key",
          breadcrumbs: ["Crafted", "Modals", "Forms"],
        },
      },
      {
        path: "/crafted/modals/wizards/two-factor-auth",
        name: "modals-wizards-two-factor-auth",
        component: () =>
          import("@/views/crafted/modals/wizards/TwoFactorAuth.vue"),
        meta: {
          pageTitle: "Two Factory Auth",
          breadcrumbs: ["Crafted", "Modals", "Wizards"],
        },
      },
      {
        path: "/crafted/modals/wizards/create-app",
        name: "modals-wizards-create-app",
        component: () => import("@/views/crafted/modals/wizards/CreateApp.vue"),
        meta: {
          pageTitle: "Create App",
          breadcrumbs: ["Crafted", "Modals", "Wizards"],
        },
      },
      {
        path: "/crafted/modals/wizards/create-account",
        name: "modals-wizards-create-account",
        component: () =>
          import("@/views/crafted/modals/wizards/CreateAccount.vue"),
        meta: {
          pageTitle: "Create Account",
          breadcrumbs: ["Crafted", "Modals", "Wizards"],
        },
      },
      {
        path: "/crafted/widgets/lists",
        name: "widgets-list",
        component: () => import("@/views/crafted/widgets/Lists.vue"),
        meta: {
          pageTitle: "Lists",
          breadcrumbs: ["Crafted", "Widgets"],
        },
      },
      {
        path: "/crafted/widgets/statistics",
        name: "widgets-statistics",
        component: () => import("@/views/crafted/widgets/Statistics.vue"),
        meta: {
          pageTitle: "Statistics",
          breadcrumbs: ["Crafted", "Widgets"],
        },
      },
      {
        path: "/crafted/widgets/charts",
        name: "widgets-charts",
        component: () => import("@/views/crafted/widgets/Charts.vue"),
        meta: {
          pageTitle: "Charts",
          breadcrumbs: ["Crafted", "Widgets"],
        },
      },
      {
        path: "/crafted/widgets/mixed",
        name: "widgets-mixed",
        component: () => import("@/views/crafted/widgets/Mixed.vue"),
        meta: {
          pageTitle: "Mixed",
          breadcrumbs: ["Crafted", "Widgets"],
        },
      },
      {
        path: "/crafted/widgets/tables",
        name: "widgets-tables",
        component: () => import("@/views/crafted/widgets/Tables.vue"),
        meta: {
          pageTitle: "Tables",
          breadcrumbs: ["Crafted", "Widgets"],
        },
      },
      {
        path: "/crafted/widgets/feeds",
        name: "widgets-feeds",
        component: () => import("@/views/crafted/widgets/Feeds.vue"),
        meta: {
          pageTitle: "Feeds",
          breadcrumbs: ["Crafted", "Widgets"],
        },
      },
    ],
  },
  // AUTHENTICATION ROUTES COMMENTED OUT FOR DEVELOPMENT
  // {
  //   path: "/",
  //   component: () => import("@/layouts/AuthLayout.vue"),
  //   children: [
  //     {
  //       path: "/login",
  //       name: "login",
  //       component: () =>
  //         import("@/views/crafted/authentication/basic-flow/SignIn.vue"),
  //       meta: {
  //         pageTitle: "Login",
  //       },
  //     },
  //     {
  //       path: "/register",
  //       name: "register", 
  //       component: () =>
  //         import("@/views/crafted/authentication/basic-flow/SignUp.vue"),
  //       meta: {
  //         pageTitle: "Register",
  //       },
  //     },
  //     {
  //       path: "/password-reset",
  //       name: "password-reset",
  //       component: () =>
  //         import("@/views/crafted/authentication/basic-flow/PasswordReset.vue"),
  //       meta: {
  //         pageTitle: "Password Reset",
  //       },
  //     },
  //   ],
  // },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const configStore = useConfigStore();
  // const authStore = useAuthStore(); // COMMENTED OUT FOR DEVELOPMENT

  // current page view title
  document.title = `${to.meta.pageTitle} - ${import.meta.env.VITE_APP_NAME}`;

  // reset config to initial state
  configStore.resetLayoutConfig();

  // Routes that don't require authentication - COMMENTED OUT FOR DEVELOPMENT
  // const publicRoutes = ['login', 'register', 'password-reset'];
  
  // Check if the route requires authentication - COMMENTED OUT FOR DEVELOPMENT
  // const requiresAuth = !publicRoutes.includes(to.name as string);

  // Handle root path routing based on authentication status - MODIFIED FOR DEVELOPMENT
  if (to.name === 'home' || to.path === '/') {
    // Always redirect to dashboard for development (no auth check)
    next({ name: 'dashboard' });
    return;
  }

  // AUTHENTICATION CHECKS COMMENTED OUT FOR DEVELOPMENT
  // if (requiresAuth && !authStore.isAuthenticated) {
  //   // Redirect to login if not authenticated
  //   next({ name: 'login' });
  // } else if (!requiresAuth && authStore.isAuthenticated) {
  //   // Redirect to dashboard if already authenticated and trying to access auth pages
  //   next({ name: 'dashboard' });
  // } else {
  //   // Allow navigation
  //   next();
  // }

  // ALWAYS ALLOW NAVIGATION FOR DEVELOPMENT
  next();

  // Scroll page to top on every route change
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "smooth",
  });
});

export default router;
