import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import {
  getCompany,
  getTraining,
  getEmployee,
  getSkillMatrix,
  getUser,
} from "@/stores/api";
import { useAuthStore } from "@/stores/auth";
import { useConfigStore } from "@/stores/config";
import {
  checkCookie,
  getCookie,
  deleteCookie,
} from "@/core/services/JwtService";
const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: "/dashboard",
    component: () => import("@/layouts/main-layout/MainLayout.vue"),
    children: [
      {
        path: "/dashboard",
        name: "dashboard",
        component: () => import("@/views/apps/iot/dashboard/MainDashboard.vue"),
        meta: {
          pageTitle: "Welcome",
          breadcrumbs: ["Dashboard"],
        },
      },
      {
        path: "/devices",
        name: "devices",
        component: () => import("@/views/apps/iot/devices/DevicesWithZones.vue"),
        meta: {
          pageTitle: "Devices",
          breadcrumbs: ["Devices"],
        },
      },
      {
        path: "/reports",
        name: "reports",
        component: () => import("@/views/apps/iot/reports/Reports.vue"),
        meta: {
          pageTitle: "Reports",
          breadcrumbs: ["Reports"],
        },
      },
      {
        path: "/alarms",
        name: "alarms",
        component: () => import("@/views/apps/iot/alarms/AlarmListing.vue"),
        meta: {
          pageTitle: "Alarms",
          breadcrumbs: ["Alarms"],
        },
      },
      {
        path: "/locations",
        name: "locations",
        component: () => import("@/views/apps/iot/locations/LocationListing.vue"),
        meta: {
          pageTitle: "Locations",
          breadcrumbs: ["Locations"],
        },
      },
      {
        path: "/permission_manager/list",
        name: "permission-manager-list",
        component: () => import("@/views/apps/admin/PermissionManager.vue"),
        meta: {
          pageTitle: "Permission Manager",
          breadcrumbs: ["Permission Manager"],
        },
      },
      {
        path: "/activity_logger/list",
        name: "activity-logger-list",
        component: () => import("@/views/apps/admin/ActivityLogger.vue"),
        meta: {
          pageTitle: "Activity Logger",
          breadcrumbs: ["Activity Logger"],
        },
      },
      {
        path: "/module_manager/list",
        name: "module-manager-list",
        component: () => import("@/views/apps/admin/ModuleManager.vue"),
        meta: {
          pageTitle: "Module Manager",
          breadcrumbs: ["Module Manager"],
        },
      },

      {
        path: "/company/list",
        name: "company-list",
        component: () =>
          import("@/views/apps/admin/companies/CompanyListing.vue"),
        meta: {
          pageTitle: "Company",
          breadcrumbs: ["Company"],
        },
      },
      {
        path: "/company/add",
        name: "company-add",
        component: () => import("@/views/apps/admin/companies/CompanyAdd.vue"),
        meta: {
          pageTitle: "Add Company",
          breadcrumbs: ["Add Company"],
        },
      },
      {
        path: "/company/edit/:id",
        name: "company-edit",
        beforeEnter: async (to, from, next) => {
          const companyId = to.params.id;
          //console.log(companyId);
          try {
            const response = await getCompany(companyId);
            if (response.success == false || response.result.is_active == 0) {
              next("/404"); // Redirect to the fallback route
            } else {
              next(); // Continue to the desired route
            }
          } catch (error) {
            console.error(error);
            next("/404"); // Redirect to the fallback route
          }
        },
        component: () => import("@/views/apps/admin/companies/CompanyEdit.vue"),
        meta: {
          pageTitle: "Edit Company",
          breadcrumbs: ["Edit Company"],
        },
      },
      {
        path: "/company/settings/:id",
        name: "company-settings",
        component: () => import("@/views/apps/admin/companies/CompanySettings.vue"),
        meta: {
          pageTitle: "Company Settings",
          breadcrumbs: ["Company Settings"],
        },
      },
      {
        path: "/subscription/:id",
        name: "company-subscription",
        component: () => import("@/views/apps/admin/CompanySubscription.vue"),
        meta: {
          pageTitle: "Subscription",
        },
        // beforeEnter: async (to, from, next) => {
        //   const authStore = useAuthStore();
        //   authStore.verifyAuth();
        //   next();
        // },
      },
      {
        path: "/company/modules/:id",
        name: "company-modules",
        component: () => import("@/views/apps/admin/companies/CompanyModules.vue"),
        meta: {
          pageTitle: "Company Modules",
          breadcrumbs: ["Company Modules"],
        },
      },
      {
        path: "/users/list",
        name: "users-list",
        component: () => import("@/views/apps/admin/users/UserListing.vue"),
        meta: {
          pageTitle: "Users",
          breadcrumbs: ["Users"],
        },
      },
      {
        path: "/users/add",
        name: "users-add",
        component: () => import("@/views/apps/admin/users/UserAdd.vue"),
        meta: {
          pageTitle: "Add User",
          breadcrumbs: ["Add User"],
        },
      },
      {
        path: "/users/edit/:id",
        name: "users-edit",
        beforeEnter: async (to, from, next) => {
          const userId = to.params.id;
          //console.log(companyId);
          try {
            const response = await getUser(userId);
            if (response.success == false || response.result.is_active == 0) {
              next("/404"); // Redirect to the fallback route
            } else {
              next(); // Continue to the desired route
            }
          } catch (error) {
            console.error(error);
            next("/404"); // Redirect to the fallback route
          }
        },
        component: () => import("@/views/apps/admin/users/UserEdit.vue"),
        meta: {
          pageTitle: "Edit User",
          breadcrumbs: ["Edit User"],
        },
      },
      {
        path: "/employee/list",
        name: "employee-list",
        component: () =>
          import("@/views/apps/hr/employees/EmployeeListing.vue"),
        meta: {
          pageTitle: "Employees",
          breadcrumbs: ["Employees"],
        },
      },
      {
        path: "/employee/add",
        name: "employee-add",
        component: () =>
          import("@/views/apps/hr/employees/EmployeeAdd.vue"),
        meta: {
          pageTitle: "Add Employee",
          breadcrumbs: ["Add Employee"],
        },
      },
      {
        path: "/employee/edit/:id",
        name: "employee-edit",
        beforeEnter: async (to, from, next) => {
          const empId = to.params.id;
          try {
            const response = await getEmployee(empId.toString());
            console.log(response);
            if (response.success == false || response.result.is_active == 0) {
              next("/404"); // Redirect to the fallback route
            } else {
              next(); // Continue to the desired route
            }
          } catch (error) {
            console.error(error);
            next("/404"); // Redirect to the fallback route
          }
        },
        component: () =>
          import("@/views/apps/hr/employees/EmployeeEdit.vue"),
        meta: {
          pageTitle: "Edit Employee",
          breadcrumbs: ["Edit Employee"],
        },
      },

      // Training Routes
      {
        path: "/training/list",
        name: "training-list",
        component: () =>
          import("@/views/apps/hr/training/TrainingListing.vue"),
        meta: {
          pageTitle: "Trainings",
          breadcrumbs: ["Trainings"],
        },
      },
      {
        path: "/training/add",
        name: "training-add",
        component: () =>
          import("@/views/apps/hr/training/TrainingAdd.vue"),
        meta: {
          pageTitle: "Add Training",
          breadcrumbs: ["Add Training"],
        },
      },
      {
        path: "/training/edit/:id",
        name: "training-edit",
        beforeEnter: async (to, from, next) => {
          const trainingID = to.params.id;
          try {
            const response = await getTraining(trainingID.toString());
            console.log(response);
            if (response.success == false || response.result.is_active == 0) {
              next("/404"); // Redirect to the fallback route
            } else {
              next(); // Continue to the desired route
            }
          } catch (error) {
            console.error(error);
            next("/404"); // Redirect to the fallback route
          }
        },
        component: () =>
          import("@/views/apps/hr/training/TrainingEdit.vue"),
        meta: {
          pageTitle: "Edit Training",
          breadcrumbs: ["Edit Training"],
        },
      },

      // Skill Matrix Routes
      {
        path: "/skill_matrix/list",
        name: "skill-matrix-list",
        component: () =>
          import("@/views/apps/hr/skillmatrix/SkillMatrixListing.vue"),
        meta: {
          pageTitle: "Skill Matrix",
          breadcrumbs: ["Skill Matrix"],
        },
      },
      {
        path: "/skill_matrix/add",
        name: "skill-matrix-add",
        component: () =>
          import("@/views/apps/hr/skillmatrix/SkillMatrixAdd.vue"),
        meta: {
          pageTitle: "Add Skill Matrix",
          breadcrumbs: ["Add Skill Matrix"],
        },
      },
      {
        path: "/skill_matrix/edit/:id",
        name: "skill-matrix-edit",
        beforeEnter: async (to, from, next) => {
          const itemId = to.params.id;
          try {
            const response = await getSkillMatrix(itemId.toString());
            console.log(response);
            if (response.success == false || response.result.is_active == 0) {
              next("/404"); // Redirect to the fallback route
            } else {
              next(); // Continue to the desired route
            }
          } catch (error) {
            console.error(error);
            next("/404"); // Redirect to the fallback route
          }
        },
        component: () =>
          import("@/views/apps/hr/skillmatrix/SkillMatrixEdit.vue"),
        meta: {
          pageTitle: "Edit Skill Matrix",
          breadcrumbs: ["Edit Skill Matrix"],
        },
      },

      // Profile Page - Change Password
      {
        path: "/profile/changepassword",
        name: "change-password",
        component: () =>
          import("@/views/crafted/account/Settings.vue"),
        meta: {
          pageTitle: "Profile Details",
        }
      },

      // Notifications
      {
        path: "/notifications/list",
        name: "notifications-list",
        component: () => import("@/views/apps/notification/NotificationListing.vue"),
        meta: {
          pageTitle: "Notifications",
          breadcrumbs: ["Notifications"],
        },
      },

    ],
  },


  {
    path: "/",
    component: () => import("@/layouts/AuthLayout.vue"),
    children: [
      {
        path: "/login",
        name: "login",
        component: () =>
          import("@/views/crafted/authentication/basic-flow/SignIn.vue"),
        meta: {
          pageTitle: "Login",
        },
        beforeEnter: async (to, from, next) => {
          const auth = useAuthStore();
          if (auth.isAuthenticated) {
            return next("/dashboard");
          } else {
            return next();
          }
        },
      },
      {
        path: "/sign-up",
        name: "sign-up",
        component: () =>
          import("@/views/crafted/authentication/basic-flow/SignUp.vue"),
        meta: {
          pageTitle: "Sign Up",
        },
      },
      {
        path: "/password-reset",
        name: "password-reset",
        component: () =>
          import("@/views/crafted/authentication/basic-flow/PasswordReset.vue"),
        meta: {
          pageTitle: "Password reset",
        },
      },
    ],
  },
  {
    path: "/",
    component: () => import("@/layouts/SystemLayout.vue"),
    children: [
      {
        // the 404 route, when none of the above matches
        path: "/404",
        name: "404",
        component: () => import("@/views/crafted/authentication/Error404.vue"),
        meta: {
          pageTitle: "Error 404",
        },
      },
      {
        path: "/401",
        name: "401",
        component: () => import("@/views/crafted/authentication/Error401.vue"),
        meta: {
          pageTitle: "Error 401",
        },
      },
      {
        path: "/500",
        name: "500",
        component: () => import("@/views/crafted/authentication/Error500.vue"),
        meta: {
          pageTitle: "Error 500",
        },
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/404",
  },
  {
    path: "/",
    component: () => import("@/layouts/SystemLayout.vue"),
    children: [
      {
        // theterms route
        path: "/terms",
        name: "terms",
        component: () => import("@/views/crafted/pricing/Terms.vue"),
        meta: {
          pageTitle: "Terms",
        },
      },
      {
        path: "/plans",
        name: "plans",
        component: () => import("@/views/crafted/pricing/Plans.vue"),
        meta: {
          pageTitle: "Plans",
        },
      },
      {
        path: "/icons-page",
        name: "icons-page",
        component: () => import("@/views/crafted/pages/IconsPage.vue"),
        meta: {
          pageTitle: "Icons",
        },
      },
      {
        path: "/contactus",
        name: "contactus",
        component: () => import("@/views/crafted/pricing/ContactUs.vue"),
        meta: {
          pageTitle: "Contact Us",
        },
      },
      {
        path: "/thankyou",
        name: "thankyou",
        component: () => import("@/views/apps/ThankYou.vue"),
        meta: {
          pageTitle: "Thank You",
        },
      },
      {
        path: "/password-reset/:email/:token",
        name: "password-reset-form",
        component: () =>
          import("@/views/crafted/authentication/basic-flow/PasswordResetForm.vue"),
        meta: {
          pageTitle: "Password Reset Form",
        },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const configStore = useConfigStore();

  // current page view title
  document.title = `${to.meta.pageTitle} - ${import.meta.env.VITE_APP_NAME}`;

  // reset config to initial state
  configStore.resetLayoutConfig();

  // Proceed without auth checks
  next();

  // Scroll page to top on every route change
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "smooth",
  });
});

export default router;
