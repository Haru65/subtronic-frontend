<template>
  <!--begin::Navbar-->
  <div class="app-navbar flex-shrink-0">
    <!--begin::Notifications-->
    <div class="app-navbar-item ms-1 ms-md-3">
      <!--begin::Menu- wrapper-->
      <div
        class="btn btn-icon btn-custom btn-icon-muted btn-active-light btn-active-color-primary w-30px h-30px w-md-40px h-md-40px position-relative"
        data-kt-menu-trigger="{default:'click', lg: 'hover'}"
        data-kt-menu-attach="parent"
        data-kt-menu-placement="bottom-end"
      >
        <KTIcon icon-name="message-text-2" icon-class="fs-2 fs-md-1" />
        <span v-if="TotalNotification > 0" class="position-absolute translate-middle top-0 start-50">
          <span class="badge rounded badge-success">
            {{ TotalNotification }}
          </span>
        </span>
      </div>

      <KTNotificationMenu
        :TotalNotification="TotalNotification"
        :dueCalibration="dueCalibration"
        :dueMaintenance="dueMaintenance"
        :calibrationNotificationCount="calibrationNotificationCount"
        :maintenanaceNotificationCount="maintenanaceNotificationCount"
      />
      <!--end::Menu wrapper-->
    </div>
    <!--end::Notifications-->

    <!--begin::Chat-->
    <div class="app-navbar-item ms-1 ms-md-3">
      <!--begin::Menu wrapper-->
      <div
        class="btn btn-icon btn-custom btn-icon-muted btn-active-light btn-active-color-primary w-30px h-30px w-md-40px h-md-40px position-relative"
        id="kt_drawer_chat_toggle"
      >
        <KTIcon icon-name="message-text-2" icon-class="fs-2 fs-md-1" />
        <span
            class="bullet bullet-dot bg-success h-6px w-6px position-absolute translate-middle top-0 start-50"
        ></span>
      </div>
      <!--end::Menu wrapper-->
    </div>
    <!--end::Chat-->

    <!--begin::Quick links-->
    <div class="app-navbar-item ms-1 ms-md-3">
      <!--begin::Menu wrapper-->
      <div
        class="btn btn-icon btn-custom btn-icon-muted btn-active-light btn-active-color-primary w-30px h-30px w-md-40px h-md-40px"
        data-kt-menu-trigger="{default:'click', lg: 'hover'}"
        data-kt-menu-attach="parent"
        data-kt-menu-placement="bottom-end"
      >
        <KTIcon icon-name="element-11" icon-class="fs-2 fs-md-1" />
      </div>
      <KTQuickLinksMenu />
      <!--end::Menu wrapper-->
    </div>
    <!--end::Quick links-->
    <!--begin::Theme mode-->
    <div class="app-navbar-item ms-1 ms-md-3">
      <!--begin::Menu toggle-->
      <a
        href="#"
        class="btn btn-icon btn-custom btn-icon-muted btn-active-light btn-active-color-primary w-30px h-30px w-md-40px h-md-40px"
        data-kt-menu-trigger="{default:'click', lg: 'hover'}"
        data-kt-menu-attach="parent"
        data-kt-menu-placement="bottom-end"
      >
        <KTIcon
          v-if="themeMode === 'light'"
          icon-name="night-day"
          icon-class="theme-light-show fs-2 fs-md-1"
        />
        <KTIcon
          v-else
          icon-name="moon"
          icon-class="theme-dark-show fs-2 fs-md-1"
        />
      </a>
      <!--begin::Menu toggle-->
      <KTThemeModeSwitcher />
    </div>
    <!--end::Theme mode-->
    <!--begin::User menu-->
    <div class="app-navbar-item ms-1 ms-md-3 position-relative" id="kt_header_user_menu_toggle">
      <!--begin::Menu wrapper-->
      <div
        class="cursor-pointer symbol symbol-35px symbol-md-45px user-avatar-hover"
        data-kt-menu-trigger="{default:'click', lg: 'hover'}"
        data-kt-menu-attach="parent"
        data-kt-menu-placement="bottom-end"
        data-bs-toggle="tooltip"
        :title="`${User?.first_name} ${User?.last_name}`"
        @click="toggleUserMenu"
      >
        <img
          v-if="User?.meta?.profile_pic"
          :src="`https://api.zeptac.com/storage/company/${User.company_details.company_id}/profile_images/${User.meta.profile_pic}`"
          class="rounded-circle user-avatar-img"
          alt="user"
        />
        <div v-else class="symbol-circle user-avatar-fallback">
          <span
            :class="`bg-primary text-white text-uppercase`"
            class="symbol-label fs-4 fw-bold"
            >{{ User?.first_name?.charAt(0) || "" }}</span
          >
        </div>
        <!-- Online status indicator -->
        <div class="position-absolute translate-middle bg-success border-2 border-white rounded-circle online-indicator">
        </div>
      </div>
      
      <!-- KT Menu System (Primary) -->
      <KTUserMenu v-if="useKTMenu" />
      
      <!-- Vue Fallback Dropdown (Secondary) -->
      <div v-if="!useKTMenu && showUserDropdown" class="vue-user-dropdown">
        <div class="dropdown-content">
          <div class="user-info-section">
            <div class="d-flex align-items-center mb-3">
              <div class="symbol symbol-50px me-3">
                <img
                  v-if="User?.meta?.profile_pic"
                  :src="`https://api.zeptac.com/storage/company/${User.company_details?.company_id}/profile_images/${User.meta.profile_pic}`"
                  class="rounded-circle"
                  alt="user"
                />
                <div v-else class="symbol-circle bg-primary">
                  <span class="symbol-label fs-3 fw-bold text-white text-uppercase">
                    {{ User?.first_name?.charAt(0) || "" }}
                  </span>
                </div>
              </div>
              <div>
                <div class="fw-bold fs-6">{{ User?.first_name }} {{ User?.last_name }}</div>
                <div class="text-muted fs-7">{{ User?.email || 'No email' }}</div>
                <span class="badge badge-light-success fs-8">{{ Identifier }}</span>
              </div>
            </div>
          </div>
          
          <div class="separator mb-3"></div>
          
          <router-link to="/profile/changepassword" class="dropdown-item" @click="showUserDropdown = false">
            <i class="bi bi-person me-3"></i> My Profile
          </router-link>
          
          <router-link to="/apps/iot/dashboard" class="dropdown-item" @click="showUserDropdown = false">
            <i class="bi bi-speedometer2 me-3"></i> Dashboard
          </router-link>
          
          <router-link to="/apps/iot/devices" class="dropdown-item" @click="showUserDropdown = false">
            <i class="bi bi-cpu me-3"></i> Devices
          </router-link>
          
          <router-link 
            v-if="Identifier == 'Company-Admin'"
            :to="`/company/settings/${User.company_id}`" 
            class="dropdown-item" 
            @click="showUserDropdown = false"
          >
            <i class="bi bi-gear me-3"></i> Company Settings
          </router-link>
          
          <div class="separator my-2"></div>
          
          <a href="#" class="dropdown-item text-danger" @click="signOut">
            <i class="bi bi-box-arrow-right me-3"></i> Logout
          </a>
        </div>
      </div>
      <!--end::Menu wrapper-->
    </div>
    <!--end::User menu-->
    <!-- 
    <div
      class="app-navbar-item d-lg-none ms-2 me-n3"
      v-tooltip
      title="Show header menu"
    >
      <div
        class="btn btn-icon btn-active-color-primary w-30px h-30px w-md-35px h-md-35px"
        id="kt_app_header_menu_toggle"
      >
        <KTIcon icon-name="text-align-left" icon-class="fs-2 fs-md-1" />
      </div>
    </div>
     -->
  </div>
  <!--end::Navbar-->
