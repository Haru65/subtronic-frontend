<template>
  <BaseWidget
    :widget="widget"
    :value="value"
    :previous-value="previousValue"
    :last-update="lastUpdate"
    :loading="loading"
    :show-trend="false"
  >
    <template #default="{ severity }">
      <div class="status-widget-content">
        <!-- Status Icon -->
        <div class="status-icon-container" :class="`status-${severity}`">
          <div class="status-icon-wrapper">
            <i :class="statusIcon" class="status-icon"></i>
          </div>
          <div class="status-pulse" v-if="severity === 'critical'"></div>
        </div>

        <!-- Status Text -->
        <div class="status-text">
          <div class="status-value" :class="`text-${severity}`">
            {{ statusText }}
          </div>
          <div class="status-description" v-if="statusDescription">
            {{ statusDescription }}
          </div>
        </div>

        <!-- Status Details -->
        <div class="status-details" v-if="showDetails">
          <div class="detail-item" v-for="detail in statusDetails" :key="detail.key">
            <span class="detail-label">{{ detail.label }}:</span>
            <span class="detail-value" :class="detail.class">{{ detail.value }}</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="status-actions" v-if="showActions && statusActions.length > 0">
          <button
            v-for="action in statusActions"
            :key="action.key"
            class="btn btn-sm"
            :class="action.class"
            @click="$emit('action', action.key)"
            :disabled="loading"
          >
            <i :class="action.icon" class="me-1"></i>
            {{ action.label }}
          </button>
        </div>
      </div>
    </template>
  </BaseWidget>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BaseWidget from './BaseWidget.vue';
import type { WidgetConfig, SeverityLevel } from '@/types/deviceTemplate.types';

interface StatusDetail {
  key: string;
  label: string;
  value: string;
  class?: string;
}

interface StatusAction {
  key: string;
  label: string;
  icon: string;
  class: string;
}

interface Props {
  widget: WidgetConfig;
  value: string | boolean | number;
  previousValue?: string | boolean | number;
  lastUpdate?: string;
  loading?: boolean;
  showDetails?: boolean;
  showActions?: boolean;
  details?: StatusDetail[];
  actions?: StatusAction[];
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showDetails: true,
  showActions: true,
  details: () => [],
  actions: () => []
});

const emit = defineEmits<{
  action: [actionKey: string];
}>();

/**
 * Convert value to status text
 */
const statusText = computed(() => {
  if (typeof props.value === 'boolean') {
    return props.value ? 'Active' : 'Inactive';
  }
  
  if (typeof props.value === 'number') {
    // For numeric status codes
    switch (props.value) {
      case 0: return 'Offline';
      case 1: return 'Online';
      case 2: return 'Warning';
      case 3: return 'Critical';
      default: return `Status ${props.value}`;
    }
  }
  
  return String(props.value);
});

/**
 * Get status description based on value
 */
const statusDescription = computed(() => {
  if (typeof props.value === 'boolean') {
    return props.value ? 'System is operational' : 'System is not responding';
  }
  
  if (typeof props.value === 'number') {
    switch (props.value) {
      case 0: return 'Device is not responding';
      case 1: return 'All systems normal';
      case 2: return 'Attention required';
      case 3: return 'Immediate action needed';
      default: return 'Status unknown';
    }
  }
  
  return '';
});

/**
 * Get status icon based on severity and value
 */
const statusIcon = computed(() => {
  if (typeof props.value === 'boolean') {
    return props.value ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill';
  }
  
  if (typeof props.value === 'number') {
    switch (props.value) {
      case 0: return 'bi bi-x-circle-fill';
      case 1: return 'bi bi-check-circle-fill';
      case 2: return 'bi bi-exclamation-triangle-fill';
      case 3: return 'bi bi-exclamation-octagon-fill';
      default: return 'bi bi-question-circle-fill';
    }
  }
  
  // Default icon based on widget configuration
  return props.widget.icon || 'bi bi-info-circle-fill';
});

/**
 * Get status details for display
 */
