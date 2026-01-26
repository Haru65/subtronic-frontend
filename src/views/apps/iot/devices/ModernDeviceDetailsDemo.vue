<template>
  <div class="modern-device-demo">
    <!-- Demo Header -->
    <div class="demo-header">
      <div class="container-fluid">
        <div class="row align-items-center">
          <div class="col">
            <h1 class="demo-title">
              <i class="bi bi-lightning-charge me-2"></i>
              Modern Device Details UI Demo
            </h1>
            <p class="demo-subtitle">
              Template-driven, enterprise-grade device management interface
            </p>
          </div>
          <div class="col-auto">
            <div class="demo-controls">
              <div class="btn-group" role="group">
                <button
                  v-for="deviceType in availableDeviceTypes"
                  :key="deviceType.key"
                  type="button"
                  class="btn"
                  :class="selectedDeviceType === deviceType.key ? 'btn-primary' : 'btn-outline-primary'"
                  @click="selectDeviceType(deviceType.key)"
                >
                  <i :class="deviceType.icon" class="me-1"></i>
                  {{ deviceType.label }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Demo Features -->
    <div class="demo-features">
      <div class="container-fluid">
        <div class="row g-4">
          <div class="col-md-3">
            <div class="feature-card">
              <div class="feature-icon">
                <i class="bi bi-palette"></i>
              </div>
              <h5>Template-Driven</h5>
              <p>Dynamic UI generation based on device templates</p>
            </div>
          </div>
          <div class="col-md-3">
            <div class="feature-card">
              <div class="feature-icon">
                <i class="bi bi-speedometer2"></i>
              </div>
              <h5>Real-time Widgets</h5>
              <p>Gauges, charts, and status indicators with live data</p>
            </div>
          </div>
          <div class="col-md-3">
            <div class="feature-card">
              <div class="feature-icon">
                <i class="bi bi-moon-stars"></i>
              </div>
              <h5>Dark Mode Ready</h5>
              <p>Full dark mode support with smooth transitions</p>
            </div>
          </div>
          <div class="col-md-3">
            <div class="feature-card">
              <div class="feature-icon">
                <i class="bi bi-phone"></i>
              </div>
              <h5>Mobile Responsive</h5>
              <p>Optimized for all screen sizes and touch devices</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Device Details Component -->
    <div class="demo-content">
      <DeviceDetailsModern :device-id="demoDeviceId" />
    </div>

    <!-- Demo Footer -->
    <div class="demo-footer">
      <div class="container-fluid">
        <div class="row">
          <div class="col-md-6">
            <h4>Supported Device Types</h4>
            <ul class="device-types-list">
              <li v-for="deviceType in availableDeviceTypes" :key="deviceType.key">
                <i :class="deviceType.icon" class="me-2"></i>
                <strong>{{ deviceType.label }}:</strong> {{ deviceType.description }}
              </li>
            </ul>
          </div>
          <div class="col-md-6">
            <h4>Key Features</h4>
            <ul class="features-list">
              <li><i class="bi bi-check-circle text-success me-2"></i>Dynamic widget rendering</li>
              <li><i class="bi bi-check-circle text-success me-2"></i>Severity-based color coding</li>
              <li><i class="bi bi-check-circle text-success me-2"></i>Real-time telemetry updates</li>
              <li><i class="bi bi-check-circle text-success me-2"></i>Interactive device controls</li>
              <li><i class="bi bi-check-circle text-success me-2"></i>Settings management</li>
              <li><i class="bi bi-check-circle text-success me-2"></i>Alert & fault logging</li>
              <li><i class="bi bi-check-circle text-success me-2"></i>Connection status monitoring</li>
              <li><i class="bi bi-check-circle text-success me-2"></i>Template-based extensibility</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import DeviceDetailsModern from '@/components/iot/DeviceDetailsModern.vue';
import { deviceTemplateService } from '@/services/deviceTemplate.service';

// Demo state
const selectedDeviceType = ref('gas_detector');

// Available device types for demo
const availableDeviceTypes = computed(() => [
  {
    key: 'gas_detector',
    label: 'Gas Detector',
    icon: 'bi bi-shield-exclamation',
    description: 'Multi-gas detection with real-time monitoring and alarm capabilities'
  },
  {
    key: 'pressure_sensor',
    label: 'Pressure Sensor',
    icon: 'bi bi-speedometer2',
    description: 'High-precision pressure monitoring with trend analysis'
  },
  {
    key: 'cathodic_protection',
    label: 'Cathodic Protection',
    icon: 'bi bi-shield-check',
    description: 'Corrosion protection monitoring with potential and current measurements'
  },
  {
    key: 'generic',
    label: 'Generic Device',
    icon: 'bi bi-cpu',
    description: 'Generic IoT device with basic monitoring capabilities'
  }
]);

// Demo device ID based on selected type
const demoDeviceId = computed(() => {
  switch (selectedDeviceType.value) {
    case 'gas_detector': return 'GD001';
    case 'pressure_sensor': return 'PS001';
    case 'cathodic_protection': return 'CP001';
    default: return 'DEV001';
  }
});

// Methods
const selectDeviceType = (deviceType: string) => {
  selectedDeviceType.value = deviceType;
};
</script>

<style scoped lang="scss">
.modern-device-demo {
  min-height: 100vh;
  background: var(--bs-gray-50);
}

.demo-header {
  background: linear-gradient(135deg, var(--bs-primary) 0%, var(--bs-info) 100%);
  color: white;
  padding: 2rem 0;
  margin-bottom: 2rem;

  .demo-title {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .demo-subtitle {
    font-size: 1.125rem;
    opacity: 0.9;
    margin: 0;
  }

  .demo-controls {
    .btn-group .btn {
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
      border-color: rgba(255, 255, 255, 0.3);
      
      &.btn-outline-primary {
        color: white;
        border-color: rgba(255, 255, 255, 0.3);
        
        &:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.5);
        }
      }
      
      &.btn-primary {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
      }
    }
  }
}