</template>

<script lang="ts">
import { getAssetPath } from "@/core/helpers/assets";
import { computed, defineComponent, onMounted, ref, nextTick, onUnmounted } from "vue";

import KTNotificationMenu from "@/layouts/main-layout/menus/NotificationsMenu.vue";
import KTQuickLinksMenu from "@/layouts/main-layout/menus/QuickLinksMenu.vue";
import KTUserMenu from "@/layouts/main-layout/menus/UserAccountMenu.vue";

import KTThemeModeSwitcher from "@/layouts/main-layout/theme-mode/ThemeModeSwitcher.vue";
import { ThemeModeComponent } from "@/assets/ts/layout";
import { MenuComponent } from "@/assets/ts/components";
import { useThemeStore } from "@/stores/theme";
// import { useAuthStore } from "@/stores/auth"; // COMMENTED OUT FOR DEVELOPMENT
import { useRouter } from "vue-router";
import { calibrationNotification, maintenanceNotification } from "@/stores/api";
import moment from "moment";
import { blank64 } from "./blank";
import { Identifier } from "@/core/config/WhichUserConfig";

interface Instrument {
  id: string;
  instrument_id: string;
  name: string;
  calibration_due_date: string;
}

interface MaintenanceInstrument {
  id: string;
  instrument_id: string;
  name: string;
  m_date2: string;
}

