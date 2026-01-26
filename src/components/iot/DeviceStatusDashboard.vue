<template>
  <div class="card">
    <div class="card-header border-0 pt-6">
      <div class="card-title">
        <h3 class="fw-bold m-0">Device Status Dashboard</h3>
      </div>
      <div class="card-toolbar">
        <div class="d-flex align-items-center gap-3">
          <!-- Legend -->
          <div class="d-flex align-items-center gap-2">
            <span class="badge badge-danger">Critical (3+)</span>
            <span class="badge badge-warning">Warning (2)</span>
            <span class="badge badge-info">Info (1)</span>
            <span class="badge badge-success">All OK</span>
            <span class="badge badge-primary">On Battery</span>
          </div>
        </div>
      </div>
    </div>
    <div class="card-body pt-0">
      <div class="row g-6">
        <div 
          v-for="device in devices" 
          :key="device.id"
          class="col-xl-3 col-lg-4 col-md-6 col-sm-12"
        >
          <div 
            class="card border border-2 cursor-pointer hover-elevate-up"
            :class="getDeviceCardClass(device)"
            @click="openDeviceDetails(device)"
          >
            <div class="card-body text-center p-6">
              <!-- Device Icon -->
              <div class="mb-4">
                <i
                  :class="[getDeviceIcon(device), getDeviceIconColor(device)]"
                  style="font-size: 3rem;"
                ></i>
              </div>
              
              <!-- Device Info -->
              <h5 class="fw-bold mb-2">{{ device.name }}</h5>
              <p class="text-muted mb-3">{{ device.unit_no }}</p>
              <p class="text-muted mb-4">{{ device.location }}</p>
              
              <!-- Alarm Count -->
              <div class="d-flex justify-content-center align-items-center mb-3">
                <span 
                  class="badge fs-6 px-3 py-2"
                  :class="getAlarmBadgeClass(device.alarm_count)"
                >
                  <i class="bi bi-exclamation-triangle me-1"></i>
                  {{ device.alarm_count }} Alarm{{ device.alarm_count !== 1 ? 's' : '' }}
                </span>
              </div>

              <!-- Last Update -->
              <small class="text-muted">
                Updated: {{ formatTime(device.last_update) }}
              </small>

              <!-- PV Values Preview -->
              <div class="mt-3">
                <div class="row g-1">
                  <div class="col-4" v-for="(value, index) in device.pv_preview" :key="index">
                    <div class="bg-light rounded p-1">
                      <small class="fw-bold">PV{{ index + 1 }}</small>
                      <br>
                      <small>{{ value }}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import moment from "moment";
import { formatTime } from "@/utils/dateFormatter";

interface Device {
  id: string;
  name: string;
  unit_no: string;
  location: string;
  alarm_count: number;
  status: 'critical' | 'warning' | 'info' | 'ok' | 'battery';
  device_type: 'sensor' | 'motor' | 'pump' | 'ups' | 'controller';
  last_update: string;
  pv_preview: number[];
}

export default defineComponent({
  name: "device-status-dashboard",
  setup() {
    const devices = ref<Device[]>([
      {
        id: "DEV001",
        name: "Temperature Sensor A",
        unit_no: "U001",
        location: "Room 101",
        alarm_count: 3,
        status: "critical",
        device_type: "sensor",
        last_update: "2025-10-03 14:30:00",
        pv_preview: [85.2, 34.1, 12.5]
      },
      {
        id: "DEV002",
        name: "Pressure Sensor B",
        unit_no: "U002",
        location: "Room 102",
        alarm_count: 2,
        status: "warning",
        device_type: "sensor",
        last_update: "2025-10-03 14:25:00",
        pv_preview: [45.1, 67.2, 23.8]
      },
      {
        id: "DEV003",
        name: "Vibration Motor X",
        unit_no: "U003",
        location: "Factory Floor",
        alarm_count: 1,
        status: "info",
        device_type: "motor",
        last_update: "2025-10-03 14:20:00",
        pv_preview: [12.3, 45.6, 78.9]
      },
      {
        id: "DEV004",
        name: "UPS System 1",
        unit_no: "U004",
        location: "Server Room",
        alarm_count: 0,
        status: "battery",
        device_type: "ups",
        last_update: "2025-10-03 14:15:00",
        pv_preview: [98.5, 87.2, 76.1]
      },
      {
        id: "DEV005",
        name: "Flow Pump Y",
        unit_no: "U005",
        location: "Pipeline 1",
        alarm_count: 0,
        status: "ok",
        device_type: "pump",
        last_update: "2025-10-03 14:10:00",
        pv_preview: [25.4, 78.9, 34.7]
      },
      {
        id: "DEV006",
        name: "Humidity Sensor C",
        unit_no: "U006",
        location: "Storage Unit",
        alarm_count: 0,
        status: "ok",
        device_type: "sensor",
        last_update: "2025-10-03 14:05:00",
        pv_preview: [55.2, 43.1, 67.8]
      }
    ]);

    const getDeviceCardClass = (device: Device) => {
      switch (device.status) {
        case 'critical':
          return 'border-danger';
        case 'warning':
          return 'border-warning';
        case 'info':
          return 'border-info';
        case 'ok':
          return 'border-success';
        case 'battery':
          return 'border-primary';
        default:
          return 'border-gray-300';
      }
    };

    const getDeviceIcon = (device: Device) => {
      switch (device.device_type) {
        case 'sensor':
          return 'bi bi-thermometer-half';
        case 'motor':
          return 'bi bi-gear-fill';
        case 'pump':
          return 'bi bi-droplet-fill';
        case 'ups':
          return 'bi bi-battery-charging';
        case 'controller':
          return 'bi bi-cpu-fill';
        default:
          return 'bi bi-device-hdd';
      }
    };

    const getDeviceIconColor = (device: Device) => {
      switch (device.status) {
        case 'critical':
          return 'text-danger';
        case 'warning':
          return 'text-warning';
        case 'info':
          return 'text-info';
        case 'ok':
          return 'text-success';
        case 'battery':
          return 'text-primary';
        default:
          return 'text-muted';
      }
    };

    const getAlarmBadgeClass = (alarmCount: number) => {
      if (alarmCount >= 3) return 'badge-danger';
      if (alarmCount === 2) return 'badge-warning';
      if (alarmCount === 1) return 'badge-info';
      return 'badge-success';
    };

    const formatTime = (timestamp: string) => {
      return moment(timestamp).format('HH:mm:ss');
    };

    const openDeviceDetails = (device: Device) => {
      // Navigate to device details page
      window.open(`/devices/${device.id}`, '_blank');
    };

    return {
      devices,
      getDeviceCardClass,
      getDeviceIcon,
      getDeviceIconColor,
      getAlarmBadgeClass,
      formatTime,
      openDeviceDetails,
    };
  },
});
</script>

<style scoped>
.hover-elevate-up:hover {
  transform: translateY(-5px);
  transition: transform 0.3s ease;
}

.cursor-pointer {
  cursor: pointer;
}
</style>