.demo-features {
  margin-bottom: 2rem;

  .feature-card {
    background: var(--bs-white);
    border: 1px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius-lg);
    padding: 2rem;
    text-align: center;
    height: 100%;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 0.75rem 2rem rgba(0, 0, 0, 0.1);
    }

    .feature-icon {
      width: 4rem;
      height: 4rem;
      background: linear-gradient(135deg, var(--bs-primary), var(--bs-info));
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      margin: 0 auto 1rem;
    }

    h5 {
      font-weight: 600;
      color: var(--bs-gray-900);
      margin-bottom: 0.75rem;
    }

    p {
      color: var(--bs-gray-600);
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
    }
  }
}

.demo-content {
  margin-bottom: 3rem;
}

.demo-footer {
  background: var(--bs-white);
  border-top: 1px solid var(--bs-border-color);
  padding: 3rem 0;

  h4 {
    font-weight: 600;
    color: var(--bs-gray-900);
    margin-bottom: 1.5rem;
  }

  .device-types-list,
  .features-list {
    list-style: none;
    padding: 0;
    margin: 0;

    li {
      padding: 0.5rem 0;
      color: var(--bs-gray-700);
      font-size: 0.875rem;
      line-height: 1.5;

      strong {
        color: var(--bs-gray-900);
      }
    }
  }

  .features-list li {
    display: flex;
    align-items: center;
  }
}

// Dark mode support
[data-bs-theme="dark"] {
  .modern-device-demo {
    background: var(--bs-gray-900);
  }

  .demo-features .feature-card {
    background: var(--bs-gray-800);
    border-color: var(--bs-gray-700);

    h5 {
      color: var(--bs-gray-100);
    }

    p {
      color: var(--bs-gray-400);
    }
  }

  .demo-footer {
    background: var(--bs-gray-800);
    border-top-color: var(--bs-gray-700);

    h4 {
      color: var(--bs-gray-100);
    }

    .device-types-list li,
    .features-list li {
      color: var(--bs-gray-300);

      strong {
        color: var(--bs-gray-100);
      }
    }
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .demo-header {
    .demo-title {
      font-size: 2rem;
    }

    .demo-controls .btn-group {
      flex-direction: column;
      width: 100%;

      .btn {
        border-radius: var(--bs-border-radius) !important;
        margin-bottom: 0.25rem;
      }
    }
  }

  .demo-features .feature-card {
    margin-bottom: 1rem;
  }
}
</style>