export default defineComponent({
  name: "header-navbar",
  components: {
    KTNotificationMenu,
    KTQuickLinksMenu,
    KTUserMenu,
    KTThemeModeSwitcher,
  },
  setup() {
    // const auth = useAuthStore(); // COMMENTED OUT FOR DEVELOPMENT
    const store = useThemeStore();
    const router = useRouter();
    // const User = auth.GetUser(); // COMMENTED OUT FOR DEVELOPMENT
    
    // MOCK USER DATA FOR DEVELOPMENT
    const User = {
      first_name: "Demo",
      last_name: "User", 
      email: "demo@example.com",
      company_id: "1",
      role_id: "1",
      company_details: {
        company_id: 1
      },
      meta: {
        profile_pic: null
      }
    };

    const dueCalibration = ref<Instrument[]>();
    const dueMaintenance = ref<MaintenanceInstrument[]>();
    const showUserDropdown = ref(false);
    const useKTMenu = ref(true); // Flag to determine which menu system to use

    const themeMode = computed(() => {
      if (store.mode === "system") {
        return ThemeModeComponent.getSystemMode();
      }
      return store.mode;
    });

    const TotalNotification = ref(0);
    const calibrationNotificationCount = ref(0);
    const maintenanaceNotificationCount = ref(0);

    const fetchDueCalibration = async () => {
      try {
        const company_id = User.company_id;

        const response = await calibrationNotification(company_id);

        if (response.success) {
          if (response.result != null && response.result) {
            dueCalibration.value = response.result?.map(
              ({ id, instrument_id, name, calibration_due_date }) => ({
                id,
                instrument_id,
                name,
                calibration_due_date:
                  moment(calibration_due_date).format("D MMM"),
              })
            );
            calibrationNotificationCount.value = dueCalibration.value
              ? dueCalibration.value.length
              : 0;
          }
        } else {
          console.error(
            `Error Occured in calibrationNotification : ${
              response.message || "Error Occured in API"
            }`
          );
        }
      } catch (err) {
        console.error(`Error Occured in calibrationNotification : ${err}`);
      }
    };

    const fetchDueMaintenance = async () => {
      try {
        const company_id = User.company_id;

        const response = await maintenanceNotification(company_id);

        if (response.success) {
          if (response.result != null && response.result) {
            dueMaintenance.value = response.result?.map(
              ({ id, instrument_id, name, m_date2 }) => ({
                id,
                instrument_id,
                name,
                m_date2: moment(m_date2).format("D MMM"),
              })
            );

            maintenanaceNotificationCount.value = dueMaintenance.value
              ? dueMaintenance.value.length
              : 0;
          }
        } else {
          console.error(
            `Error Occured in maintenanceNotification : ${
              response.message || "Error Occured in API"
            }`
          );
        }
      } catch (err) {
        console.error(`Error Occured in maintenanceNotification : ${err}`);
      }
    };

    const signOut = () => {
      // auth.logout(); // COMMENTED OUT FOR DEVELOPMENT
      // router.push({ name: "login" }); // COMMENTED OUT FOR DEVELOPMENT
      console.log("Logout clicked - authentication disabled for development");
      showUserDropdown.value = false;
      
      // Also close KT menu if it's open
      const ktMenu = document.querySelector('[data-kt-menu="true"]');
      if (ktMenu && ktMenu.classList.contains('show')) {
        ktMenu.classList.remove('show');
      }
    };

    onMounted(async () => {
      // NOTIFICATION FETCHING COMMENTED OUT FOR DEVELOPMENT
      // if (User.role_id !== 7) {
      //   await fetchDueCalibration();
      //   await fetchDueMaintenance();

      //   TotalNotification.value =
      //     calibrationNotificationCount.value +
      //     maintenanaceNotificationCount.value;
      // }

      // Reinitialize menu components to ensure dropdowns work
      await nextTick();
      setTimeout(() => {
        MenuComponent.reinitialization();
        
        // Check if KT menu system is working after a delay
        setTimeout(() => {
          const ktMenu = document.querySelector('#kt_header_user_menu_toggle [data-kt-menu="true"]');
          if (!ktMenu) {
            console.log('KT Menu system not found, switching to Vue fallback');
            useKTMenu.value = false;
          } else {
            console.log('KT Menu system initialized successfully');
          }
        }, 500);
      }, 200);
      
      // Add click outside handler for Vue dropdown
      document.addEventListener('click', handleClickOutside);
    });

    const handleClickOutside = (event: Event) => {
      const userMenuElement = document.getElementById('kt_header_user_menu_toggle');
      if (userMenuElement && !userMenuElement.contains(event.target as Node)) {
        showUserDropdown.value = false;
        
        // Also close KT menu if it's open
        const ktMenu = userMenuElement.querySelector('[data-kt-menu="true"]');
        if (ktMenu && ktMenu.classList.contains('show')) {
          ktMenu.classList.remove('show');
        }
      }
    };

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });

    const toggleUserMenu = () => {
      console.log('Toggle user menu clicked');
      
      // First try KT menu system
      const menuWrapper = document.querySelector('#kt_header_user_menu_toggle');
      const ktMenu = menuWrapper?.querySelector('[data-kt-menu="true"]');
      
      if (useKTMenu.value && ktMenu) {
        console.log('Using KT Menu System');
        const isVisible = ktMenu.classList.contains('show');
        if (isVisible) {
          ktMenu.classList.remove('show');
        } else {
          ktMenu.classList.add('show');
        }
        console.log('KT Menu toggled, now visible:', !isVisible);
        
        // Ensure Vue dropdown is hidden when using KT menu
        showUserDropdown.value = false;
      } else {
        console.log('Using Vue Fallback Dropdown');
        // Use Vue fallback if KT menu is not available
        useKTMenu.value = false;
        showUserDropdown.value = !showUserDropdown.value;
        console.log('Vue Dropdown visibility:', showUserDropdown.value);
        
        // Hide any KT menu that might be open
        if (ktMenu && ktMenu.classList.contains('show')) {
          ktMenu.classList.remove('show');
        }
      }
    };

    return {
      themeMode,
      getAssetPath,
      User,
      dueCalibration,
      dueMaintenance,
      maintenanaceNotificationCount,
      calibrationNotificationCount,
      TotalNotification,
      blank64,
      Identifier,
      toggleUserMenu,
      showUserDropdown,
      useKTMenu,
      signOut,
    };
  },
});
</script>

