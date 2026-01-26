<template>
  <!--begin::Menu-->
  <div
    class="menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-600 menu-state-bg-light-primary fw-semobold py-4 fs-6 w-300px"
    data-kt-menu="true"
    style="z-index: 9999;"
  >
    <!--begin::Menu item-->
    <div class="menu-item px-3">
      <div class="menu-content d-flex align-items-top px-3">
        <!--begin::Avatar-->
        <div class="symbol symbol-50px me-5">
          <img
            v-if="User?.meta?.profile_pic"
            :src="`https://api.zeptac.com/storage/company/${User.company_details?.company_id}/profile_images/${User.meta.profile_pic}`"
            class="rounded-circle"
            alt="Logo"
          />
          <div v-else class="symbol-circle">
            <span
              :class="`bg-primary text-white text-uppercase`"
              class="symbol-label fs-3 fw-bold"
              >{{ User?.first_name?.charAt(0) || "" }}</span
            >
          </div>
        </div>
        <!--end::Avatar-->

        <!--begin::Username-->
        <div class="d-flex flex-column">
          <div class="fw-bold d-flex align-items-center fs-5 text-wrap">
            {{ User.first_name + " " + User.last_name }}
            <span class="badge badge-light-success fs-8 fw-semibold ms-2">{{ Identifier }}</span>
          </div>
          <div class="fw-semibold text-muted fs-7">
            {{
              User.company_details?.company_name ||
              User.meta?.company_name ||
              ""
            }}
          </div>
          <div class="fw-semibold text-primary fs-7">
            {{ User.email || "No email" }}
          </div>
        </div>
        <!--end::Username-->
      </div>
    </div>
    <!--end::Menu item-->

    <!--begin::Menu separator-->
    <div class="separator my-2"></div>
    <!--end::Menu separator-->

    <!--begin::Menu item-->
    <div class="menu-item px-5">
      <router-link to="/profile/changepassword" class="menu-link px-5">
        <span class="menu-icon">
          <i class="bi bi-person fs-3"></i>
        </span>
        <span class="menu-title">My Profile</span>
      </router-link>
    </div>
    <!--end::Menu item-->

    <!--begin::Menu item-->
    <div class="menu-item px-5">
      <router-link to="/apps/iot/dashboard" class="menu-link px-5">
        <span class="menu-icon">
          <i class="bi bi-speedometer2 fs-3"></i>
        </span>
        <span class="menu-title">Dashboard</span>
      </router-link>
    </div>
    <!--end::Menu item-->

    <!--begin::Menu item-->
    <div class="menu-item px-5">
      <router-link to="/apps/iot/devices" class="menu-link px-5">
        <span class="menu-icon">
          <i class="bi bi-cpu fs-3"></i>
        </span>
        <span class="menu-title">Devices</span>
      </router-link>
    </div>
    <!--end::Menu item-->

    <!--begin::Menu item-->
    <div class="menu-item px-5" v-if="Identifier == 'Company-Admin'">
      <router-link
        :to="`/company/settings/${User.company_id}`"
        class="menu-link px-5"
      >
        <span class="menu-icon">
          <i class="bi bi-gear fs-3"></i>
        </span>
        <span class="menu-title">Company Settings</span>
      </router-link>
    </div>
    <!--end::Menu item-->

    <!--begin::Menu item-->
    <div
      class="menu-item px-5"
      v-if="Identifier == 'Admin' || Identifier == 'Company-Admin'"
    >
      <router-link
        :to="`/subscription/${User.company_id}`"
        class="menu-link px-5"
      >
        <span class="menu-icon">
          <i class="bi bi-credit-card fs-3"></i>
        </span>
        <span class="menu-title">View Subscription</span>
      </router-link>
    </div>
    <!--end::Menu item-->

    <!--begin::Menu separator-->
    <div class="separator my-2"></div>
    <!--end::Menu separator-->

    <!--begin::Menu item-->
    <div class="menu-item px-5">
      <a href="#" class="menu-link px-5">
        <span class="menu-icon">
          <i class="bi bi-question-circle fs-3"></i>
        </span>
        <span class="menu-title">Help & Support</span>
      </a>
    </div>
    <!--end::Menu item-->

    <!--begin::Menu item-->
    <div class="menu-item px-5">
      <a @click="signOut()" class="menu-link px-5 text-danger">
        <span class="menu-icon">
          <i class="bi bi-box-arrow-right fs-3"></i>
        </span>
        <span class="menu-title">Logout</span>
      </a>
    </div>
    <!--end::Menu item-->
  </div>
  <!--end::Menu-->
</template>

<script lang="ts">
import { getAssetPath } from "@/core/helpers/assets";
import { computed, defineComponent } from "vue";
// import { useAuthStore } from "@/stores/auth"; // COMMENTED OUT FOR DEVELOPMENT
import { useRouter } from "vue-router";
import { Identifier } from "@/core/config/WhichUserConfig";
import { blank64 } from "./blank";

export default defineComponent({
  name: "kt-user-menu",
  components: {},
  setup() {
    const router = useRouter();
    // const store = useAuthStore(); // COMMENTED OUT FOR DEVELOPMENT
    
    // MOCK USER DATA FOR DEVELOPMENT
    const User = computed(() => ({
      first_name: "Demo",
      last_name: "User",
      email: "demo@example.com",
      company_id: "1",
      meta: {
        profile_pic: null,
        company_name: "Demo Company"
      },
      company_details: {
        company_id: 1,
        company_name: "Demo Company"
      }
    }));

    const signOut = () => {
      // store.logout(); // COMMENTED OUT FOR DEVELOPMENT
      // router.push({ name: "login" }); // COMMENTED OUT FOR DEVELOPMENT
      console.log("Logout clicked - authentication disabled for development");
    };

    return {
      signOut,
      getAssetPath,
      User,
      Identifier,
      blank64,
    };
  },
});
</script>

<style scoped>
/* Enhanced menu styling */
.menu-link {
  transition: all 0.2s ease;
  border-radius: 8px;
  margin: 2px 0;
}

.menu-link:hover {
  background-color: var(--bs-gray-100);
  transform: translateX(5px);
}

.menu-link:hover .menu-icon i {
  color: var(--bs-primary);
  transform: scale(1.1);
}

.menu-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 35px;
  margin-right: 10px;
}

.menu-icon i {
  transition: all 0.2s ease;
}

.menu-title {
  font-weight: 500;
}

/* Logout button special styling */
.menu-link.text-danger:hover {
  background-color: rgba(220, 53, 69, 0.1);
  color: var(--bs-danger) !important;
}

.menu-link.text-danger:hover .menu-icon i {
  color: var(--bs-danger) !important;
}

/* Badge styling */
.badge-light-success {
  background-color: rgba(25, 135, 84, 0.1);
  color: var(--bs-success);
  font-size: 0.7rem !important;
  padding: 3px 6px;
}

/* User info section */
.symbol-label {
  background: linear-gradient(135deg, var(--bs-primary), var(--bs-info)) !important;
}

/* Dark mode adjustments */
[data-bs-theme="dark"] .menu-link:hover {
  background-color: var(--bs-gray-800);
}

[data-bs-theme="dark"] .menu-link.text-danger:hover {
  background-color: rgba(220, 53, 69, 0.2);
}

/* Menu visibility */
.menu {
  display: none;
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e4e6ea;
  border-radius: 8px;
  box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.1);
}

.menu.show {
  display: block !important;
}

[data-bs-theme="dark"] .menu {
  background: var(--bs-dark);
  border-color: var(--bs-gray-700);
}
</style>
