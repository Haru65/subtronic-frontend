<template>
  <div class="card">
    <div class="card-header border-0 pt-6">
      <div class="card-title">
        <div class="d-flex align-items-center position-relative my-1">
          <KTIcon icon-name="magnifier" icon-class="fs-1 position-absolute ms-6" />
          <input
            type="text"
            v-model="search"
            @input="searchItems"
            class="form-control form-control-solid w-250px ps-15"
            placeholder="Search History"
          />
        </div>
      </div>
      <div class="card-toolbar">
        <div class="d-flex gap-2">
          <el-select
            v-model="selectedDays"
            @change="fetchAlarmHistory"
            class="w-150px"
            placeholder="Select time range"
          >
            <el-option label="Last 7 days" :value="7" />
            <el-option label="Last 30 days" :value="30" />
            <el-option label="Last 90 days" :value="90" />
            <el-option label="All time" :value="365" />
          </el-select>
        </div>
      </div>
    </div>
    <div class="card-body pt-0">
      <Datatable
        :data="tableData"
        :header="tableHeader"
        :checkbox-enabled="false"
        :items-per-page="limit"
        :items-per-page-dropdown-enabled="false"
        :loading="loading"
        @on-sort="sort"
      >
        <template v-slot:device_name="{ row: entry }">
          {{ entry.device_name }}
        </template>
        <template v-slot:timestamp="{ row: entry }">
          {{ formatDateTime(entry.timestamp) }}
        </template>
        <template v-slot:alarm_type="{ row: entry }">
          {{ entry.alarm_type }}
        </template>
        <template v-slot:location="{ row: entry }">
          <span class="text-muted">{{ entry.location }}</span>
        </template>
        <template v-slot:actions="{ row: entry }">
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
                  @click.prevent="viewDetails(entry)"
                >
                  <KTIcon icon-name="eye" icon-class="fs-3 text-primary" />
                  <span class="text-primary">View Details</span>
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
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import Datatable from "@/components/kt-datatable/KTDataTable.vue";
import Swal from "sweetalert2";
import arraySort from "array-sort";
import alarmService from "@/services/alarm.service";

interface IAlarmHistory {
  _id: string;
  timestamp: string;
  alarm_type: string;
  device_name: string;
  device_id: string;
  location: string;
  alarm_id: string;
  reason: string;
  triggered_values?: {
    dcv?: number;
    dci?: number;
    acv?: number;
  };
}

export default defineComponent({
  name: "alarm-history-log",
  components: {
    Datatable,
  },
  setup() {
    const tableHeader = ref([
      { columnName: "Device Name", columnLabel: "device_name", sortEnabled: true, columnWidth: 150 },
      { columnName: "Timestamp", columnLabel: "timestamp", sortEnabled: true, columnWidth: 180 },
      { columnName: "Alarm Type", columnLabel: "alarm_type", sortEnabled: true, columnWidth: 150 },
      { columnName: "Location", columnLabel: "location", sortEnabled: true, columnWidth: 150 },
      { columnName: "Actions", columnLabel: "actions", sortEnabled: false, columnWidth: 100 },
    ]);

    const tableData = ref<IAlarmHistory[]>([]);
    const initValues = ref<IAlarmHistory[]>([]);
    const search = ref<string>("");
    const loading = ref(false);
    const page = ref(1);
    const limit = ref(10);
    const limits = ref([10, 25, 50]);
    const selectedDays = ref(30);

    // Fetch alarm history from backend
    const fetchAlarmHistory = async () => {
      loading.value = true;
      try {
        console.log('📥 Fetching alarm history from database...');
        const data = await alarmService.getAlarmHistory({
          limit: 1000,
          days: selectedDays.value,
        });
        
        console.log('✅ Alarm history fetched successfully:', data);
        initValues.value = data || [];
        tableData.value = [...initValues.value];
        page.value = 1;
        updateTableData();
      } catch (error) {
        console.error('❌ Error fetching alarm history:', error);
        Swal.fire({
          title: "Error",
          text: "Failed to load alarm history from database.",
          icon: "error",
          buttonsStyling: false,
          confirmButtonText: "Ok",
          customClass: { confirmButton: "btn btn-primary" },
        });
      } finally {
        loading.value = false;
      }
    };

    const formatDateTime = (timestamp: string) => {
      return new Date(timestamp).toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
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
      page.value = 1;
      updateTableData();
    };

    const sort = (sort: { label: string; order: string }) => {
      const reverse = sort.order === "asc";
      if (sort.label) {
        arraySort(tableData.value, sort.label, { reverse });
      }
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
      const maxPage = Math.ceil(tableData.value.length / limit.value);
      if (page.value < maxPage) {
        page.value++;
        updateTableData();
      }
    };

    const updateTableData = () => {
      loading.value = true;
      const start = (page.value - 1) * limit.value;
      const end = start + limit.value;
      tableData.value = initValues.value.slice(start, end);
      setTimeout(() => {
        loading.value = false;
      }, 250);
    };

    const viewDetails = (entry: IAlarmHistory) => {
      const detail = `
        <div class="text-start">
          <p><strong>Device:</strong> ${entry.device_name}</p>
          <p><strong>Device ID:</strong> ${entry.device_id}</p>
          <p><strong>Location:</strong> ${entry.location}</p>
          <p><strong>Alarm Type:</strong> ${entry.alarm_type}</p>
          <p><strong>Timestamp:</strong> ${formatDateTime(entry.timestamp)}</p>
          <p><strong>Reason:</strong> ${entry.reason || 'N/A'}</p>
          ${entry.triggered_values ? `
            <p><strong>Triggered Values:</strong></p>
            <ul>
              ${entry.triggered_values.dcv ? `<li>DCV: ${entry.triggered_values.dcv}</li>` : ''}
              ${entry.triggered_values.dci ? `<li>DCI: ${entry.triggered_values.dci}</li>` : ''}
              ${entry.triggered_values.acv ? `<li>ACV: ${entry.triggered_values.acv}</li>` : ''}
            </ul>
          ` : ''}
        </div>
      `;

      Swal.fire({
        title: "Alarm History Details",
        html: detail,
        icon: "info",
        buttonsStyling: false,
        confirmButtonText: "Close",
        customClass: { confirmButton: "btn btn-primary" },
      });
    };

    // Load alarm history on component mount
    onMounted(() => {
      console.log('📡 AlarmHistoryLog mounted, fetching alarm history...');
      fetchAlarmHistory();
    });

    return {
      tableData,
      tableHeader,
      search,
      searchItems,
      sort,
      loading,
      limit,
      limits,
      prevPage,
      nextPage,
      page,
      fetchAlarmHistory,
      viewDetails,
      updateLimit,
      formatDateTime,
      selectedDays,
    };
  },
});
</script>
