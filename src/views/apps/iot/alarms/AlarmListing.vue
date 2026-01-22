<template>
  <div>
    <!-- Tabs Navigation -->
    <div class="card card-shadow mb-4">
      <ul class="nav nav-tabs nav-line-tabs nav-line-tabs-2x border-transparent" role="tablist">
        <li class="nav-item" role="presentation">
          <a 
            class="nav-link" 
            :class="{ active: activeTab === 'active' }"
            href="#"
            @click.prevent="activeTab = 'active'"
            role="tab"
          >
            <span class="nav-text">Active Alarms</span>
            <span class="badge badge-light-info ms-2">{{ tableData.length }}</span>
          </a>
        </li>
        <li class="nav-item" role="presentation">
          <a 
            class="nav-link" 
            :class="{ active: activeTab === 'history' }"
            href="#"
            @click.prevent="activeTab = 'history'"
            role="tab"
          >
            <span class="nav-text">Alarm History</span>
            <span class="badge badge-light-secondary ms-2">📜</span>
          </a>
        </li>
      </ul>
    </div>

    <!-- Active Alarms Tab -->
    <div v-if="activeTab === 'active'" class="card">
      <div class="card-header border-0 pt-6">
        <!-- Card title -->
        <div class="card-title">
          <!-- Search -->
          <div class="d-flex align-items-center position-relative my-1">
            <KTIcon icon-name="magnifier" icon-class="fs-1 position-absolute ms-6" />
            <input
              type="text"
              v-model="search"
              @input="searchItems"
              class="form-control form-control-solid w-250px ps-15"
              placeholder="Search Alarms"
            />
          </div>
        </div>
        <!-- Card toolbar -->
        <div class="card-toolbar">
          <div class="d-flex gap-2">
            <button
              type="button"
              class="btn btn-danger"
              @click="clearAllAlarms"
              :disabled="tableData.length === 0"
            >
              <KTIcon icon-name="trash" icon-class="fs-2" />
              Clear All Alarms
            </button>
            <button
              type="button"
              class="btn btn-primary"
              data-bs-toggle="modal"
              data-bs-target="#add_alarm_modal"
            >
              <KTIcon icon-name="plus" icon-class="fs-2" />
              Add Alarm
            </button>
          </div>
        </div>
      </div>
      <div class="card-body pt-0">
        <!-- Add Alarm Modal -->
        <AlarmAddModal @add-alarm="addAlarm" />

        <!-- Datatable -->
        <Datatable
          checkbox-label="_id"
          @on-sort="sort"
          @on-items-select="onItemSelect"
          :data="tableData"
          :header="tableHeader"
          :checkbox-enabled="true"
          :items-per-page="limit"
          :items-per-page-dropdown-enabled="false"
          :loading="loading"
        >
          <template v-slot:device_name="{ row: alarm }">
            {{ alarm.device_name }}
          </template>
          <template v-slot:status="{ row: alarm }">
            <span
              :class="{
                'badge py-2 px-3 fs-7 badge-light-success': alarm.status === 'Active',
                'badge py-2 px-3 fs-7 badge-light-danger': alarm.status === 'Inactive',
              }"
            >
              {{ alarm.status }}
            </span>
          </template>
          <template v-slot:name="{ row: alarm }">
            <a href="#" class="text-gray-800 text-hover-primary fw-bolder" @click.prevent>
              {{ alarm.name }}
            </a>
          </template>
          <template v-slot:parameter="{ row: alarm }">
            <span class="text-muted">{{ alarm.parameter }}</span>
          </template>
          <template v-slot:actions="{ row: alarm }">
            <div class="dropdown">
              <a
                href="#"
                class="text-gray-700 hover:text-gray-700 cursor-pointer transition-colors"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                @click.prevent
              >
                <KTIcon icon-name="dots-circle-vertical" icon-class="fs-2x" />
              </a>
              <ul class="dropdown-menu dropdown-menu-end min-w-200px py-2 shadow-sm">
                <li>
                  <a
                    class="dropdown-item d-flex align-items-center gap-3 px-4 py-3 hover-bg-light-primary cursor-pointer"
                    @click.prevent="viewAlarmDetails(alarm)"
                  >
                    <KTIcon icon-name="eye" icon-class="fs-3 text-primary" />
                    <span class="text-primary">View Details</span>
                  </a>
                </li>
                <li><hr class="dropdown-divider"></li>
                <li>
                  <a
                    class="dropdown-item d-flex align-items-center gap-3 px-4 py-3 hover-bg-light-danger cursor-pointer"
                    @click.prevent="deleteItem(alarm)"

                  >
                    <KTIcon icon-name="trash" icon-class="fs-3 text-danger" />
                    <span class="text-danger">Delete</span>
                  </a>
                </li>
              </ul>
            </div>
          </template>
        </Datatable>
        <div class="d-flex justify-content-between p-2">
          <div>
            <el-select
              class="w-100px rounded-2"
              v-model="limit"
              filterable
              @change="updateLimit"
            >
              <el-option
                v-for="item in limits"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </div>
          <ul class="pagination">
            <li class="paginate_button page-item" style="cursor: auto">
              <span @click="prevPage" class="paginate_button page-link">
                <i class="ki-duotone ki-left fs-2"></i>
              </span>
            </li>
            <li class="paginate_button disabled">
              <span class="paginate_button page-link"> Page - {{ page }} </span>
            </li>
            <li class="paginate_button page-item" style="cursor: pointer">
              <span @click="nextPage" class="paginate_button page-link">
                <i class="ki-duotone ki-right fs-2"></i>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Alarm History Tab -->
    <div v-if="activeTab === 'history'">
      <AlarmHistoryLog />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import Datatable from "@/components/kt-datatable/KTDataTable.vue";
