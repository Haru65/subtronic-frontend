<template>
  <div class="card">
    <!-- Tab Navigation -->
    <ul class="nav nav-tabs nav-line-tabs mb-5 ms-0 border-0" role="tablist">
      <li class="nav-item" role="presentation">
        <button
          :class="['nav-link', { active: activeTab === 'notifications' }]"
          @click="activeTab = 'notifications'"
          role="tab"
        >
          <span class="d-flex align-items-center">
            <KTIcon icon-name="notification" icon-class="me-3" />
            Notifications
          </span>
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button
          :class="['nav-link', { active: activeTab === 'alarms' }]"
          @click="activeTab = 'alarms'"
          role="tab"
        >
          <span class="d-flex align-items-center">
            <KTIcon icon-name="alarm-bell" icon-class="me-3" />
            Recent Alarms ({{ alarmTriggersCount }})
          </span>
        </button>
      </li>
    </ul>

    <!-- Notifications Tab -->
    <div v-if="activeTab === 'notifications'" class="card-header border-0 pt-6">
      <!--begin::Card title-->
      <div class="card-title">
        <!--begin::Search-->
        <div class="d-flex align-items-center position-relative my-1">
          <KTIcon
            icon-name="magnifier"
            icon-class="fs-1 position-absolute ms-6"
          />
          <input
            type="text"
            v-model="search"
            @input="searchItems()"
            class="form-control form-control-solid w-250px ps-15"
            placeholder="Search Notification"
          />
        </div>
        <!--end::Search-->
      </div>
      <!--begin::Card title-->
      <!--begin::Card toolbar-->
      <div class="card-toolbar">
        <!--begin::Toolbar-->
        <div
          v-if="selectedIds.length === 0"
          class="d-flex justify-content-end"
          data-kt-customer-table-toolbar="base"
        >
          <!--end::Menu 1-->
        </div>
        <!--end::Toolbar-->
        <!--begin::Group actions-->
        <div
          v-else
          class="d-flex justify-content-end align-items-center"
          data-kt-customer-table-toolbar="selected"
        >
          <div class="fw-bold me-5">
            <span class="me-2">{{ selectedIds.length }}</span
            >Selected
          </div>
          <button type="button" class="btn btn-danger" @click="deleteFewItem()">
            Delete Selected
          </button>
        </div>
        <!--end::Group actions-->

        <div>
          <button
            type="button"
            id="kt-menu-filter-button"
            class="btn btn-sm btn-icon btn-color-primary btn-active-light-primary ms-3"
            data-kt-menu-target="#kt_menu_filter"
            data-kt-menu-trigger="{default:'click', lg: 'hover'}"
            data-kt-menu-attach="parent"
            data-kt-menu-placement="bottom-end"
            data-kt-menu-flip="top-end"
          >
            <KTIcon icon-name="filter" icon-class="fs-1" />
          </button>

          <!--begin::Menu 1-->
          <div
            id="kt_menu_filter"
            class="menu menu-sub menu-sub-dropdown w-250px w-md-300px"
            data-kt-menu="true"
            data-kt-menu-attach="#kt-menu-filter-button"
          >
            <!--begin::Header-->
            <div class="px-7 py-5">
              <div class="fs-5 text-dark fw-bold">Filter Options</div>
            </div>
            <!--end::Header-->

            <!--begin::Menu separator-->
            <div class="separator border-gray-200"></div>
            <!--end::Menu separator-->

            <!--begin::Form-->
            <div class="px-7 py-5">
              <!--begin::Input group-->
              <div class="mb-10">
                <!--begin::Label-->
                <label class="form-label fw-semobold"
                  >Notification Types:</label
                >
                <!--end::Label-->

                <!--begin::Options-->
                <div class="d-flex flex-wrap">
                  <!--begin::Options-->
                  <label
                    class="form-check form-check-sm form-check-custom form-check-solid me-5"
                    v-for="(types, index) in NotificationTypes"
                    :key="index"
                  >
                    <input
                      class="form-check-input"
                      type="checkbox"
                      :value="types.type"
                      v-model="selectedTypes"
                    />
                    <span class="form-check-label user-select-none">{{
                      types.labelValue
                    }}</span>
                  </label>
                  <!--end::Options-->
                </div>
                <!--end::Options-->
              </div>
              <!--end::Input group-->

              <!--begin::Actions-->
              <div class="d-flex justify-content-end">
                <button
                  type="button"
                  class="btn btn-sm btn-primary"
                  @click="applyFilters"
                  data-kt-menu-dismiss="true"
                >
                  Apply
                </button>
              </div>
              <!--end::Actions-->
            </div>
            <!--end::Form-->
          </div>
          <!--end::Menu 1-->
        </div>
      </div>
      <!--end::Card toolbar-->
    </div>

    <div v-if="activeTab === 'notifications'" class="card-body pt-0">
      <Datatable
        checkbox-label="id"
        @on-sort="sort"
        @on-items-select="onItemSelect"
        :data="tableData"
        :header="tableHeader"
        :checkbox-enabled="true"
        :items-per-page="limit"
        :items-per-page-dropdown-enabled="false"
        :loading="loading"
      >
        <template v-slot:id="{ row: notifications }">
          {{ notifications.id }}
        </template>
        <template v-slot:type="{ row: notifications }">
          {{ notifications.type }}
        </template>
        <template v-slot:data="{ row: notifications }">
          {{ notifications.data ? notifications.data.message : "" }}
        </template>
        <template v-slot:route_="">
          <router-link to="/temp_leads/list"> navigate </router-link>
        </template>
        <template v-slot:status="{ row: notifications }">
          <span
            v-if="notifications.read_at == null"
            class="badge py-3 px-4 fs-7 badge-light-primary"
            >UnRead</span
          >
          <span v-else class="badge py-3 px-4 fs-7 badge-light-success"
            >Readed</span
          >
        </template>
        <template v-slot:created_at="{ row: notifications }">
          {{ notifications.created_at }}
        </template>
        <template v-slot:actions="{ row: notifications }">
          <!--begin::Menu Flex-->
          <div class="d-flex flex-lg-row my-3">
            <!--begin::Delete-->
            <span
              @click="deleteItem(notifications.id, false)"
              class="btn btn-icon btn-active-light-danger w-30px h-30px me-3"
              data-bs-toggle="tooltip"
              title="Delete notifications"
            >
              <KTIcon icon-name="trash" icon-class="fs-2" />
            </span>
            <!--end::Delete-->
          </div>
          <!--end::Menu FLex-->
        </template>
      </Datatable>
      <div class="d-flex justify-content-between p-2">
        <div>
          <el-select
            class="w-100px rounded-2"
            v-model="limit"
            filterable
            @change="PageLimitPoiner(limit)"
          >
            <el-option
              v-for="item in Limits"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </div>
        <ul class="pagination">
          <li class="paginate_button page-item" style="cursor: auto">
            <span @click="PrevPage" class="paginate_button page-link"
              ><i class="ki-duotone ki-left fs-2"><!--v-if--></i></span
            >
          </li>
          <li class="paginate_button disabled">
            <span class="paginate_button page-link"> Page - {{ page }} </span>
          </li>
          <li class="paginate_button page-item" style="cursor: pointer">
            <span @click="NextPage" class="paginate_button page-link"
              ><i class="ki-duotone ki-right fs-2"><!--v-if--></i></span
            >
          </li>
        </ul>
      </div>
    </div>

    <!-- Alarms Tab -->
    <div v-if="activeTab === 'alarms'" class="card-body pt-6">
      <div class="mb-4">
        <button @click="loadRecentAlarms" class="btn btn-primary btn-sm">
          <KTIcon icon-name="reload" icon-class="me-2" />
          Refresh
        </button>
      </div>

      <div v-if="loadingAlarms" class="d-flex justify-content-center p-5">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <div v-else-if="alarmTriggers.length === 0" class="alert alert-info">
        <KTIcon icon-name="check-circle" icon-class="me-2" />
        No recent alarms found
      </div>

      <div v-else class="table-responsive">
        <table class="table table-hover table-striped">
          <thead class="table-light">
            <tr>
              <th>Time</th>
              <th>Alarm Name</th>
              <th>Device</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="trigger in alarmTriggers" :key="trigger._id">
              <td>
                <small class="text-muted">
                  {{ formatDate(trigger.triggered_at) }}
                </small>
              </td>
              <td>
                <strong>{{ trigger.alarm_name }}</strong>
              </td>
              <td>
                <span class="badge badge-light-info">{{
                  trigger.device_name
                }}</span>
              </td>
              <td>
                <small>{{ trigger.trigger_reason }}</small>
              </td>
              <td>
                <span
                  :class="[
                    'badge',
                    trigger.notification_status === 'SENT'
                      ? 'badge-light-success'
                      : 'badge-light-warning',
                  ]"
                >
                  {{ trigger.notification_status }}
                </span>
              </td>
              <td>
                <button
                  @click="openAlarmDetail(trigger)"
                  class="btn btn-icon btn-active-light-primary w-30px h-30px"
                  data-bs-toggle="tooltip"
                  title="View Details"
                >
                  <KTIcon icon-name="eye" icon-class="fs-2" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Alarm Detail Modal -->
  <div
    v-if="selectedAlarm"
    class="modal fade show d-block"
    style="background-color: rgba(0, 0, 0, 0.5)"
    tabindex="-1"
  >
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Alarm Trigger Details</h5>
          <button
            type="button"
            class="btn-close"
            @click="selectedAlarm = null"
          ></button>
        </div>
        <div class="modal-body">
          <!-- Alarm Information -->
          <div class="mb-4">
            <h6 class="fw-bold">Alarm Information</h6>
            <div class="row g-4">
              <div class="col-6">
                <p class="text-muted mb-1">Alarm Name</p>
                <p class="fw-bold">{{ selectedAlarm.alarm_name }}</p>
              </div>
              <div class="col-6">
                <p class="text-muted mb-1">Severity</p>
                <span
                  :class="[
                    'badge',
                    selectedAlarm.alarm_config?.severity === 'critical'
                      ? 'badge-light-danger'
                      : selectedAlarm.alarm_config?.severity === 'warning'
                      ? 'badge-light-warning'
                      : 'badge-light-info',
                  ]"
                >
                  {{ selectedAlarm.alarm_config?.severity || 'N/A' }}
                </span>
              </div>
              <div class="col-6">
                <p class="text-muted mb-1">Device</p>
                <p class="fw-bold">{{ selectedAlarm.device_name }}</p>
              </div>
              <div class="col-6">
                <p class="text-muted mb-1">Triggered At</p>
                <p class="fw-bold">{{ formatDate(selectedAlarm.triggered_at) }}</p>
              </div>
            </div>
          </div>

          <hr />

          <!-- Trigger Reason -->
          <div class="mb-4">
            <h6 class="fw-bold">Trigger Reason</h6>
            <p class="bg-light p-3 rounded">{{ selectedAlarm.trigger_reason }}</p>
          </div>

          <!-- Sensor Values at Trigger -->
          <div class="mb-4">
            <h6 class="fw-bold">Sensor Values at Trigger</h6>
            <div class="row g-3">
              <div class="col-md-6">
                <div class="bg-light p-3 rounded">
                  <small class="text-muted d-block">REF1 Status</small>
                  <strong>{{
                    selectedAlarm.triggered_values?.['REF1 STS'] || '-'
                  }}</strong>
                </div>
              </div>
              <div class="col-md-6">
                <div class="bg-light p-3 rounded">
                  <small class="text-muted d-block">REF2 Status</small>
                  <strong>{{
                    selectedAlarm.triggered_values?.['REF2 STS'] || '-'
                  }}</strong>
                </div>
              </div>
              <div class="col-md-6">
                <div class="bg-light p-3 rounded">
                  <small class="text-muted d-block">REF3 Status</small>
                  <strong>{{
                    selectedAlarm.triggered_values?.['REF3 STS'] || '-'
                  }}</strong>
                </div>
              </div>
              <div class="col-md-6">
                <div class="bg-light p-3 rounded">
                  <small class="text-muted d-block">DCV</small>
                  <strong>{{ selectedAlarm.triggered_values?.DCV || '-' }}</strong>
                </div>
              </div>
              <div class="col-md-6">
                <div class="bg-light p-3 rounded">
                  <small class="text-muted d-block">DCI</small>
                  <strong>{{ selectedAlarm.triggered_values?.DCI || '-' }}</strong>
                </div>
              </div>
              <div class="col-md-6">
                <div class="bg-light p-3 rounded">
                  <small class="text-muted d-block">ACV</small>
                  <strong>{{ selectedAlarm.triggered_values?.ACV || '-' }}</strong>
                </div>
              </div>
              <div class="col-md-6">
                <div class="bg-light p-3 rounded">
                  <small class="text-muted d-block">EVENT Status</small>
                  <strong>{{
                    selectedAlarm.triggered_values?.EVENT || '-'
                  }}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Alarm Thresholds -->
          <div class="mb-4">
            <h6 class="fw-bold">Alarm Thresholds</h6>
            <div class="table-responsive">
              <table class="table table-sm">
                <tbody>
                  <tr v-for="(value, key) in selectedAlarm.alarm_config?.device_params" :key="key">
                    <td class="text-muted">{{ formatThresholdName(key) }}</td>
                    <td class="fw-bold">{{ value }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            @click="selectedAlarm = null"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
  
  <script lang="ts">
import { getAssetPath } from "@/core/helpers/assets";
import { defineComponent, onMounted, ref, computed } from "vue";
import Datatable from "@/components/kt-datatable/KTDataTable.vue";
import type { Sort } from "@/components/kt-datatable//table-partials/models";
import type { INotification } from "@/core/model/notifications";
import { NotificationTypes } from "@/core/model/notifications";
import arraySort from "array-sort";
import {
  deleteNotification,
  getNotifications,
  NotificationSearch,
} from "@/stores/api";
import { get_role } from "@/core/config/PermissionsRolesConfig";
import moment from "moment";
import Swal from "sweetalert2";
import { Identifier } from "@/core/config/WhichUserConfig";

export default defineComponent({
  name: "notifications-list",
  components: {
    Datatable,
  },
  setup() {
    // Tab management
    const activeTab = ref<'notifications' | 'alarms'>('notifications');

    // Alarm data
    const alarmTriggers = ref<any[]>([]);
    const loadingAlarms = ref(false);
    const selectedAlarm = ref<any>(null);
    const alarmTriggersCount = ref(0);

    const tableHeader = ref([
      {
        columnName: "Type",
        columnLabel: "type",
        sortEnabled: true,
        columnWidth: 155,
      },
      {
        columnName: "Message",
        columnLabel: "data",
        sortEnabled: true,
        columnWidth: 155,
      },
      {
        columnName: "Route",
        columnLabel: "route_",
        sortEnabled: true,
        columnWidth: 155,
      },
      {
        columnName: "Status",
        columnLabel: "status",
        sortEnabled: true,
        columnWidth: 175,
      },
      {
        columnName: "Notification Date",
        columnLabel: "created_at",
        sortEnabled: true,
        columnWidth: 175,
      },
      {
        columnName: "Actions",
        columnLabel: "actions",
        sortEnabled: false,
        columnWidth: 75,
      },
    ]);
    const selectedIds = ref<Array<number>>([]);
    const loading = ref(true);
    const identifier = Identifier;
    const tableData = ref<Array<INotification>>([]);
    const initvalues = ref<Array<INotification>>([]);

    // functions
    const Limits = ref({
      1: 10,
      2: 25,
      3: 50,
    });

    // staring from 1
    const page = ref(1);
    const limit = ref(10);
    // limit 10
    const more = ref(false);

    // Filters Logic

    const selectedTypes = ref([]);

    const applyFilters = async () => {
      try {
        page.value = 1;
        await notification_listing();
      } catch (error) {
        console.error("Error fetching leads:", error);
        // Handle error
      }
    };

    const PagePointer = async (page) => {
      // ? Truncate the tableData
      //console.log(limit.value);
      loading.value = true;
      try {
        while (tableData.value.length != 0) tableData.value.pop();
        while (initvalues.value.length != 0) initvalues.value.pop();

        const typesString = selectedTypes.value.join(",");
        const response = await getNotifications(
          `page=${page}&limit=${limit.value}&types=${typesString}`
        );

        if (response.success) {
          more.value = response.result.next_page_url != null ? true : false;
          tableData.value = response.result.data.map(
            ({ id, created_at, ...rest }) => ({
              id,
              created_at: moment(created_at).format("DD-MM-YYYY"),
              ...rest,
            })
          );
          initvalues.value.splice(
            0,
            tableData.value.length,
            ...tableData.value
          );
        }
      } catch (error) {
        console.error(error);
      } finally {
        ////console.log("done");
        setTimeout(() => {
          loading.value = false;
        }, 250);
      }
    };

    const PageLimitPoiner = async (limit) => {
      // ? Truncate the tableData
      page.value = 1;
      //console.log(page.value, limit);
      loading.value = true;
      try {
        while (tableData.value.length != 0) tableData.value.pop();
        while (initvalues.value.length != 0) initvalues.value.pop();

        const typesString = selectedTypes.value.join(",");
        const response = await getNotifications(
          `page=${page.value}&limit=${limit}&types=${typesString}`
        );

        if (response.success) {
          more.value = response.result.next_page_url != null ? true : false;
          tableData.value = response.result.data.map(
            ({ id, created_at, ...rest }) => ({
              id,
              created_at: moment(created_at).format("DD-MM-YYYY"),
              ...rest,
            })
          );
          initvalues.value.splice(
            0,
            tableData.value.length,
            ...tableData.value
          );
        }
      } catch (error) {
        console.error(error);
      } finally {
        ////console.log("done");
        setTimeout(() => {
          loading.value = false;
        }, 250);
      }
    };

    //console.log(initvalues.value);

    const NextPage = () => {
      if (more.value != false) {
        page.value = page.value + 1;
        PagePointer(page.value);
      }
    };

    const PrevPage = () => {
      if (page.value > 1) {
        page.value = page.value - 1;
        PagePointer(page.value);
      }
    };

    async function notification_listing(): Promise<void> {
      try {
        const typesString = selectedTypes.value.join(",");

        const response = await getNotifications(
          `page=${page.value}&limit=${limit.value}&types=${typesString}`
        );
        // // console.log(response);

        if (response.success) {
          more.value = response.result.next_page_url != null ? true : false;
          tableData.value = response.result.data.map(
            ({ id, created_at, ...rest }) => ({
              id,
              created_at: moment(created_at).format("DD-MM-YYYY"),
              ...rest,
            })
          );
          initvalues.value.splice(
            0,
            tableData.value.length,
            ...tableData.value
          );
        }
      } catch (error) {
        console.error(error);
      } finally {
        //console.log("done");
        setTimeout(() => {
          loading.value = false;
        }, 100);
      }
    }

    // Load recent alarms
    const loadRecentAlarms = async () => {
      loadingAlarms.value = true;
      try {
        const response = await fetch(
          '/api/alarms/triggers/recent?hours=24&limit=50'
        );
        const result = await response.json();
        
        if (result.success) {
          alarmTriggers.value = result.data || [];
          alarmTriggersCount.value = result.total || 0;
        } else {
          console.error('Failed to load alarms:', result.message);
          alarmTriggers.value = [];
          alarmTriggersCount.value = 0;
        }
      } catch (error) {
        console.error('Error loading alarm triggers:', error);
        alarmTriggers.value = [];
        alarmTriggersCount.value = 0;
      } finally {
        loadingAlarms.value = false;
      }
    };

    const openAlarmDetail = (trigger: any) => {
      selectedAlarm.value = trigger;
    };

    const formatDate = (date: string | Date) => {
      return moment(date).format("DD-MM-YYYY HH:mm:ss");
    };

    const formatThresholdName = (key: string) => {
      const names: { [key: string]: string } = {
        'ref_1_upper': 'REF1 Upper',
        'ref_1_lower': 'REF1 Lower',
        'ref_2_upper': 'REF2 Upper',
        'ref_2_lower': 'REF2 Lower',
        'ref_3_upper': 'REF3 Upper',
        'ref_3_lower': 'REF3 Lower',
        'dcv_upper': 'DCV Upper',
        'dcv_lower': 'DCV Lower',
        'dci_upper': 'DCI Upper',
        'dci_lower': 'DCI Lower',
        'acv_upper': 'ACV Upper',
        'acv_lower': 'ACV Lower',
      };
      return names[key] || key;
    };

    onMounted(async () => {
      await notification_listing();
      await loadRecentAlarms();
    });

    const deleteFewItem = async () => {
      try {
        const result = await Swal.fire({
          title: "Are you sure?",
          text: "You will not be able to recover from this!",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "red",
          confirmButtonText: "Yes, I am sure!",
          cancelButtonText: "No, cancel it!",
        });

        if (result.isConfirmed) {
          let allSuccess = true;
          let finalMessage = "Selected items deleted successfully.";

          for (const id of selectedIds.value) {
            const response = await deleteItem(id, true);
            if (!response.success) {
              allSuccess = false;
              finalMessage =
                response.message ||
                "An error occurred while deleting some items.";
              break;
            }
          }

          selectedIds.value.length = 0;

          if (allSuccess) {
            showSuccessAlert("Success", finalMessage);
          } else {
            showErrorAlert("Error", finalMessage);
          }
        }
      } catch (error: any) {
        const errorMessage = error.message || "An unknown error occurred";
        showErrorAlert("Error", errorMessage);
      }
    };

    const deleteItem = async (id: number, mul: boolean) => {
      const deleteConfirmation = async () => {
        try {
          const result = await Swal.fire({
            title: "Are you sure?",
            text: "You will not be able to recover from this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "red",
            confirmButtonText: "Yes, I am sure!",
          });
          return result.isConfirmed;
        } catch (error: any) {
          const errorMessage = error.message || "An unknown error occurred";
          showErrorAlert("Error", errorMessage);
          return false;
        }
      };

      const deleteFromTable = async (id: number) => {
        try {
          const response = await deleteNotification(id);
          if (response?.success) {
            const index = tableData.value.findIndex((item) => item.id === id);
            if (index !== -1) {
              tableData.value.splice(index, 1);
              // console.log(`Item with id ${id} deleted successfully`);
            }
            showSuccessAlert(
              "Success",
              response.message || `Item with id ${id} deleted successfully.`
            );
            return { success: true };
          } else {
            throw new Error(
              response?.message || `Failed to delete the item with id ${id}`
            );
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.message ||
            error.message ||
            "An unknown error occurred";
          showErrorAlert("Error", errorMessage);
          return { success: false, message: errorMessage };
        }
      };

      if (!mul) {
        const isConfirmed = await deleteConfirmation();
        if (isConfirmed) {
          return await deleteFromTable(id);
        } else {
          return { success: false };
        }
      } else {
        return await deleteFromTable(id);
      }
    };

    // Alert functions
    const showSuccessAlert = (title: string, message: string) => {
      Swal.fire({
        title,
        text: message,
        icon: "success",
        buttonsStyling: false,
        confirmButtonText: "Ok, got it!",
        heightAuto: false,
        customClass: {
          confirmButton: "btn btn-primary",
        },
      });
    };

    const showErrorAlert = (title: string, message: string) => {
      Swal.fire({
        title,
        text: message,
        icon: "error",
        buttonsStyling: false,
        confirmButtonText: "Ok, got it!",
        heightAuto: false,
        customClass: {
          confirmButton: "btn btn-primary",
        },
      });
    };

    const search = ref<string>("");
    let debounceTimer;
    const searchItems = () => {
      tableData.value.splice(0, tableData.value.length, ...initvalues.value);
      if (search.value !== "") {
        let results: Array<INotification> = [];
        for (let j = 0; j < tableData.value.length; j++) {
          if (searchingFunc(tableData.value[j], search.value)) {
            results.push(tableData.value[j]);
          }
        }
        tableData.value.splice(0, tableData.value.length, ...results);
        if (tableData.value.length == 0 && search.value.length != 0) {
          loading.value = true;
          clearTimeout(debounceTimer); // Clear any existing debounce timer
          debounceTimer = setTimeout(async () => {
            await SearchMore();
          }, 1000);
        }
      }
    };

    async function SearchMore() {
      // Your API call logic here
      try {
        const typesString = selectedTypes.value.join(",");
        const response = await NotificationSearch(search.value, typesString);

        if (response.success) {
          more.value = response.result.next_page_url != null ? true : false;
          tableData.value = response.result.data.map(
            ({ id, created_at, ...rest }) => ({
              id,
              created_at: moment(created_at).format("DD-MM-YYYY"),
              ...rest,
            })
          );
          initvalues.value.splice(
            0,
            tableData.value.length,
            ...tableData.value
          );
        }
      } catch (error) {
        console.error(error);
      } finally {
        //console.log("done");
        setTimeout(() => {
          loading.value = false;
        }, 250);
      }
    }

    const searchingFunc = (obj: any, value: string): boolean => {
      //console.log(initvalues.value);
      for (let key in obj) {
        if (!Number.isInteger(obj[key]) && !(typeof obj[key] === "object")) {
          if (obj[key].indexOf(value) != -1) {
            return true;
          }
        }
      }
      return false;
    };

    const sort = (sort: Sort) => {
      const reverse: boolean = sort.order === "asc";
      if (sort.label) {
        arraySort(tableData.value, sort.label, { reverse });
      }
    };
    const onItemSelect = (selectedItems: Array<number>) => {
      selectedIds.value = selectedItems;
    };

    return {
      activeTab,
      alarmTriggers,
      loadingAlarms,
      selectedAlarm,
      alarmTriggersCount,
      loadRecentAlarms,
      openAlarmDetail,
      formatDate,
      formatThresholdName,
      tableData,
      tableHeader,
      deleteItem,
      search,
      searchItems,
      selectedIds,
      deleteFewItem,
      sort,
      onItemSelect,
      getAssetPath,
      loading,
      NextPage,
      PrevPage,
      page,
      limit,
      PageLimitPoiner,
      Limits,
      identifier,

      selectedTypes,
      NotificationTypes,
      applyFilters,
    };
  },
});
</script>
  