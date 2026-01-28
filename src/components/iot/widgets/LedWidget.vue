<template>
  <BaseWidget
    :widget="widget"
    :value="value"
    :previous-value="previousValue"
    :last-update="lastUpdate"
    :loading="loading"
    @action="$emit('action', $event)"
  >
    <template #default>
      <div class="led-widget-content">
        <!-- LED Indicator -->
        <div class="led-container">
          <div 
            class="led-indicator"
            :class="ledClass"
            :style="{ backgroundColor: ledColor }"
          >
            <div class="led-glow" v-if="isOn"></div>
          </div>
        </div>
        
        <!-- Status Text -->
        <div class="led-status">
          <div class="status-text" :class="statusClass">
            {{ statusText }}
          </div>
          <div class="status-description" v-if="widget.description">
            {{ widget.description }}
          </div>
        </div>
        
        <!-- Alarm Level Badge -->
        <div class="alarm-badge" v-if="alarmLevel" :class="`badge-${alarmLevel}`">
          {{ alarmLevel.toUpperCase() }}
        </div>
      </div>
      
      <!-- Footer -->
      <div class="led-footer" v-if="showFooter">
        <small class="text-muted">
          <i class="bi bi-clock me-1"></i>
          {{ formatTime(lastUpdate) }}
        </small>
        <small class="text-muted ms-2" v-if="alarmThreshold">
          Threshold: {{ alarmThreshold }}{{ widget.unit }}
        </small>
      </div>
    </template>
  </BaseWidget>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BaseWidget from './BaseWidget.vue';
import { formatTime } from '@/utils/dateFormatter';
import type { SubtronicsWidgetConfig } from '@/types/subtronics.types';

// Props
interface Props {
  widget: SubtronicsWidgetConfig;
  value: number;
  previousValue?: number;
  lastUpdate: string;
  loading?: boolean;
  alarmLevel?: 'a1' | 'a2' | 'a3';
  alarmThreshold?: number;
  showFooter?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showFooter: true
});

// Emits
defineEmits<{
  action: [action: string];
}>();

// Computed properties
const isOn = computed(() => Number(props.value) >= 1);

const ledClass = computed(() => ({
  'led-on': isOn.value,
  'led-off': !isOn.value,
  'led-blinking': isOn.value && props.alarmLevel === 'a3', // Blink for critical alarms
  [`led-${props.alarmLevel}`]: props.alarmLevel
}));

const ledColor = computed(() => {
  if (!isOn.value) return '#6c757d'; // Gray when off
  
  if (props.alarmLevel) {
    switch (props.alarmLevel) {
      case 'a1': return '#ffc107'; // Yellow
      case 'a2': return '#fd7e14'; // Orange  
      case 'a3': return '#dc3545'; // Red
    }
  }
  
  return props.widget.color || '#28a745'; // Default green
});

const statusText = computed(() => {
  if (props.loading) return 'Loading...';
  
  if (isOn.value) {
    return 'Active';
  }
  
  return 'None';
});

const statusClass = computed(() => ({
  'status-normal': !isOn.value,
  'status-warning': isOn.value && props.alarmLevel === 'a1',
  'status-high': isOn.value && props.alarmLevel === 'a2',
  'status-critical': isOn.value && props.alarmLevel === 'a3',
  'status-active': isOn.value && !props.alarmLevel
}));
</script>

<style scoped lang="scss">
.led-widget-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
}

.led-container {
  flex-shrink: 0;
  position: relative;
}

.led-indicator {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 2px solid rgba(0, 0, 0, 0.1);
  position: relative;
  transition: all 0.3s ease;
  
  &.led-off {
    background-color: #6c757d !important;
    opacity: 0.3;
  }
  
  &.led-on {
    opacity: 1;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    
    .led-glow {
      position: absolute;
      top: -4px;
      left: -4px;
      right: -4px;
      bottom: -4px;
      border-radius: 50%;
      background: inherit;
      opacity: 0.4;
      filter: blur(4px);
      animation: pulse 2s infinite;
    }
  }
  
  &.led-blinking {
    animation: blink 1s infinite;
  }
}

.led-status {
  flex: 1;
  min-width: 0;
}

.status-text {
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  
  &.status-normal {
    color: var(--bs-success);
  }
  
  &.status-warning {
    color: var(--bs-warning);
  }
  
  &.status-high {
    color: var(--bs-orange);
  }
  
  &.status-critical {
    color: var(--bs-danger);
  }
  
  &.status-active {
    color: var(--bs-primary);
  }
}

.status-description {
  font-size: 0.75rem;
  color: var(--bs-gray-600);
  line-height: 1.2;
}

.alarm-badge {
  flex-shrink: 0;
  padding: 0.25rem 0.5rem;
  border-radius: var(--bs-border-radius-pill);
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &.badge-a1 {
    background: rgba(255, 193, 7, 0.2);
    color: #ffc107;
    border: 1px solid rgba(255, 193, 7, 0.3);
  }
  
  &.badge-a2 {
    background: rgba(253, 126, 20, 0.2);
    color: #fd7e14;
    border: 1px solid rgba(253, 126, 20, 0.3);
  }
  
  &.badge-a3 {
    background: rgba(220, 53, 69, 0.2);
    color: #dc3545;
    border: 1px solid rgba(220, 53, 69, 0.3);
  }
}

.led-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.5rem;
  border-top: 1px solid var(--bs-border-color);
  margin-top: 0.5rem;
}

// Animations
@keyframes pulse {
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0.3;
  }
}

// Dark mode support
[data-bs-theme="dark"] {
  .led-indicator {
    border-color: rgba(255, 255, 255, 0.1);
  }
  
  .status-description {
    color: var(--bs-gray-400);
  }
}

// Responsive design
@media (max-width: 576px) {
  .led-widget-content {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }
  
  .led-footer {
    flex-direction: column;
    gap: 0.25rem;
    text-align: center;
  }
}
</style>