<template>
  <div class="w-100">
    <!-- Header with Export Actions -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="page-heading">Device Reports</h1>
        <p class="text-muted">Generate and export telemetry data reports</p>
      </div>
      <div class="d-flex gap-2">
        <button
          class="btn btn-success"
          @click="exportToExcel"
          :disabled="exportLoading || telemetryData.length === 0"
        >
          <i :class="exportLoading ? 'bi bi-arrow-clockwise spinning me-2' : 'bi bi-file-earmark-spreadsheet me-2'"></i>
          {{ exportLoading ? 'Exporting...' : 'Export to Excel' }}
        </button>
        <button
          class="btn btn-primary"
          @click="exportPDF"
          :disabled="telemetryData.length === 0"
        >
          <i class="bi bi-file-earmark-pdf me-2"></i>
          Export PDF
        </button>
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="row g-4 mb-4">
      <div class="col-lg-3 col-md-6">
        <div class="card">
          <div class="card-body">
            <div class="d-flex align-items-center">
              <div class="symbol symbol-50px me-3">
                <span class="symbol-label bg-light-primary">
                  <i class="bi bi-file-text fs-2x text-primary"></i>
                </span>
              </div>
              <div>
                <div class="fs-7 text-muted">Total Records</div>
                <div class="fs-2 fw-bold">{{ totalRecords.toLocaleString() }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-3 col-md-6">
        <div class="card">
          <div class="card-body">
            <div class="d-flex align-items-center">
              <div class="symbol symbol-50px me-3">
                <span class="symbol-label bg-light-success">
                  <i class="bi bi-hdd-network fs-2x text-success"></i>
                </span>
              </div>
              <div>
                <div class="fs-7 text-muted">Active Devices</div>
                <div class="fs-2 fw-bold">{{ uniqueDevices }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-3 col-md-6">
        <div class="card">
          <div class="card-body">
            <div class="d-flex align-items-center">
              <div class="symbol symbol-50px me-3">
                <span class="symbol-label bg-light-warning">
                  <i class="bi bi-calendar-range fs-2x text-warning"></i>
                </span>
              </div>
              <div>
                <div class="fs-7 text-muted">Date Range</div>
                <div class="fs-6 fw-bold">{{ dateRangeDisplay }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-3 col-md-6">
        <div class="card">
          <div class="card-body">
            <div class="d-flex align-items-center">
              <div class="symbol symbol-50px me-3">
                <span class="symbol-label bg-light-info">
                  <i class="bi bi-clock-history fs-2x text-info"></i>
                </span>
              </div>
              <div>
                <div class="fs-7 text-muted">Last Updated</div>
                <div class="fs-7 fw-bold">{{ lastUpdated }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Gas Sensor Telemetry Data Section -->
    <div class="card mt-4">
      <div class="card-header">
        <div class="d-flex align-items-center">
          <h3 class="card-title mb-0">
            <i class="bi bi-speedometer2 me-2"></i>
            Gas Sensor Telemetry Data
          </h3>
        </div>
        <div class="card-toolbar">
          <button 
            @click="loadAlarmLogs" 
            class="btn btn-sm btn-primary" 
            :disabled="alarmLoading"
          >
            <i :class="alarmLoading ? 'bi bi-arrow-clockwise spinning' : 'bi bi-arrow-clockwise'"></i>
            Refresh
          </button>
        </div>
      </div>
      <div class="card-body">
        <div v-if="alarmLoading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3 text-muted">Loading telemetry data...</p>
        </div>
        
        <div v-else-if="alarmLogs.length === 0" class="text-center py-5">
          <i class="bi bi-inbox fs-1 text-muted"></i>
          <p class="mt-3 text-muted fs-5">No telemetry data found</p>
          <p class="text-muted">Waiting for sensor readings...</p>
        </div>

        <div v-else>
          <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
            <table class="table table-row-dashed table-row-gray-300 align-middle gs-0 gy-2">
              <thead style="position: sticky; top: 0; z-index: 10; background: #f3f6f9;">
                <tr class="fw-bold text-muted">
                  <th class="ps-4 py-3">Timestamp</th>
                  <th class="py-3">Device</th>
                  <th class="py-3">Gas Type</th>
                  <th class="py-3">Reading</th>
                  <th class="py-3">Unit</th>
                  <th class="py-3">A1 Threshold</th>
                  <th class="py-3">A2 Threshold</th>
                  <th class="py-3">A3 Threshold</th>
                  <th class="py-3">Alarm Status</th>
                  <th class="py-3">Severity</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in alarmLogs" :key="log.id" :class="getAlarmRowClass(log.severity)">
                  <td class="ps-4 py-2">
                    <div class="d-flex flex-column">
                      <span class="fw-bold">{{ formatDate(log.timestamp) }}</span>
                      <span class="text-muted fs-7">{{ formatTime(log.timestamp) }}</span>
                    </div>
                  </td>
                  <td class="py-2">
                    <div class="d-flex flex-column">
                      <span class="fw-bold">{{ log.device_name }}</span>
                      <span class="text-muted small">{{ log.serial_number }}</span>
                    </div>
                  </td>
                  <td class="py-2">
                    <span class="text-muted small">{{ log.gas_type || '-' }}</span>
                  </td>
                  <td class="py-2">
                    <span class="badge badge-light-primary fs-6">
                      {{ log.current_value }}
                    </span>
                  </td>
                  <td class="py-2">
                    <span class="text-muted small">{{ log.unit }}</span>
                  </td>
                  <td class="py-2">
                    <span class="badge badge-light-warning">250 {{ log.unit }}</span>
                  </td>
                  <td class="py-2">
                    <span class="badge badge-light-danger">500 {{ log.unit }}</span>
                  </td>
                  <td class="py-2">
                    <span class="badge badge-light-danger">1000 {{ log.unit }}</span>
                  </td>
                  <td class="py-2">
                    <span :class="getAlarmTypeBadgeClass(log.alarm_type)">
                      {{ formatAlarmType(log.alarm_type) }}
                    </span>
                  </td>
                  <td class="py-2">
                    <span :class="getSeverityBadgeClass(log.severity)">
                      <i :class="getSeverityIcon(log.severity)" class="me-1"></i>
                      {{ log.severity.toUpperCase() }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="d-flex justify-content-between align-items-center mt-4">
            <span class="text-muted">
              Showing {{ alarmLogs.length}} telemetry records with alarm status
            </span>
            <div class="d-flex gap-2">
              <span class="badge badge-light-warning">
                <i class="bi bi-exclamation-triangle me-1"></i>
                {{ alarmStats.by_severity?.warning || 0 }} Warning
              </span>
              <span class="badge badge-light-danger">
                <i class="bi bi-exclamation-diamond me-1"></i>
                {{ alarmStats.by_severity?.high || 0 }} High
              </span>
              <span class="badge badge-light-danger">
                <i class="bi bi-exclamation-octagon me-1"></i>
                {{ alarmStats.by_severity?.critical || 0 }} Critical
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Alarm Logs Section -->
    <div class="card mt-4">
      <div class="card-header">
        <div class="d-flex align-items-center justify-content-between">
          <h3 class="card-title mb-0">
            <i class="bi bi-exclamation-triangle me-2"></i>
            Alarm History
          </h3>
          <div class="d-flex align-items-center gap-3">
            <select 
              v-model="alarmSeverityFilter" 
              @change="loadAlarmLogs" 
              class="form-select form-select-sm" 
              style="width: 150px;"
            >
              <option value="">All Severities</option>
              <option value="warning">Warning</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <select 
              v-model="alarmTypeFilter" 
              @change="loadAlarmLogs" 
              class="form-select form-select-sm" 
              style="width: 180px;"
            >
              <option value="">All Alarm Types</option>
              <option value="alarm_level_1">Alarm Level A1</option>
              <option value="alarm_level_2">Alarm Level A2</option>
              <option value="alarm_level_3">Alarm Level A3</option>
              <option value="sensor_fault">Sensor Fault</option>
            </select>
            <button 
              @click="loadAlarmLogs" 
              class="btn btn-sm btn-primary" 
              :disabled="alarmLoading"
            >
              <i :class="alarmLoading ? 'bi bi-arrow-clockwise spinning' : 'bi bi-arrow-clockwise'"></i>
              Refresh
            </button>
            <button 
              @click="exportAlarmLogs" 
              class="btn btn-sm btn-success" 
              :disabled="alarmLogs.length === 0"
            >
              <i class="bi bi-file-earmark-spreadsheet me-1"></i>
              Export
            </button>
          </div>
        </div>
      </div>
      <div class="card-body">
        <div v-if="alarmLoading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3 text-muted">Loading alarm logs...</p>
        </div>
        
        <div v-else-if="alarmLogs.length === 0" class="text-center py-5">
          <i class="bi bi-shield-check fs-1 text-success"></i>
          <p class="mt-3 text-muted fs-5">No alarms recorded</p>
          <p class="text-muted">All systems operating normally</p>
        </div>

        <div v-else>
          <div class="table-responsive" style="max-height: 500px; overflow-y: auto;">
            <table class="table table-row-dashed table-row-gray-300 align-middle gs-0 gy-2">
              <thead style="position: sticky; top: 0; z-index: 10; background: #f3f6f9;">
                <tr class="fw-bold text-muted">
                  <th class="ps-4 py-3">Timestamp</th>
                  <th class="py-3">Device</th>
                  <th class="py-3">Alarm Type</th>
                  <th class="py-3">Severity</th>
                  <th class="py-3">Message</th>
                  <th class="py-3">Threshold</th>
                  <th class="py-3">Current Value</th>
                  <th class="py-3">Gas Type</th>
                  <th class="py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in alarmLogs" :key="log.id">
                  <td class="ps-4 py-2">
                    <div class="d-flex flex-column">
                      <span class="fw-bold">{{ formatDate(log.timestamp) }}</span>
                      <span class="text-muted fs-7">{{ formatTime(log.timestamp) }}</span>
                    </div>
                  </td>
                  <td class="py-2">
                    <div class="d-flex flex-column">
                      <span class="fw-bold">{{ log.device_name }}</span>
                      <span class="text-muted small">{{ log.serial_number }}</span>
                    </div>
                  </td>
                  <td class="py-2">
                    <span :class="getAlarmTypeBadgeClass(log.alarm_type)">
                      {{ formatAlarmType(log.alarm_type) }}
                    </span>
                  </td>
                  <td class="py-2">
                    <span :class="getSeverityBadgeClass(log.severity)">
                      {{ log.severity.toUpperCase() }}
                    </span>
                  </td>
                  <td class="py-2">
                    <span class="text-muted small">{{ log.message }}</span>
                  </td>
                  <td class="py-2">
                    <span v-if="log.threshold" class="badge badge-light-info">
                      {{ log.threshold }} {{ log.unit }}
                    </span>
                    <span v-else class="text-muted">-</span>
                  </td>
                  <td class="py-2">
                    <span v-if="log.current_value !== undefined" class="badge badge-light-warning">
                      {{ log.current_value }} {{ log.unit }}
                    </span>
                    <span v-else class="text-muted">-</span>
                  </td>
                  <td class="py-2">
                    <span class="text-muted small">{{ log.gas_type || '-' }}</span>
                  </td>
                  <td class="py-2">
                    <span v-if="log.acknowledged" class="badge badge-light-success">
                      <i class="bi bi-check-circle me-1"></i>
                      Acknowledged
                    </span>
                    <span v-else class="badge badge-light-danger">
                      <i class="bi bi-exclamation-circle me-1"></i>
                      Pending
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="d-flex justify-content-between align-items-center mt-4">
            <span class="text-muted">
              Showing {{ alarmLogs.length }} alarm logs
            </span>
            <div class="d-flex gap-2">
              <span class="badge badge-light-warning">
                <i class="bi bi-exclamation-triangle me-1"></i>
                {{ alarmStats.by_severity?.warning || 0 }} Warning
              </span>
              <span class="badge badge-light-danger">
                <i class="bi bi-exclamation-diamond me-1"></i>
                {{ alarmStats.by_severity?.high || 0 }} High
              </span>
              <span class="badge badge-light-danger">
                <i class="bi bi-exclamation-octagon me-1"></i>
                {{ alarmStats.by_severity?.critical || 0 }} Critical
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
    
<script lang="ts">
import { defineComponent, ref, onMounted, computed } from "vue";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import axios from "axios";
import Swal from "sweetalert2";
import { useAuthStore } from "@/stores/auth";
import ApiService from "@/core/services/ApiService";
import DeviceParametersChart from "@/components/iot/component/dashboard/DeviceParametersChart.vue";
import { reverseGeocode } from "@/utils/reverseGeocode";
import { formatTime } from "@/utils/dateFormatter";

export default defineComponent({
  name: "reports",
  components: {
    DeviceParametersChart,
  },
  setup() {
    const exportLoading = ref(false);
    const loading = ref(false);
    const authStore = useAuthStore();
    
    // Data and filters
    const telemetryData = ref<any[]>([]);
    const devices = ref<any[]>([]);
    const selectedDevice = ref('');
    const selectedMode = ref(''); // Filter for mode types: '', 'NORMAL', 'INT', 'DEPOL', 'INST' (DEPOL is primary variant)
    const selectedEventFilter = ref(''); // Filter for event types: '', 'NORMAL', 'INT', 'DEPOL', 'INST' (DEPOL is primary variant)
    const startDate = ref(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Last 30 days
    const endDate = ref(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Tomorrow to catch today's data
    const dataLimit = ref(100);
    const locationCache = ref<Map<string, string>>(new Map());
    
    // Alarm logs state
    const alarmLogs = ref<any[]>([]);
    const alarmLoading = ref(false);
    const alarmSeverityFilter = ref('');
    const alarmTypeFilter = ref('');
    const alarmStats = ref<any>({});
    
    // Persistent storage for event-type records (accumulate data instead of just filtering)
    const persistentNormalEvents = ref<any[]>([]);
    const persistentDpolEvents = ref<any[]>([]);
    const persistentIntEvents = ref<any[]>([]);
    const persistentInstEvents = ref<any[]>([]);

    // Computed properties
    const totalRecords = computed(() => telemetryData.value.length);
    const uniqueDevices = computed(() => {
      const deviceIds = new Set(telemetryData.value.map(r => r.deviceId));
      return deviceIds.size;
    });
    const dateRangeDisplay = computed(() => {
      if (!startDate.value || !endDate.value) return 'Not set';
      const days = Math.ceil((new Date(endDate.value).getTime() - new Date(startDate.value).getTime()) / (1000 * 60 * 60 * 24));
      return `${days} days`;
    });
    const lastUpdated = computed(() => {
      if (telemetryData.value.length === 0) return 'No data';
      return new Date().toLocaleTimeString();
    });

    // Get all unique data fields from telemetry records (now flattened at top level)
    const dataFields = computed(() => {
      // Define the desired column order - EXACT ORDER AS SPECIFIED
      const desiredOrder = [
        'location', 'status', 'logNo', 'log', 'timestamp', 'mode',
        'acv', 'aci', 'dcv', 'dci',
        'ref1', 'ref2', 'ref3',
        'di1', 'di2', 'di3', 'di4', 'do',
        'latitude', 'longitude', 'lat', 'long',
        'ref1Status', 'ref2Status', 'ref3Status',
        'REF1Status', 'REF2Status', 'REF3Status'
      ];
      
      const fields = new Set<string>();
      const fixedFields = new Set([
        '_id', 'deviceId', 'timestamp', 'event', 'status', 'location',
        'name', 'type', 'lastSeen', '__v', 'createdAt', 'updatedAt',
        'data', // Explicitly exclude the data field itself
        'sn', 'SN', 'LATITUDE', 'LONGITUDE', // Exclude serial number fields
        'sender' // Exclude sender field
      ]);
      
      // Extract all dynamic fields from records
      telemetryData.value.forEach(record => {
        Object.keys(record).forEach(key => {
          // Include any field that's not a fixed system field
          if (!fixedFields.has(key) && !key.startsWith('_') && record[key] !== undefined) {
            fields.add(key);
          }
        });
      });
      
      // Create case-insensitive lookup for matching
      const fieldMap = new Map<string, string>();
      fields.forEach(field => {
        fieldMap.set(field.toLowerCase(), field);
      });
      
      // Create ordered result with desired order first
      const orderedFields: string[] = [];
      const addedFields = new Set<string>();
      
      // Add fields in desired order (case-insensitive matching)
      for (const desiredField of desiredOrder) {
        const actualField = fieldMap.get(desiredField.toLowerCase());
        if (actualField && !addedFields.has(actualField)) {
          orderedFields.push(actualField);
          addedFields.add(actualField);
        }
      }
      
      // Add any remaining fields that weren't in the desired order
      const remainingFields = Array.from(fields)
        .filter(field => !addedFields.has(field) && field.toLowerCase() !== 'sender' && field.toLowerCase() !== 'event')
        .sort();
      
      console.log('📊 Detected telemetry fields:', Array.from(fields).sort());
      console.log('📊 Field order applied:', orderedFields);
      
      return orderedFields.concat(remainingFields);
    });

    const displayedData = computed(() => {
      // CRITICAL FIX: Filter FIRST, then apply data limit
      // This ensures that when you select a mode, you get results across the entire dataset
      // not just from the first N records
      
      // Debug: Log unique events in current data
      if (telemetryData.value.length > 0) {
        const uniqueEvents = [...new Set(telemetryData.value.map(r => r.event))];
        console.log(`📊 Unique events in loaded data (${telemetryData.value.length} records): ${uniqueEvents.join(', ')}`);
        
        // Count events by type
        const counts = {
          NORMAL: 0,
          INT: 0,
          DPOL: 0,
          INST: 0,
          OTHER: 0
        };
        telemetryData.value.forEach(record => {
          const evt = String(record.event || '').toUpperCase();
          if (evt === 'NORMAL') counts.NORMAL++;
          else if (evt.includes('INT')) counts.INT++;
          else if (evt.includes('DPOL') || evt.includes('DEPOL')) counts.DPOL++;
          else if (evt.includes('INST')) counts.INST++;
          else counts.OTHER++;
        });
        console.log(`📊 Event distribution: NORMAL=${counts.NORMAL}, INT=${counts.INT}, DPOL=${counts.DPOL}, INST=${counts.INST}, OTHER=${counts.OTHER}`);
      }
      
      let filtered = telemetryData.value;
      
      // Filter by mode/event type if selected (BEFORE applying data limit)
      if (selectedMode.value && selectedMode.value.trim() !== '') {
        filtered = filtered.filter(record => {
          const event = record.event;
          const eventNum = Number(event);
          const eventStr = String(event || '').toUpperCase().trim();
          const modeUpper = selectedMode.value.toUpperCase().trim();
          
          // DEBUG: Log the first few filtering attempts
          if (filtered.length < 5) {
            console.log(`🔍 Checking record event="${event}" (str="${eventStr}", num=${eventNum}) against filter="${modeUpper}"`);
          }
          
          // Match based on selected mode
          // Handle both numeric codes and string event values (e.g., "INST OFF", "INT ON", "DPOL", "NORMAL")
          if (modeUpper === 'NORMAL') {
            return eventNum === 0 || 
                   event === 0 || 
                   event === '0' || 
                   eventStr === 'NORMAL' ||
                   eventStr.startsWith('NORMAL');
          } else if (modeUpper === 'INT') {
            // Match: 1, '1', "INT", "INT ON", "INT OFF", "INTERRUPT"
            return eventNum === 1 || 
                   event === 1 || 
                   event === '1' || 
                   eventStr === 'INT' ||
                   eventStr.startsWith('INT') || 
                   eventStr === 'INTERRUPT' ||
                   eventStr.startsWith('INTERRUPT');
          } else if (modeUpper === 'DPOL') {
            // Match: 3, '3', "DEPOL", "DPOL" (both variants from device)
            // CRITICAL: Accept both DPOL and DEPOL since device may send either
            return eventNum === 3 || 
                   event === 3 || 
                   event === '3' || 
                   eventStr === 'DPOL' || 
                   eventStr === 'DEPOL' ||
                   eventStr.startsWith('DPOL') ||
                   eventStr.startsWith('DEPOL');
          } else if (modeUpper === 'INST') {
            // Match: 4, '4', "INST", "INST ON", "INST OFF", "INSTANT"
            return eventNum === 4 || 
                   event === 4 || 
                   event === '4' || 
                   eventStr === 'INST' ||
                   eventStr.startsWith('INST') || 
                   eventStr === 'INSTANT' ||
                   eventStr.startsWith('INSTANT');
          }
          
          return true;
        });
        console.log(`🔍 Mode filter "${selectedMode.value}": ${filtered.length} records matched from ${telemetryData.value.length} total`);
        
        // DEBUG: Log unique events in filtered results
        if (filtered.length > 0) {
          const uniqueFilteredEvents = [...new Set(filtered.map(r => r.event))];
          console.log(`📊 Unique events in filtered results: ${uniqueFilteredEvents.join(', ')}`);
        }
      }
      
      // NOW apply the data limit to the filtered results
      return filtered.slice(0, dataLimit.value);
    });

    // Helper function to accumulate new events without duplicates
    const accumulateEvents = (events: any[], newRecords: any[]) => {
      const existingIds = new Set(events.map(e => e._id));
      const uniqueNewRecords = newRecords.filter(r => !existingIds.has(r._id));
      return [...events, ...uniqueNewRecords];
    };

    // Event filtering computed properties with persistent storage
    const normalEvents = computed(() => {
      // Filter new normal events from current telemetry data
      const newNormalEvents = telemetryData.value.filter(record => {
        const event = record.event;
        const eventNum = Number(event);
        const eventStr = String(event || '').toUpperCase().trim();
        // Event code 0 = Normal
        return eventNum === 0 || 
               event === 0 || 
               event === '0' || 
               eventStr === 'NORMAL' ||
               eventStr.startsWith('NORMAL');
      });
      
      // Accumulate without duplicates
      persistentNormalEvents.value = accumulateEvents(persistentNormalEvents.value, newNormalEvents);
      return persistentNormalEvents.value;
    });

    const dpolEvents = computed(() => {
      // Filter new dpol events from current telemetry data
      const newDpolEvents = telemetryData.value.filter(record => {
        const event = record.event;
        const eventNum = Number(event);
        const eventStr = String(event || '').toUpperCase().trim();
        // Event code 3 = DPOL/DEPOL (accept both variants)
        return eventNum === 3 || 
               event === 3 || 
               event === '3' || 
               eventStr === 'DPOL' || 
               eventStr === 'DEPOL' ||
               eventStr.startsWith('DPOL') ||
               eventStr.startsWith('DEPOL');
      });
      
      if (newDpolEvents.length > 0) {
        console.log(`📊 Found ${newDpolEvents.length} DPOL events in telemetry data`);
      }
      
      // Accumulate without duplicates
      persistentDpolEvents.value = accumulateEvents(persistentDpolEvents.value, newDpolEvents);
      return persistentDpolEvents.value;
    });

    const intEvents = computed(() => {
      // Filter new int events from current telemetry data
      const newIntEvents = telemetryData.value.filter(record => {
        const event = record.event;
        const eventNum = Number(event);
        const eventStr = String(event || '').toUpperCase().trim();
        // Event code 1 = INT/Interrupt (includes "INT ON", "INT OFF", etc.)
        return eventNum === 1 || 
               event === 1 || 
               event === '1' || 
               eventStr === 'INT' ||
               eventStr.startsWith('INT') || 
               eventStr === 'INTERRUPT' ||
               eventStr.startsWith('INTERRUPT');
      });
      
      // Accumulate without duplicates
      persistentIntEvents.value = accumulateEvents(persistentIntEvents.value, newIntEvents);
      return persistentIntEvents.value;
    });

    const instEvents = computed(() => {
      // Filter new inst events from current telemetry data
      const newInstEvents = telemetryData.value.filter(record => {
        const event = record.event;
        const eventNum = Number(event);
        const eventStr = String(event || '').toUpperCase().trim();
        // Event code 4 = Instant/INST (includes "INST ON", "INST OFF", etc.)
        return eventNum === 4 || 
               event === 4 || 
               event === '4' || 
               eventStr === 'INST' ||
               eventStr.startsWith('INST') || 
               eventStr === 'INSTANT' ||
               eventStr.startsWith('INSTANT');
      });
      
      if (newInstEvents.length > 0) {
        console.log(`📊 Found ${newInstEvents.length} INST events in telemetry data`);
      }
      
      // Accumulate without duplicates
      persistentInstEvents.value = accumulateEvents(persistentInstEvents.value, newInstEvents);
      return persistentInstEvents.value;
    });

    // Filter events based on selectedEventFilter
    const filteredEvents = computed(() => {
      const filterValue = selectedEventFilter.value.toUpperCase();
      
      if (filterValue === '') {
        // Return all events
        return [...persistentNormalEvents.value, ...persistentDpolEvents.value, ...persistentIntEvents.value, ...persistentInstEvents.value];
      } else if (filterValue === 'NORMAL') {
        return persistentNormalEvents.value;
      } else if (filterValue === 'DPOL') {
        return persistentDpolEvents.value;
      } else if (filterValue === 'INT') {
        return persistentIntEvents.value;
      } else if (filterValue === 'INST') {
        return persistentInstEvents.value;
      }
      
      return [];
    });

    // Helper function to get event type name from event field
    const getEventTypeName = (event: any) => {
      const eventNum = Number(event);
      const eventStr = String(event || '').toUpperCase();
      
      if (eventNum === 0 || event === 0 || event === '0' || eventStr === 'NORMAL') return 'NORMAL';
      if (eventNum === 1 || event === 1 || event === '1' || eventStr === 'INT' || eventStr === 'INTERRUPT') return 'INT';
      if (eventNum === 3 || event === 3 || event === '3' || eventStr === 'DPOL' || eventStr === 'DEPOL') return 'DPOL';
      if (eventNum === 4 || event === 4 || event === '4' || eventStr === 'INST' || eventStr === 'INSTANT') return 'INST';
      
      return String(event || 'UNKNOWN');
    };

    // Helper function to get badge class for event type
    const getEventBadgeClass = (event: any) => {
      const eventType = getEventTypeName(event);
      
      switch (eventType) {
        case 'NORMAL':
          return 'badge badge-light-success text-nowrap';
        case 'INT':
          return 'badge badge-light-danger text-nowrap';
        case 'DPOL':
          return 'badge badge-light-warning text-nowrap';
        case 'INST':
          return 'badge badge-light-info text-nowrap';
        default:
          return 'badge badge-light-secondary text-nowrap';
      }
    };

    // Helper function to get type class for event type column
    const getEventTypeClass = (event: any) => {
      const eventType = getEventTypeName(event);
      
      switch (eventType) {
        case 'NORMAL':
          return 'badge badge-success';
        case 'INT':
          return 'badge badge-danger';
        case 'DPOL':
          return 'badge badge-warning';
        case 'INST':
          return 'badge badge-info';
        default:
          return 'badge badge-secondary';
      }
    };

    // Load devices list
    const loadDevices = async () => {
      try {
        // COMMENTED OUT - Not needed for alarm logs only
        // ApiService.setHeader();
        // const response = await ApiService.get('/api/devices');
        
        // // Handle both response formats: {devices: []} or {data: []}
        // const deviceList = response.data?.devices || response.data?.data || [];
        
        // if (Array.isArray(deviceList) && deviceList.length > 0) {
        //   devices.value = deviceList.filter(device => device && device.deviceId);
        //   console.log('✅ Loaded', devices.value.length, 'devices');
        // } else {
        //   throw new Error('No devices found');
        // }
        
        console.log('ℹ️ Device list loading disabled - focusing on alarm logs');
      } catch (error) {
        console.error('❌ Error loading devices:', error);
        // Swal.fire({
        //   title: 'Warning',
        //   text: 'Could not load devices list. You can still view all data.',
        //   icon: 'warning',
        //   confirmButtonText: 'OK'
        // });
      }
    };

    // Process locations in telemetry records - reverse geocode coordinates
    const processRecordLocations = async () => {
      console.log('🔍 Processing locations for', telemetryData.value.length, 'records');
      
      for (const record of telemetryData.value) {
        if (!record.location) continue;
        
        // First, check if location is a JSON string (from database)
        try {
          const parsed = JSON.parse(record.location);
          if (parsed && typeof parsed === 'object') {
            // Extract city_name from JSON object
            if (parsed.city_name) {
              record.location = parsed.city_name;
              console.log(`✅ Extracted city_name: ${record.location}`);
              continue;
            } else if (parsed.address) {
              record.location = parsed.address;
              continue;
            }
          }
        } catch (e) {
          // Not a JSON string, continue with coordinate check
        }
        
        // Check if location is coordinates (latitude, longitude format)
        const coordMatch = record.location?.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
        
        if (coordMatch) {
          const lat = parseFloat(coordMatch[1]);
          const lon = parseFloat(coordMatch[2]);
          const cacheKey = `${lat},${lon}`;
          
          console.log(`📍 Found coordinates: lat=${lat}, lon=${lon}`);
          
          // Check cache first
          if (locationCache.value.has(cacheKey)) {
            const cached = locationCache.value.get(cacheKey);
            if (cached) {
              record.location = cached;
              console.log(`✅ Using cached location: ${cached}`);
            }
          } else {
            try {
              // Reverse geocode coordinates to get actual location
              console.log(`🌐 Reverse geocoding (${lat}, ${lon})...`);
              const geoData = await reverseGeocode(lat, lon);
              if (geoData) {
                let addressStr = '';
                if (typeof geoData.address === 'string') {
                  addressStr = geoData.address;
                } else if (typeof geoData.city_name === 'string') {
                  addressStr = geoData.city_name;
                } else if (typeof geoData.address === 'object' && geoData.address !== null) {
                  addressStr = geoData.address.display_name || JSON.stringify(geoData.address);
                } else {
                  addressStr = String(geoData.address || geoData);
                }
                
                if (addressStr && addressStr !== '[object Object]') {
                  record.location = addressStr;
                  locationCache.value.set(cacheKey, addressStr);
                  console.log(`📍 Geocoded to: ${addressStr}`);
                }
              }
            } catch (err) {
              console.warn(`⚠️ Could not geocode ${cacheKey}:`, err);
            }
          }
        }
      }
      
      console.log('✅ Location processing complete');
    };

    // Load telemetry data from API
    const loadTelemetryData = async () => {
      try {
        loading.value = true;
        
        // Clear persistent event storage when loading new data (fresh filter)
        persistentNormalEvents.value = [];
        persistentDpolEvents.value = [];
        persistentIntEvents.value = [];
        persistentInstEvents.value = [];
        
        // Validate dates
        const start = new Date(startDate.value);
        const end = new Date(endDate.value);
        
        if (start > end) {
          Swal.fire({
            title: 'Invalid Date Range',
            text: 'Start date cannot be after end date.',
            icon: 'warning',
            confirmButtonText: 'OK'
          });
          loading.value = false;
          return;
        }

        // COMMENTED OUT - Not needed for alarm logs only
        // const params = new URLSearchParams({
        //   startDate: startDate.value,
        //   endDate: endDate.value,
        //   limit: dataLimit.value.toString(),
        //   sort: '-timestamp'
        // });
        
        // if (selectedMode.value && selectedMode.value.trim() !== '') {
        //   params.append('mode', selectedMode.value);
        //   console.log(`📤 Sending mode filter to API: "${selectedMode.value}"`);
        // }

        // console.log('📊 Loading telemetry data:', params.toString());
        
        // ApiService.setHeader();
        // const response = await ApiService.listingget('/api/telemetry', params.toString());
        
        // if (response.data?.success && Array.isArray(response.data.data)) {
        //   let filteredData = response.data.data;
        //   if (selectedDevice.value && selectedDevice.value.trim() !== '') {
        //     filteredData = filteredData.filter(record => {
        //       const recordDeviceId = String(record.deviceId);
        //       const selectedDeviceId = String(selectedDevice.value);
        //       return recordDeviceId === selectedDeviceId;
        //     });
        //     console.log(`🔍 Filtered by device ${selectedDevice.value}: ${filteredData.length} records`);
        //   }
          
        //   telemetryData.value = filteredData;
        //   console.log('✅ Loaded', telemetryData.value.length, 'records');
          
        //   await processRecordLocations();
          
        //   if (telemetryData.value.length > 0) {
        //     const firstRecord = telemetryData.value[0];
        //     console.log('📋 First record structure:', {
        //       keys: Object.keys(firstRecord),
        //       sample: JSON.stringify(firstRecord, null, 2)
        //     });
        //   }
          
        //   if (telemetryData.value.length === 0) {
        //     Swal.fire({
        //       title: 'No Data Found',
        //       text: 'No telemetry data found for the selected filters. Try adjusting the date range or device filter.',
        //       icon: 'info',
        //       confirmButtonText: 'OK',
        //       timer: 3000
        //     });
        //   }
        // } else {
        //   throw new Error('Invalid response format');
        // }
        
        console.log('ℹ️ Telemetry data loading disabled - focusing on alarm logs');
        telemetryData.value = [];

      } catch (error: any) {
        console.error('❌ Error loading telemetry data:', error);
        telemetryData.value = [];
        
        // Swal.fire({
        //   title: 'Error Loading Data',
        //   text: error.message || 'Failed to load telemetry data. Please check your connection and try again.',
        //   icon: 'error',
        //   confirmButtonText: 'OK'
        // });
      } finally {
        loading.value = false;
      }
    };

    // Utility functions
    const formatDate = (timestamp: string) => {
      return new Date(timestamp).toLocaleDateString();
    };

    const formatTime = (timestamp: string) => {
      return new Date(timestamp).toLocaleTimeString();
    };

    const formatDataValue = (value: any) => {
      if (value === null || value === undefined) return '-';
      if (typeof value === 'number') return value.toFixed(2);
      return value.toString();
    };

    const formatFieldName = (field: string) => {
      const lowerField = field.toLowerCase();
      
      // Handle Digital Input columns (both short and long names)
      if (lowerField === 'di1' || lowerField === 'digital input 1') return 'DI 1';
      if (lowerField === 'di2' || lowerField === 'digital input 2') return 'DI 2';
      if (lowerField === 'di3' || lowerField === 'digital input 3') return 'DI 3';
      if (lowerField === 'di4' || lowerField === 'digital input 4') return 'DI 4';
      
      // Handle Digital Output column (both short and long names)
      if (lowerField === 'do' || lowerField === 'digital output') return 'DO';
      
      // Default formatting
      return field.toUpperCase().replace(/_/g, ' ');
    };

    const formatLocation = (loc: any): string => {
      // Handle non-string values
      if (!loc || loc === 'N/A') return 'N/A';
      
      // Convert to string if it's an object or not a string
      let locStr = typeof loc === 'string' ? loc : String(loc);
      
      if (!locStr || locStr === 'N/A' || locStr === '[object Object]') return 'N/A';
      
      // Try to parse as JSON first (from database storage)
      try {
        const parsed = JSON.parse(locStr);
        if (parsed && typeof parsed === 'object') {
          if (parsed.city_name) return parsed.city_name;
          if (parsed.address) return parsed.address;
          if (parsed.display_name) return parsed.display_name;
        }
      } catch (e) {
        // Not valid JSON, continue with coordinate check
      }
      
      // Check if location looks like coordinates (latitude, longitude)
      const coordMatch = locStr.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
      if (coordMatch) {
        // Return shortened coordinate display
        return `${coordMatch[1]}, ${coordMatch[2]}`;
      }
      
      // Otherwise return the location as-is (assumed to be an address)
      return locStr;
    };

    const getDataField = (record: any, field: string) => {
      // Skip if field is the data field itself
      if (field === 'data') return null;
      
      // Check if field exists directly in record (flattened structure)
      if (record.hasOwnProperty(field)) {
        return record[field];
      }
      
      // Fall back to legacy data object structure for backward compatibility
      if (record.data && typeof record.data === 'object') {
        const dataObj = record.data instanceof Map ? Object.fromEntries(record.data) : record.data;
        return dataObj[field] || null;
      }
      
      return null;
    };

    // Get event value (state) from event string
    // Examples: "event:normal/int on" -> "int on", "INT OFF" -> "INT OFF"
    const getEventValue = (record: any) => {
      const event = String(record.event || '');
      
      // Handle format like "event:normal/int on" 
      if (event.includes('/')) {
        const parts = event.split('/');
        return parts[parts.length - 1].trim();
      }
      
      // Handle format like "INT OFF", "INST ON", etc.
      return event;
    };

    // Export to PDF
    const exportPDF = async () => {
      try {
        const chartsElement = document.querySelector('.row.g-4');
        if (!chartsElement) {
          throw new Error('Charts not found');
        }

        const canvas = await html2canvas(chartsElement as HTMLElement);
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "landscape" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
        pdf.save(`telemetry_report_${new Date().toISOString().split('T')[0]}.pdf`);

        await Swal.fire({
          title: 'PDF Downloaded',
          text: 'Your PDF report has been downloaded successfully.',
          icon: 'success',
          confirmButtonText: 'OK',
          timer: 3000
        });
      } catch (error) {
        console.error('❌ PDF export error:', error);
        Swal.fire({
          title: 'Export Failed',
          text: 'Failed to generate PDF. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    };

    // Export to Excel - Production Grade
    const exportToExcel = async () => {
      try {
        exportLoading.value = true;

        if (!authStore.isAuthenticated) {
          throw new Error('You must be logged in to export data.');
        }

        // Ensure devices are loaded
        if (devices.value.length === 0) {
          await loadDevices();
        }

        // Show configuration dialog
        const { value: exportConfig } = await Swal.fire({
          title: 'Export Telemetry Data',
          html: `
            <div class="text-start">
              <div class="mb-3">
                <label for="export-start-date" class="form-label fw-bold">Start Date</label>
                <input type="date" id="export-start-date" class="form-control" value="${startDate.value}">
              </div>
              <div class="mb-3">
                <label for="export-end-date" class="form-label fw-bold">End Date</label>
                <input type="date" id="export-end-date" class="form-control" value="${endDate.value}">
              </div>
              <div class="mb-3">
                <label for="export-device-id" class="form-label fw-bold">Device Filter</label>
                <select id="export-device-id" class="form-select">
                  <option value="">All Devices</option>
                  ${devices.value.map(d => `<option value="${d.deviceId}" ${selectedDevice.value === d.deviceId ? 'selected' : ''}>${d.name || d.deviceId} (${d.deviceId})</option>`).join('')}
                </select>
              </div>
              <div class="alert alert-info d-flex align-items-center">
                <i class="bi bi-info-circle me-2"></i>
                <small>Export will include all telemetry data for the selected period in Excel format.</small>
              </div>
            </div>
          `,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: '<i class="bi bi-download me-2"></i>Export',
          cancelButtonText: 'Cancel',
          customClass: {
            confirmButton: "btn btn-success",
            cancelButton: "btn btn-secondary"
          },
          width: '500px',
          preConfirm: () => {
            const exportStartDate = (document.getElementById('export-start-date') as HTMLInputElement).value;
            const exportEndDate = (document.getElementById('export-end-date') as HTMLInputElement).value;
            const exportDeviceId = (document.getElementById('export-device-id') as HTMLSelectElement).value;

            if (!exportStartDate || !exportEndDate) {
              Swal.showValidationMessage('Please select both start and end dates');
              return false;
            }

            if (new Date(exportStartDate) > new Date(exportEndDate)) {
              Swal.showValidationMessage('Start date cannot be after end date');
              return false;
            }

            return { startDate: exportStartDate, endDate: exportEndDate, deviceId: exportDeviceId };
          }
        });

        if (!exportConfig) {
          exportLoading.value = false;
          return;
        }

        // Show progress
        Swal.fire({
          title: 'Exporting Data',
          html: 'Please wait while we generate your Excel file...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Prepare API call
        const API_BASE_URL = (import.meta.env.VITE_APP_API_URL || 'http://localhost:3001').replace(/\/$/, '');
        const params = new URLSearchParams({
          startDate: exportConfig.startDate,
          endDate: exportConfig.endDate,
          format: 'download'
        });

        if (exportConfig.deviceId && exportConfig.deviceId.trim() !== '') {
          params.append('deviceId', exportConfig.deviceId);
        }

        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('Authentication token not found. Please login again.');
        }

        console.log('📤 Export URL:', `${API_BASE_URL}/export/telemetry/excel?${params.toString()}`);
        console.log('🔑 Token present:', !!token);
        console.log('📋 Export config:', exportConfig);

        // Make API call
        const response = await axios.get(`${API_BASE_URL}/export/telemetry/excel?${params.toString()}`, {
          responseType: 'blob',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000 // 2 minute timeout for large exports
        });

        console.log('✅ Response received:', {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers['content-type'],
          dataSize: response.data.size
        });

        // Check if response is actually an error message
        if (response.data.type === 'application/json') {
          const text = await response.data.text();
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || 'Export failed');
        }

        // Create download
        const blob = new Blob([response.data], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Extract filename from headers or use default
        const contentDisposition = response.headers['content-disposition'];
        let filename = `telemetry_export_${exportConfig.startDate}_to_${exportConfig.endDate}.xlsx`;
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // Success message
        await Swal.fire({
          title: 'Export Successful!',
          html: `
            <div class="text-center">
              <i class="bi bi-check-circle text-success" style="font-size: 3rem;"></i>
              <p class="mt-3">Your Excel file has been downloaded successfully.</p>
              <p class="text-muted small">File: ${filename}</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'OK',
          customClass: {
            confirmButton: "btn btn-success"
          },
          timer: 5000
        });

      } catch (error: any) {
        console.error('❌ Export error:', error);
        console.error('❌ Error response:', error.response?.data);
        console.error('❌ Error status:', error.response?.status);
        
        let errorMessage = 'Failed to export data. Please try again.';
        
        if (error.message && error.message.includes('Authentication token')) {
          errorMessage = 'Session expired. Please login again.';
        } else if (error.response) {
          if (error.response.status === 401) {
            errorMessage = 'Authentication failed. Please login again.';
          } else if (error.response.status === 403) {
            errorMessage = 'You do not have permission to export data.';
          } else if (error.response.status === 404) {
            errorMessage = 'Export service not found. Please contact support.';
          } else if (error.response.status >= 500) {
            errorMessage = 'Server error. Please try again later.';
            // Try to get error message from response blob
            if (error.response.data instanceof Blob) {
              try {
                const text = await error.response.data.text();
                const errorData = JSON.parse(text);
                if (errorData.error) {
                  errorMessage = `Server error: ${errorData.error}`;
                }
              } catch (e) {
                console.log('Could not parse error response');
              }
            }
          } else if (error.response.data && error.response.data.error) {
            errorMessage = error.response.data.error;
          }
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'Export timeout. Try exporting a smaller date range.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        await Swal.fire({
          title: 'Export Failed',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'OK',
          customClass: {
            confirmButton: "btn btn-danger"
          }
        });
      } finally {
        exportLoading.value = false;
      }
    };

    // Export event reports to Excel
    const exportEventReport = async (eventType: 'normal' | 'dpol' | 'int' | 'inst') => {
      try {
        const eventMap: Record<string, any[]> = {
          'normal': normalEvents.value,
          'dpol': dpolEvents.value,
          'int': intEvents.value,
          'inst': instEvents.value
        };

        const events = eventMap[eventType];
        if (!events || events.length === 0) {
          Swal.fire({
            title: 'No Data',
            text: `No ${eventType.toUpperCase()} events to export.`,
            icon: 'warning',
            confirmButtonText: 'OK'
          });
          return;
        }

        // Create headers in the same order as the report table
        const headers = [
          'Device ID', 'Location', 'Status', 'Log No', 'Timestamp', 'Mode',
          'ACV', 'ACI', 'DCV', 'DCI',
          'Ref 1', 'Ref 2', 'Ref 3',
          'DI 1', 'DI 2', 'DI 3', 'DI 4', 'DO',
          'Latitude', 'Longitude',
          'Ref Status 1', 'Ref Status 2', 'Ref Status 3'
        ];

        const rows = events.map(record => [
          record.deviceId,
          formatLocation(record.location) || '-',
          formatDataValue(getDataField(record, 'status')) || '-',
          formatDataValue(getDataField(record, 'logNo') || getDataField(record, 'log') || getDataField(record, 'LOG')) || '-',
          new Date(record.timestamp).toLocaleString(),
          formatDataValue(record.event) || '-',
          formatDataValue(getDataField(record, 'acv') || getDataField(record, 'ACV')) || '-',
          formatDataValue(getDataField(record, 'aci') || getDataField(record, 'ACI')) || '-',
          formatDataValue(getDataField(record, 'dcv') || getDataField(record, 'DCV')) || '-',
          formatDataValue(getDataField(record, 'dci') || getDataField(record, 'DCI')) || '-',
          formatDataValue(getDataField(record, 'ref1') || getDataField(record, 'REF1')) || '-',
          formatDataValue(getDataField(record, 'ref2') || getDataField(record, 'REF2')) || '-',
          formatDataValue(getDataField(record, 'ref3') || getDataField(record, 'REF3')) || '-',
          formatDataValue(getDataField(record, 'di1') || getDataField(record, 'Digital Input 1')) || '-',
          formatDataValue(getDataField(record, 'di2') || getDataField(record, 'Digital Input 2')) || '-',
          formatDataValue(getDataField(record, 'di3') || getDataField(record, 'Digital Input 3')) || '-',
          formatDataValue(getDataField(record, 'di4') || getDataField(record, 'Digital Input 4')) || '-',
          formatDataValue(getDataField(record, 'do') || getDataField(record, 'Digital Output')) || '-',
          formatDataValue(getDataField(record, 'latitude') || getDataField(record, 'lat') || getDataField(record, 'LATITUDE')) || '-',
          formatDataValue(getDataField(record, 'longitude') || getDataField(record, 'long') || getDataField(record, 'LONGITUDE')) || '-',
          formatDataValue(getDataField(record, 'ref1Status') || getDataField(record, 'REF1Status') || getDataField(record, 'REF1 STS')) || '-',
          formatDataValue(getDataField(record, 'ref2Status') || getDataField(record, 'REF2Status') || getDataField(record, 'REF2 STS')) || '-',
          formatDataValue(getDataField(record, 'ref3Status') || getDataField(record, 'REF3Status') || getDataField(record, 'REF3 STS')) || '-'
        ]);

        // Convert to CSV
        const csvContent = [
          headers.map(h => `"${h}"`).join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `${eventType.toUpperCase()}_events_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        Swal.fire({
          title: 'Export Successful!',
          html: `
            <div class="text-center">
              <i class="bi bi-check-circle text-success" style="font-size: 3rem;"></i>
              <p class="mt-3">Exported ${events.length} ${eventType.toUpperCase()} events</p>
              <p class="text-muted small">Total accumulated data for this session</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'OK',
          customClass: {
            confirmButton: "btn btn-success"
          },
          timer: 3000
        });
      } catch (error: any) {
        console.error('❌ Event export error:', error);
        Swal.fire({
          title: 'Export Failed',
          text: error.message || 'Failed to export event data.',
          icon: 'error',
          confirmButtonText: 'OK',
          customClass: {
            confirmButton: "btn btn-danger"
          }
        });
      }
    };

    // Clear accumulated event data (manual reset)
    const clearAccumulatedEvents = () => {
      Swal.fire({
        title: 'Clear Accumulated Data?',
        text: 'This will clear all accumulated NORMAL, DPOL, INT, and INST events. This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Clear',
        cancelButtonText: 'Cancel',
        customClass: {
          confirmButton: "btn btn-danger",
          cancelButton: "btn btn-secondary"
        }
      }).then((result) => {
        if (result.isConfirmed) {
          persistentNormalEvents.value = [];
          persistentDpolEvents.value = [];
          persistentIntEvents.value = [];
          persistentInstEvents.value = [];
          
          Swal.fire({
            title: 'Cleared!',
            text: 'All accumulated event data has been cleared.',
            icon: 'success',
            confirmButtonText: 'OK',
            timer: 2000
          });
        }
      });
    };

    // Load alarm logs from backend
    const loadAlarmLogs = async () => {
      try {
        alarmLoading.value = true;
        
        const BACKEND_URL = (import.meta.env.VITE_SUBTRONICS_API_URL || 'http://localhost:3002').replace(/\/$/, '');
        
        const params = new URLSearchParams({
          start_date: startDate.value,
          end_date: endDate.value,
          limit: '1000'
        });
        
        if (selectedDevice.value) {
          params.append('device_id', selectedDevice.value);
        }
        
        if (alarmSeverityFilter.value) {
          params.append('severity', alarmSeverityFilter.value);
        }
        
        if (alarmTypeFilter.value) {
          params.append('alarm_type', alarmTypeFilter.value);
        }
        
        console.log('📊 Loading alarm logs:', params.toString());
        
        const response = await fetch(`${BACKEND_URL}/alarm-logs?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        alarmLogs.value = data.logs || [];
        
        console.log('✅ Loaded', alarmLogs.value.length, 'alarm logs');
        
        // Load statistics
        await loadAlarmStatistics();
        
      } catch (error: any) {
        console.error('❌ Error loading alarm logs:', error);
        alarmLogs.value = [];
        
        // Don't show error if backend is not available (optional feature)
        if (!error.message.includes('Failed to fetch')) {
          Swal.fire({
            title: 'Error Loading Alarms',
            text: error.message || 'Failed to load alarm logs.',
            icon: 'error',
            confirmButtonText: 'OK'
          });
        }
      } finally {
        alarmLoading.value = false;
      }
    };

    // Load alarm statistics
    const loadAlarmStatistics = async () => {
      try {
        const BACKEND_URL = (import.meta.env.VITE_SUBTRONICS_API_URL || 'http://localhost:3002').replace(/\/$/, '');
        
        const params = new URLSearchParams({
          start_date: startDate.value,
          end_date: endDate.value
        });
        
        if (selectedDevice.value) {
          params.append('device_id', selectedDevice.value);
        }
        
        const response = await fetch(`${BACKEND_URL}/alarm-logs/statistics?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        alarmStats.value = await response.json();
        
      } catch (error: any) {
        console.error('❌ Error loading alarm statistics:', error);
        alarmStats.value = {};
      }
    };

    // Format alarm type for display
    const formatAlarmType = (type: string) => {
      const typeMap: Record<string, string> = {
        'alarm_level_1': 'Alarm Level A1',
        'alarm_level_2': 'Alarm Level A2',
        'alarm_level_3': 'Alarm Level A3',
        'sensor_fault': 'Sensor Fault'
      };
      return typeMap[type] || type;
    };

    // Get badge class for alarm type
    const getAlarmTypeBadgeClass = (type: string) => {
      const classMap: Record<string, string> = {
        'alarm_level_1': 'badge badge-warning',
        'alarm_level_2': 'badge badge-danger',
        'alarm_level_3': 'badge badge-danger',
        'sensor_fault': 'badge badge-dark'
      };
      return classMap[type] || 'badge badge-secondary';
    };

    // Get badge class for severity
    const getSeverityBadgeClass = (severity: string) => {
      const classMap: Record<string, string> = {
        'warning': 'badge badge-warning',
        'high': 'badge badge-danger',
        'critical': 'badge badge-danger'
      };
      return classMap[severity] || 'badge badge-secondary';
    };
    
    // Get severity icon
    const getSeverityIcon = (severity: string) => {
      const iconMap: Record<string, string> = {
        'warning': 'bi bi-exclamation-triangle-fill',
        'high': 'bi bi-exclamation-diamond-fill',
        'critical': 'bi bi-exclamation-octagon-fill'
      };
      return iconMap[severity] || 'bi bi-info-circle-fill';
    };
    
    // Get alarm row background class
    const getAlarmRowClass = (severity: string) => {
      const classMap: Record<string, string> = {
        'warning': 'table-warning',
        'high': 'table-danger',
        'critical': 'table-danger'
      };
      return classMap[severity] || '';
    };

    // Export alarm logs to CSV
    const exportAlarmLogs = () => {
      try {
        if (alarmLogs.value.length === 0) {
          Swal.fire({
            title: 'No Data',
            text: 'No alarm logs to export.',
            icon: 'warning',
            confirmButtonText: 'OK'
          });
          return;
        }

        const headers = [
          'Timestamp', 'Device Name', 'Serial Number', 'Alarm Type', 'Severity',
          'Message', 'Threshold', 'Current Value', 'Unit', 'Gas Type', 'Status'
        ];

        const rows = alarmLogs.value.map(log => [
          new Date(log.timestamp).toLocaleString(),
          log.device_name,
          log.serial_number,
          formatAlarmType(log.alarm_type),
          log.severity.toUpperCase(),
          log.message,
          log.threshold || '-',
          log.current_value !== undefined ? log.current_value : '-',
          log.unit || '-',
          log.gas_type || '-',
          log.acknowledged ? 'Acknowledged' : 'Pending'
        ]);

        const csvContent = [
          headers.map(h => `"${h}"`).join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `alarm_logs_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        Swal.fire({
          title: 'Export Successful!',
          html: `
            <div class="text-center">
              <i class="bi bi-check-circle text-success" style="font-size: 3rem;"></i>
              <p class="mt-3">Exported ${alarmLogs.value.length} alarm logs</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'OK',
          timer: 3000
        });
      } catch (error: any) {
        console.error('❌ Alarm export error:', error);
        Swal.fire({
          title: 'Export Failed',
          text: error.message || 'Failed to export alarm logs.',
          icon: 'error',
          confirmButtonText: 'OK'
        });
      }
    };

    // Initialize
    onMounted(async () => {
      console.log('📊 Reports module initialized');
      await loadDevices();
      await loadTelemetryData();
      await loadAlarmLogs();
    });

    // Event handler for chart device filter change
    const onChartDeviceFilterChange = (deviceId: string) => {
      selectedDevice.value = deviceId;
      loadTelemetryData();
    };

    return {
      // Export functions
      exportPDF,
      exportToExcel,
      exportEventReport,
      clearAccumulatedEvents,
      exportLoading,
      exportAlarmLogs,
      
      // Data and state
      telemetryData,
      devices,
      selectedDevice,
      selectedMode,
      selectedEventFilter,
      startDate,
      endDate,
      dataLimit,
      loading,
      
      // Alarm logs
      alarmLogs,
      alarmLoading,
      alarmSeverityFilter,
      alarmTypeFilter,
      alarmStats,
      
      // Computed
      totalRecords,
      uniqueDevices,
      dateRangeDisplay,
      lastUpdated,
      dataFields,
      displayedData,
      normalEvents,
      dpolEvents,
      intEvents,
      instEvents,
      filteredEvents,
      
      // Functions
      loadTelemetryData,
      loadAlarmLogs,
      formatDate,
      formatTime,
      formatDataValue,
      formatFieldName,
      formatLocation,
      getDataField,
      getEventBadgeClass,
      getEventValue,
      getEventTypeName,
      getEventTypeClass,
      formatAlarmType,
      getAlarmTypeBadgeClass,
      getSeverityBadgeClass,
      getSeverityIcon,
      getAlarmRowClass,
      onChartDeviceFilterChange
    };
  },
});
</script>

<style scoped>
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>