const statusDetails = computed(() => {
  if (props.details && props.details.length > 0) {
    return props.details;
  }
  
  // Default details based on value type
  const details: StatusDetail[] = [];
  
  if (typeof props.value === 'boolean') {
    details.push({
      key: 'state',
      label: 'State',
      value: props.value ? 'ON' : 'OFF',
      class: props.value ? 'text-success' : 'text-danger'
    });
  }
  
  if (props.lastUpdate) {
    details.push({
      key: 'lastUpdate',
      label: 'Last Update',
      value: new Date(props.lastUpdate).toLocaleTimeString(),
      class: 'text-muted'
    });
  }
  
  return details;
});

/**
 * Get status actions
 */
const statusActions = computed(() => {
  if (props.actions && props.actions.length > 0) {
    return props.actions;
  }
  
  // Default actions based on value type
  const actions: StatusAction[] = [];
  
  if (typeof props.value === 'boolean') {
    if (props.value) {
      actions.push({
        key: 'stop',
        label: 'Stop',
        icon: 'bi bi-stop-fill',
        class: 'btn-outline-danger'
      });
    } else {
      actions.push({
        key: 'start',
        label: 'Start',
        icon: 'bi bi-play-fill',
        class: 'btn-outline-success'
      });
    }
  }
  
  actions.push({
    key: 'refresh',
    label: 'Refresh',
    icon: 'bi bi-arrow-clockwise',
    class: 'btn-outline-primary'
  });
  
  return actions;
});
</script>

<style scoped lang="scss">
.status-widget-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 1rem;
}

.status-icon-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;

  .status-icon-wrapper {
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 2;

    .status-icon {
      font-size: 2rem;
    }
  }

  .status-pulse {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    z-index: 1;
  }

  // Status-specific styling
  &.status-safe {
    .status-icon-wrapper {
      background: rgba(var(--bs-success-rgb), 0.1);
      border: 2px solid var(--bs-success);

      .status-icon {
        color: var(--bs-success);
      }
    }
  }

  &.status-warning {
    .status-icon-wrapper {
      background: rgba(var(--bs-warning-rgb), 0.1);
      border: 2px solid var(--bs-warning);

      .status-icon {
        color: var(--bs-warning);
      }
    }
  }

  &.status-critical {
    .status-icon-wrapper {
      background: rgba(var(--bs-danger-rgb), 0.1);
      border: 2px solid var(--bs-danger);

      .status-icon {
        color: var(--bs-danger);
      }
    }

    .status-pulse {
      background: var(--bs-danger);
      animation: pulse-status 2s infinite;
    }
  }
}

.status-text {
  text-align: center;

  .status-value {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 0.25rem;

    &.text-safe {
      color: var(--bs-success);
    }

    &.text-warning {
      color: var(--bs-warning);
    }

    &.text-critical {
      color: var(--bs-danger);
    }
  }

  .status-description {
    font-size: 0.875rem;
    color: var(--bs-gray-600);
    line-height: 1.4;
  }
}

.status-details {
  width: 100%;
  border-top: 1px solid var(--bs-border-color);
  padding-top: 1rem;

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0;
    font-size: 0.875rem;

    .detail-label {
      color: var(--bs-gray-600);
      font-weight: 500;
    }

    .detail-value {
      font-weight: 600;
    }
  }
}

.status-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
  border-top: 1px solid var(--bs-border-color);
  padding-top: 1rem;

  .btn {
    flex: 1;
    min-width: auto;
  }
}

@keyframes pulse-status {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 0.3;
    transform: translate(-50%, -50%) scale(1.2);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

// Dark mode support
[data-bs-theme="dark"] {
  .status-text .status-description {
    color: var(--bs-gray-400);
  }

  .status-details .detail-item .detail-label {
    color: var(--bs-gray-400);
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .status-icon-container {
    .status-icon-wrapper {
      width: 3rem;
      height: 3rem;

      .status-icon {
        font-size: 1.5rem;
      }
    }

    .status-pulse {
      width: 3rem;
      height: 3rem;
    }
  }

  .status-text .status-value {
    font-size: 1.125rem;
  }

  .status-actions {
    flex-direction: column;

    .btn {
      flex: none;
    }
  }
}
</style>