<style scoped>
/* User Avatar Hover Effects */
.user-avatar-hover {
  transition: all 0.3s ease;
  position: relative;
}

.user-avatar-hover:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.user-avatar-img {
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.user-avatar-hover:hover .user-avatar-img {
  border-color: var(--bs-primary);
}

.user-avatar-fallback {
  transition: all 0.3s ease;
}

.user-avatar-hover:hover .user-avatar-fallback {
  background: var(--bs-primary) !important;
  transform: scale(1.1);
}

/* Online Status Indicator */
.online-indicator {
  width: 12px;
  height: 12px;
  bottom: 0;
  right: 0;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(25, 135, 84, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(25, 135, 84, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(25, 135, 84, 0);
  }
}

/* Dark mode adjustments */
[data-bs-theme="dark"] .user-avatar-hover:hover {
  box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1);
}

/* Vue Fallback Dropdown */
.vue-user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 10000;
  animation: dropdownFadeIn 0.3s ease;
}

@keyframes dropdownFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-content {
  background: white;
  border: 1px solid #e4e6ea;
  border-radius: 8px;
  box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.15);
  padding: 1rem;
  min-width: 300px;
  max-width: 350px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  color: #5e6278;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.2s ease;
  margin: 2px 0;
}

.dropdown-item:hover {
  background-color: #f1f3f6;
  color: #1e2129;
  text-decoration: none;
  transform: translateX(5px);
}

.dropdown-item.text-danger:hover {
  background-color: rgba(220, 53, 69, 0.1);
  color: #dc3545 !important;
}

.user-info-section {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 8px;
  padding: 1rem;
  margin: -1rem -1rem 0 -1rem;
}

.separator {
  height: 1px;
  background-color: #e4e6ea;
  margin: 0.5rem 0;
}

/* Dark mode */
[data-bs-theme="dark"] .dropdown-content {
  background: var(--bs-dark);
  border-color: var(--bs-gray-700);
  color: var(--bs-gray-300);
}

[data-bs-theme="dark"] .dropdown-item {
  color: var(--bs-gray-300);
}

[data-bs-theme="dark"] .dropdown-item:hover {
  background-color: var(--bs-gray-800);
  color: var(--bs-white);
}

[data-bs-theme="dark"] .user-info-section {
  background: linear-gradient(135deg, var(--bs-gray-800), var(--bs-gray-700));
}

[data-bs-theme="dark"] .separator {
  background-color: var(--bs-gray-700);
}

/* Ensure only one dropdown shows at a time */
.app-navbar-item .menu[data-kt-menu="true"]:not(.show) {
  display: none !important;
}

.app-navbar-item .menu[data-kt-menu="true"].show {
  display: block !important;
}
</style>