import AlarmAddModal from "./AlarmAddModal.vue";
import AlarmHistoryLog from "./AlarmHistoryLog.vue";
import Swal from "sweetalert2";
import arraySort from "array-sort";
import ApiService from "@/core/services/ApiService";

interface IAlarm {
  id: number;
  name: string;
  device_name: string;
  parameter: string;
  status: string;
  severity: 'critical' | 'warning' | 'info' | 'ok' | 'battery';
  device_params?: {
    ref_1: number;
    ref_2: number;
    ref_3: number;
    dcv: number;
    dci: number;
    acv: number;
  };
  pv_values?: {
    pv1?: number;
    pv2?: number;
    pv3?: number;
    pv4?: number;
    pv5?: number;
    pv6?: number;
  };
  notification_config?: {
    sms_numbers: string[];
    email_ids: string[];
  };
  unit_no?: string;
  location?: string;
  alarm_type?: string;
  link?: string;
  created_at: string;
  last_modified: string;
}

export default defineComponent({
  name: "alarm-listing",
  components: {
    Datatable,
    AlarmAddModal,
    AlarmHistoryLog,
  },
  setup() {
    const activeTab = ref<'active' | 'history'>('active');
    const tableHeader = ref([
      { columnName: "Device Name", columnLabel: "device_name", sortEnabled: true, columnWidth: 150 },
      { columnName: "Status", columnLabel: "status", sortEnabled: true, columnWidth: 100 },
      { columnName: "Latest Log", columnLabel: "name", sortEnabled: true, columnWidth: 150 },
      { columnName: "Alarm", columnLabel: "parameter", sortEnabled: true, columnWidth: 150 },
      { columnName: "Actions", columnLabel: "actions", sortEnabled: false, columnWidth: 100 },
    ]);

    const dummyData: IAlarm[] = [];

    const tableData = ref<IAlarm[]>([...dummyData]);
    const initValues = ref<IAlarm[]>([...dummyData]);
    const search = ref<string>("");
    const loading = ref(false);
    const page = ref(1);
    const limit = ref(10);
    const limits = ref([10, 25, 50]);
    const selectedIds = ref<number[]>([]);
    const more = ref(true);

    // Fetch all alarms from database
    const fetchAlarms = async () => {
      loading.value = true;
      try {
        console.log('📥 Fetching alarms from database...');
        const response = await ApiService.get('/api/alarms');
        
        if (response.data.success) {
          console.log('✅ Alarms fetched successfully:', response.data.data);
          console.log('✅ First alarm object:', response.data.data?.[0]);
          console.log('✅ First alarm _id:', response.data.data?.[0]?._id);
          initValues.value = response.data.data || [];
          tableData.value = [...initValues.value];
          updateTableData();
        } else {
          throw new Error(response.data.message || 'Failed to fetch alarms');
        }
      } catch (error) {
        console.error('❌ Error fetching alarms:', error);
        Swal.fire({
          title: "Error",
          text: "Failed to load alarms from database.",
          icon: "error",
          buttonsStyling: false,
          confirmButtonText: "Ok",
          customClass: { confirmButton: "btn btn-primary" },
        });
      } finally {
        loading.value = false;
      }
    };

    const addAlarm = (newAlarm: IAlarm) => {
      try {
        console.log('✅ Adding alarm to table:', newAlarm);
        tableData.value.push(newAlarm);
        initValues.value.push(newAlarm);
      } catch (error) {
        console.error('❌ Error adding alarm to table:', error);
      }
    };

    const deleteItem = async (alarm: any) => {
  console.log("🗑️ Incoming alarm object:", alarm);
  console.log("🗑️ Incoming alarm JSON:", JSON.stringify(alarm, null, 2));
  console.log("🗑️ Alarm keys:", Object.keys(alarm));
  console.log("🗑️ Alarm._id:", alarm?._id);
  console.log("🗑️ Alarm.id:", alarm?.id);
  console.log("🗑️ Alarm.alarmId:", alarm?.alarmId);
  
  // Try multiple ID field names
  let id = alarm?._id || alarm?.id || alarm?.alarmId || alarm?.alarm_id;
  
  // Convert to string and check
  id = String(id).trim();

  console.log("🗑️ Extracted ID:", id);
  console.log("🗑️ ID type:", typeof id);
  console.log("🗑️ ID length:", id.length);

  if (!id || id === "undefined" || id === "null" || id.length === 0) {
    Swal.fire({
      title: "Error",
      text: "Cannot delete alarm. ID is missing or invalid. Check console for details.",
      buttonsStyling: false,
      confirmButtonText: "Ok",
      customClass: { confirmButton: "btn btn-primary" },
    });
    return;
  }

  const result = await Swal.fire({
    title: "Are you sure?",
    text: "This alarm will be permanently deleted.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "Cancel",
  });

  if (!result.isConfirmed) return;

  try {
    const response = await ApiService.delete(`/api/alarms/${id}`);
    console.log("✅ Delete success:", response.data);

    if (response.data.success) {
      // Remove from local data arrays using _id for comparison
      tableData.value = tableData.value.filter(item => {
        const itemId = (item as any)._id;
        return itemId !== id;
      });
      
      initValues.value = initValues.value.filter(item => {
        const itemId = (item as any)._id;
        return itemId !== id;
      });

      Swal.fire({
        title: "Deleted!",
        text: "Alarm has been deleted successfully.",
        icon: "success",
        buttonsStyling: false,
        confirmButtonText: "Ok",
        customClass: { confirmButton: "btn btn-primary" },
      });

      // Update pagination if needed
      updateTableData();
    } else {
      throw new Error(response.data.message || 'Failed to delete alarm');
    }
  } catch (error: any) {
    console.error("❌ Delete error:", error);
    Swal.fire({
      title: "Error",
      text: error.response?.data?.message || "Failed to delete alarm.",
      icon: "error",
      buttonsStyling: false,
      confirmButtonText: "Ok",
      customClass: { confirmButton: "btn btn-primary" },
    });
  }
};


    const clearAllAlarms = async () => {
      if (tableData.value.length === 0) {
        Swal.fire({
          title: "No Alarms",
          text: "There are no alarms to clear.",
          icon: "info",
          buttonsStyling: false,
          confirmButtonText: "Ok, got it!",
          customClass: { confirmButton: "btn btn-primary" },
        });
        return;
      }

      const result = await Swal.fire({
        title: "Clear All Alarms?",
        text: `This will permanently delete all ${tableData.value.length} alarm(s) from the database. This action cannot be undone!`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "red",
        confirmButtonText: "Yes, clear all!",
        cancelButtonText: "No, cancel!",
      });

      if (result.isConfirmed) {
        try {
          const alarmsCount = tableData.value.length;
          
          // Call batch delete endpoint to clear all alarms at once
          console.log('🗑️ Clearing all alarms from database...');
          
          const response = await ApiService.delete(`/api/alarms`);
          
          if (response.data.success) {
            // Clear frontend data
            tableData.value = [];
            initValues.value = [];
            
            Swal.fire({
              title: "Cleared!",
              text: `${response.data.deletedCount} alarm(s) have been deleted from the database.`,
              icon: "success",
              buttonsStyling: false,
              confirmButtonText: "Ok, got it!",
              customClass: { confirmButton: "btn btn-primary" },
            });
            
            // Reset pagination
            page.value = 1;
            updateTableData();
          } else {
            throw new Error(response.data.message || 'Failed to clear alarms');
          }
        } catch (error) {
          console.error('❌ Error clearing alarms:', error);
          Swal.fire({
            title: "Error",
            text: "Failed to clear alarms from database.",
            icon: "error",
            buttonsStyling: false,
            confirmButtonText: "Ok",
            customClass: { confirmButton: "btn btn-primary" },
          });
        }
      }
    };

    const searchItems = () => {
      tableData.value = [...initValues.value];
      if (search.value) {
        tableData.value = tableData.value.filter((item) =>
          Object.values(item).some(
            (val) =>
              typeof val === "string" &&
              val.toLowerCase().includes(search.value.toLowerCase())
          )
        );
      }
    };

    const sort = (sort: { label: string; order: string }) => {
      const reverse = sort.order === "asc";
      if (sort.label) {
        arraySort(tableData.value, sort.label, { reverse });
      }
    };

    const onItemSelect = (selectedItems: number[]) => {
      console.log('🎯 AlarmListing: onItemSelect called with:', selectedItems);
      console.log('🎯 AlarmListing: Previous selectedIds:', selectedIds.value);
      selectedIds.value = selectedItems;
      console.log('🎯 AlarmListing: Updated selectedIds:', selectedIds.value);
    };

    const updateLimit = (newLimit: number) => {
      limit.value = newLimit;
      page.value = 1;
      updateTableData();
    };

    const prevPage = () => {
      if (page.value > 1) {
        page.value--;
        updateTableData();
      }
    };

    const nextPage = () => {
      if (more.value) {
        page.value++;
        updateTableData();
      }
    };

    const updateTableData = () => {
      loading.value = true;
      const start = (page.value - 1) * limit.value;
      const end = start + limit.value;
      tableData.value = initValues.value.slice(start, end);
      more.value = end < initValues.value.length;
      setTimeout(() => {
        loading.value = false;
      }, 250);
    };

    // New enhanced methods
    const viewAlarmDetails = async (alarm: IAlarm) => {
      // Fetch alarm history for this specific alarm
      let alarmHistory = [];
      try {
        // Use _id for MongoDB or id for regular number IDs
        const alarmId = (alarm as any)._id || alarm.id;
        if (!alarmId) {
          console.warn('No alarm ID found');
          return;
        }
        // Try new endpoint first (AlarmTrigger), then fallback to old endpoint
        try {
          const response = await ApiService.get(`/api/alarms/triggers/${alarmId}`);
          if (response.data.success) {
            // Convert trigger format to history format for display
            alarmHistory = (response.data.data || []).map((trigger: any) => ({
              timestamp: trigger.triggered_at,
              status: 'Triggered',
              reason: trigger.trigger_reason,
              device_values: trigger.triggered_values
            }));
          }
        } catch (triggerError) {
          // Fallback to old history endpoint if new endpoint fails
          console.log('Trying fallback history endpoint...');
          const response = await ApiService.get(`/api/alarms/${alarmId}/history`);
          if (response.data.success) {
            alarmHistory = response.data.data || [];
          }
        }
      } catch (error) {
        console.warn('Could not fetch alarm history:', error);
      }

      // Show alarm details in a modal dialog
      const detail = `
        <div class="text-start" style="background-color: #1a1a2e; padding: 20px; color: #fff;">
          <h5 class="mb-3" style="color: #fff;"><strong>Alarm Details</strong></h5>
          <div style="padding: 15px; border-left: 4px solid #007bff; margin-bottom: 20px; background-color: #16213e; border-radius: 5px;">
            <p style="color: #e0e0e0;"><strong style="color: #fff;">Alarm Name:</strong> ${alarm.name}</p>
            <p style="color: #e0e0e0;"><strong style="color: #fff;">Device:</strong> ${alarm.device_name}</p>
            <p style="color: #e0e0e0;"><strong style="color: #fff;">Parameter:</strong> ${alarm.parameter}</p>
            ${alarm.location && alarm.location !== 'N/A' ? `<p style="color: #e0e0e0;"><strong style="color: #fff;">Location:</strong> ${alarm.location}</p>` : ''}
            ${alarm.unit_no && alarm.unit_no !== 'N/A' ? `<p style="color: #e0e0e0;"><strong style="color: #fff;">Unit Number:</strong> ${alarm.unit_no}</p>` : ''}
            <p style="color: #e0e0e0;"><strong style="color: #fff;">Status:</strong> <span style="background-color: ${alarm.status === 'Active' ? '#28a745' : '#dc3545'}; color: #fff; padding: 5px 10px; border-radius: 3px; font-weight: bold;">${alarm.status}</span></p>
            <p style="color: #e0e0e0;"><strong style="color: #fff;">Severity:</strong> <span style="color: ${getSeverityColor(alarm.severity)}; font-weight: bold;">${alarm.severity.toUpperCase()}</span></p>
            ${alarm.alarm_type && alarm.alarm_type !== 'N/A' ? `<p style="color: #e0e0e0;"><strong style="color: #fff;">Type:</strong> ${alarm.alarm_type}</p>` : ''}
          </div>
          
          ${alarm.pv_values && Object.values(alarm.pv_values).some(v => v !== null && v !== undefined) ? `
            <h5 class="mb-3" style="color: #fff;"><strong>Process Variable Values</strong></h5>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
              ${alarm.pv_values.pv1 !== null && alarm.pv_values.pv1 !== undefined ? `<span style="background-color: #007bff; color: white; padding: 8px 12px; border-radius: 5px; font-size: 12px;">PV1: ${alarm.pv_values.pv1}</span>` : ''}
              ${alarm.pv_values.pv2 !== null && alarm.pv_values.pv2 !== undefined ? `<span style="background-color: #007bff; color: white; padding: 8px 12px; border-radius: 5px; font-size: 12px;">PV2: ${alarm.pv_values.pv2}</span>` : ''}
              ${alarm.pv_values.pv3 !== null && alarm.pv_values.pv3 !== undefined ? `<span style="background-color: #007bff; color: white; padding: 8px 12px; border-radius: 5px; font-size: 12px;">PV3: ${alarm.pv_values.pv3}</span>` : ''}
              ${alarm.pv_values.pv4 !== null && alarm.pv_values.pv4 !== undefined ? `<span style="background-color: #007bff; color: white; padding: 8px 12px; border-radius: 5px; font-size: 12px;">PV4: ${alarm.pv_values.pv4}</span>` : ''}
              ${alarm.pv_values.pv5 !== null && alarm.pv_values.pv5 !== undefined ? `<span style="background-color: #007bff; color: white; padding: 8px 12px; border-radius: 5px; font-size: 12px;">PV5: ${alarm.pv_values.pv5}</span>` : ''}
              ${alarm.pv_values.pv6 !== null && alarm.pv_values.pv6 !== undefined ? `<span style="background-color: #007bff; color: white; padding: 8px 12px; border-radius: 5px; font-size: 12px;">PV6: ${alarm.pv_values.pv6}</span>` : ''}
            </div>
          ` : ''}

          ${alarm.notification_config && (alarm.notification_config.sms_numbers.length > 0 || alarm.notification_config.email_ids.length > 0) ? `
            <h5 class="mb-3" style="color: #fff;"><strong>Notifications</strong></h5>
            <div style="padding: 15px; border-left: 4px solid #28a745; margin-bottom: 20px; background-color: #16213e; border-radius: 5px;">
              ${alarm.notification_config.sms_numbers.length > 0 ? `<p style="color: #e0e0e0;"><strong style="color: #fff;">SMS Numbers:</strong> ${alarm.notification_config.sms_numbers.join(', ')}</p>` : ''}
              ${alarm.notification_config.email_ids.length > 0 ? `<p style="color: #e0e0e0;"><strong style="color: #fff;">Email IDs:</strong> ${alarm.notification_config.email_ids.join(', ')}</p>` : ''}
            </div>
          ` : ''}

          <h5 class="mb-3" style="color: #fff;"><strong>Alarm Trigger History</strong></h5>
          <div style="padding: 15px; border-left: 4px solid #ffc107; margin-bottom: 20px; max-height: 300px; overflow-y: auto; background-color: #16213e; border-radius: 5px;">
            ${alarmHistory.length > 0 ? `
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                  <tr style="border-bottom: 2px solid #444;">
                    <th style="text-align: left; padding: 8px; color: #fff; font-weight: bold;">Timestamp</th>
                    <th style="text-align: left; padding: 8px; color: #fff; font-weight: bold;">Status</th>
                    <th style="text-align: left; padding: 8px; color: #fff; font-weight: bold;">Reason</th>
                    <th style="text-align: left; padding: 8px; color: #fff; font-weight: bold;">Values</th>
                  </tr>
                </thead>
                <tbody>
                  ${alarmHistory.map(entry => {
                    const deviceValues = entry.device_values || {};
                    const refStatus = [deviceValues['REF1 STS'], deviceValues['REF2 STS'], deviceValues['REF3 STS']]
                      .filter(v => v)
                      .join(', ');
                    const otherValues = [
                      deviceValues.DCV ? 'DCV: ' + deviceValues.DCV : null,
                      deviceValues.DCI ? 'DCI: ' + deviceValues.DCI : null,
                      deviceValues.ACV ? 'ACV: ' + deviceValues.ACV : null
                    ].filter(v => v).join(' | ');
                    const valuesStr = refStatus || otherValues || '-';
                    return `
                    <tr style="border-bottom: 1px solid #333;">
                      <td style="padding: 8px; color: #e0e0e0; white-space: nowrap;">${new Date(entry.timestamp).toLocaleString()}</td>
                      <td style="padding: 8px;"><span style="background-color: ${entry.status === 'Triggered' || entry.status === 'Active' ? '#ffc107' : '#28a745'}; color: #000; padding: 4px 8px; border-radius: 3px; font-weight: bold; font-size: 10px;">${entry.status}</span></td>
                      <td style="padding: 8px; color: #e0e0e0; font-size: 10px;">${entry.reason || entry.note || '-'}</td>
                      <td style="padding: 8px; color: #ccc; font-size: 9px;">${valuesStr}</td>
                    </tr>
                  `}).join('')}
                </tbody>
              </table>
            ` : '<p style="color: #999; font-style: italic;">No alarm triggers recorded yet. Alarms will appear here when triggered.</p>'}
          </div>
          </div>

          <h5 class="mb-3" style="color: #fff;"><strong>Timeline</strong></h5>
          <div style="padding: 15px; border-left: 4px solid #6c757d; background-color: #16213e; border-radius: 5px;">
            <p style="color: #e0e0e0;"><strong style="color: #fff;">Created:</strong> ${new Date(alarm.created_at).toLocaleString()}</p>
            <p style="color: #e0e0e0;"><strong style="color: #fff;">Last Modified:</strong> ${new Date(alarm.last_modified).toLocaleString()}</p>
          </div>
        </div>
      `;

      Swal.fire({
        title: "Alarm Details",
        html: detail,
        icon: "info",
        width: '700px',
        buttonsStyling: false,
        confirmButtonText: "Close",
        customClass: { confirmButton: "btn btn-primary" },
        didOpen: () => {
          // You can add action buttons here if needed
        }
      });
    };

    const sendSMSAlert = async (alarm: IAlarm) => {
      if (alarm.notification_config.sms_numbers.length === 0) {
        Swal.fire({
          title: "No SMS Numbers",
          text: "No SMS numbers configured for this alarm.",
          icon: "warning",
          buttonsStyling: false,
          confirmButtonText: "Ok",
          customClass: { confirmButton: "btn btn-primary" },
        });
        return;
      }

      const result = await Swal.fire({
        title: "Send SMS Alert",
        html: `
          <div class="text-start">
            <p><strong>Alarm:</strong> ${alarm.name}</p>
            <p><strong>Unit:</strong> ${alarm.unit_no}</p>
            <p><strong>Location:</strong> ${alarm.location}</p>
            <p><strong>Type:</strong> ${alarm.alarm_type}</p>
            <p><strong>SMS Numbers:</strong> ${alarm.notification_config.sms_numbers.join(', ')}</p>
            <p><strong>PV Values:</strong> PV1=${alarm.pv_values.pv1}, PV2=${alarm.pv_values.pv2}, PV3=${alarm.pv_values.pv3}</p>
          </div>
        `,
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Send SMS",
        cancelButtonText: "Cancel",
        customClass: { confirmButton: "btn btn-primary", cancelButton: "btn btn-secondary" },
      });

      if (result.isConfirmed) {
        // Here you would integrate with your SMS service
        Swal.fire({
          title: "SMS Sent!",
          text: `SMS alert sent to ${alarm.notification_config.sms_numbers.length} numbers.`,
          icon: "success",
          buttonsStyling: false,
          confirmButtonText: "Ok",
          customClass: { confirmButton: "btn btn-primary" },
        });
      }
    };

    const sendEmailAlert = async (alarm: IAlarm) => {
      if (alarm.notification_config.email_ids.length === 0) {
        Swal.fire({
          title: "No Email IDs",
          text: "No email addresses configured for this alarm.",
          icon: "warning",
          buttonsStyling: false,
          confirmButtonText: "Ok",
          customClass: { confirmButton: "btn btn-primary" },
        });
        return;
      }

      const result = await Swal.fire({
        title: "Send Email Alert",
        html: `
          <div class="text-start">
            <p><strong>Alarm:</strong> ${alarm.name}</p>
            <p><strong>Unit:</strong> ${alarm.unit_no}</p>
            <p><strong>Location:</strong> ${alarm.location}</p>
            <p><strong>Type:</strong> ${alarm.alarm_type}</p>
            <p><strong>Email IDs:</strong> ${alarm.notification_config.email_ids.join(', ')}</p>
            <p><strong>PV Values:</strong> PV1=${alarm.pv_values.pv1}, PV2=${alarm.pv_values.pv2}, PV3=${alarm.pv_values.pv3}</p>
            <p><strong>Link:</strong> <a href="${alarm.link}" target="_blank">View Device</a></p>
          </div>
        `,
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Send Email",
        cancelButtonText: "Cancel",
        customClass: { confirmButton: "btn btn-primary", cancelButton: "btn btn-secondary" },
      });

      if (result.isConfirmed) {
        // Here you would integrate with your email service
        Swal.fire({
          title: "Email Sent!",
          text: `Email alert sent to ${alarm.notification_config.email_ids.length} recipients.`,
          icon: "success",
          buttonsStyling: false,
          confirmButtonText: "Ok",
          customClass: { confirmButton: "btn btn-primary" },
        });
      }
    };

    const composeCustomEmail = (alarm: IAlarm) => {
      // Pre-fill email client with alarm details
      const emailSubject = `🚨 ALARM: ${alarm.name} - ${alarm.unit_no}`;
      const emailContent = `
        <h2>Alarm Notification</h2>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Alarm Name:</strong> ${alarm.name}</p>
          <p><strong>Unit Number:</strong> ${alarm.unit_no}</p>
          <p><strong>Location:</strong> ${alarm.location}</p>
          <p><strong>Device:</strong> ${alarm.device_name}</p>
          <p><strong>Parameter:</strong> ${alarm.parameter}</p>
          <p><strong>Alarm Type:</strong> ${alarm.alarm_type}</p>
          <p><strong>Severity:</strong> <span style="color: ${getSeverityColor(alarm.severity)}; font-weight: bold;">${alarm.severity.toUpperCase()}</span></p>
          <p><strong>Status:</strong> ${alarm.status}</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <h3>Process Variable Values:</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 15px 0;">
          <span style="background-color: #007bff; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px;">PV1: ${alarm.pv_values.pv1}</span>
          <span style="background-color: #007bff; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px;">PV2: ${alarm.pv_values.pv2}</span>
          <span style="background-color: #007bff; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px;">PV3: ${alarm.pv_values.pv3}</span>
          <span style="background-color: #007bff; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px;">PV4: ${alarm.pv_values.pv4}</span>
          <span style="background-color: #007bff; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px;">PV5: ${alarm.pv_values.pv5}</span>
          <span style="background-color: #007bff; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px;">PV6: ${alarm.pv_values.pv6}</span>
        </div>
        
        <p><strong>Device Link:</strong> <a href="${window.location.origin}${alarm.link}" target="_blank">View Device Details</a></p>
        
        <hr>
        <p><small>This alarm notification was generated automatically by the ZEPTAC IoT Platform.</small></p>
      `;

      // Open email client modal with pre-filled data
      const emailModal = document.getElementById('email_client_modal');
      if (emailModal) {
        const modal = new (window as any).bootstrap.Modal(emailModal);
        modal.show();
        
        // Dispatch custom event to pre-fill email form
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('fillEmailForm', {
            detail: {
              subject: emailSubject,
              content: emailContent,
              recipients: alarm.notification_config.email_ids,
              template: 'alarm'
            }
          }));
        }, 500);
      }
    };

    const getSeverityColor = (severity: string) => {
      const colors = {
        critical: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8',
        ok: '#28a745',
        battery: '#007bff'
      };
      return colors[severity] || '#6c757d';
    };

    // Load alarms from database on component mount
    onMounted(() => {
      console.log('📡 AlarmListing mounted, fetching alarms from database...');
      fetchAlarms();
    });

    return {
      tableData,
      tableHeader,
      search,
      searchItems,
      selectedIds,
      sort,
      onItemSelect,
      loading,
      limit,
      limits,
      prevPage,
      nextPage,
      page,
      addAlarm,
      deleteItem,
      clearAllAlarms,
      updateLimit,
      fetchAlarms,
      viewAlarmDetails,
      sendSMSAlert,
      sendEmailAlert,
      composeCustomEmail,
      getSeverityColor,
      activeTab,
    };
  },
});
</script>