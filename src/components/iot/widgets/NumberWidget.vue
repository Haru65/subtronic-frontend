<template>
  <BaseWidget
    :widget="widget"
    :value="value"
    :previous-value="previousValue"
    :last-update="lastUpdate"
    :loading="loading"
    :show-trend="showTrend"
  >
    <template #default="{ formattedValue, severity, trend }">
      <div class="number-widget-content">
        <!-- Main Value Display -->
        <div class="number-display" :class="`severity-${severity}`">
          <div class="number-value">
            {{ formattedValue }}
            <span v-if="widget.unit" class="number-unit">{{ widget.unit }}</span>
          </div>
          
          <!-- Trend Arrow -->
          <div v-if="trend !== undefined && showTrend" class="trend-display" :class="getTrendClass(trend)">
            <i :class="getTrendIcon(trend)"></i>
            <span class="trend-value">{{ Math.abs(trend).toFixed(1) }}%</span>
          </div>
        </div>

        <!-- Progress Bar (if min/max defined) -->
        <div v-if="showProgressBar" class="progress-container">
          <div class="progress" style="height: 6px;">
            <div
              class="progress-bar"
              :class="getProgressBarClass(severity)"
              :style="{ width: `${progressPercentage}%` }"
              role="progressbar"
            ></div>
          </div>
          <div class="progress-labels">
            <small class="text-muted">{{ widget.min ?? 0 }}</small>
            <small class="text-muted">{{ widget.max ?? 100 }}</small>
          </div>
        </div>

        <!-- Severity Status -->
        <div class="severity-status">
          <span class="severity-badge" :class="`badge-${severity}`">
            <i :class="getSeverityIcon(severity)"></i>
            {{ getSeverityLabel(severity) }}
          </span>
        </div>

        <!-- Threshold Indicators -->
        <div v-if="widget.severityLevels" class="threshold-indicators">
          <div class="threshold-item" v-for="(threshold, level) in parsedThresholds" :key="level">
            <span class="threshold-dot" :class="`dot-${level}`"></span>
            <span class="threshold-label">{{ level }}: {{ threshold }}</span>
          </div>
        </div>
      </div>
    </template>
  </BaseWidget>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BaseWidget from './BaseWidget.vue';
import type { WidgetConfig, SeverityLevel } from '@/types/deviceTemplate.types';

interface Props {
  widget: WidgetConfig;
  value: number;
  previousValue?: number;
  lastUpdate?: string;
  loading?: boolean;
  showTrend?: boolean;
  showProgress?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showTrend: true,
  showProgress: true
});

/**
 * Show progress bar if min/max are defined and showProgress is true
 */
const showProgressBar = computed(() => {
  return props.showProgress && 
         props.widget.min !== undefined && 
         props.widget.max !== undefined;
});

/**
 * Calculate progress percentage for progress bar
 */
const progressPercentage = computed(() => {
  if (!showProgressBar.value) return 0;
  
  const min = props.widget.min!;
  const max = props.widget.max!;
  const range = max - min;
  const clampedValue = Math.max(min, Math.min(max, props.value));
  
  return ((clampedValue - min) / range) * 100;
});

/**
 * Parse severity thresholds for display
 */
const parsedThresholds = computed(() => {
  if (!props.widget.severityLevels) return {};
  
  return {
    safe: props.widget.severityLevels.safe,
    warning: props.widget.severityLevels.warning,
    critical: props.widget.severityLevels.critical
  };
});

/**
 * Get trend CSS class
 */
const getTrendClass = (trend: number) => {
  if (trend > 0) return 'trend-up';
  if (trend < 0) return 'trend-down';
  return 'trend-neutral';
};

/**
 * Get trend icon
 */
const getTrendIcon = (trend: number) => {
  if (trend > 0) return 'bi bi-arrow-up';
  if (trend < 0) return 'bi bi-arrow-down';
  return 'bi bi-dash';
};

/**
 * Get progress bar class based on severity
 */
const getProgressBarClass = (severity: SeverityLevel) => {
  switch (severity) {
    case 'safe': return 'bg-success';
    case 'warning': return 'bg-warning';
    case 'critical': return 'bg-danger';
    default: return 'bg-primary';
  }
};

/**
 * Get severity icon
 */
const getSeverityIcon = (severity: SeverityLevel) => {
  switch (severity) {
    case 'safe': return 'bi bi-check-circle-fill';
    case 'warning': return 'bi bi-exclamation-triangle-fill';
    case 'critical': return 'bi bi-x-circle-fill';
    default: return 'bi bi-info-circle-fill';
  }
};

/**
 * Get severity label
 */
const getSeverityLabel = (severity: SeverityLevel) => {
  switch (severity) {
    case 'safe': return 'Normal';
    case 'warning': return 'Warning';
    case 'critical': return 'Critical';
    default: return 'Unknown';
  }
};
</script>

<style scoped lang="scss">
.number-widget-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 1rem;
}

.number-display {
  text-align: center;
  position: relative;

  .number-value {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1;
    transition: color 0.3s ease;

    .number-unit {
      font-size: 1rem;
      font-weight: 500;
      color: var(--bs-gray-600);
      margin-left: 0.25rem;
    }
  }

  .trend-display {
    position: absolute;
    top: -0.5rem;
    right: -1rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: var(--bs-border-radius-pill);
    background: var(--bs-gray-100);

    &.trend-up {
      color: var(--bs-success);
      background: rgba(var(--bs-success-rgb), 0.1);
    }

    &.trend-down {
      color: var(--bs-danger);
      background: rgba(var(--bs-danger-rgb), 0.1);
    }

    &.trend-neutral {
      color: var(--bs-gray-600);
    }
  }

  // Severity-based value colors
  &.severity-safe .number-value {
    color: var(--bs-success);
  }

  &.severity-warning .number-value {
    color: var(--bs-warning);
  }

  &.severity-critical .number-value {
    color: var(--bs-danger);
    animation: pulse-critical 2s infinite;
  }
}

.progress-container {
  width: 100%;

  .progress {
    border-radius: var(--bs-border-radius-pill);
    background-color: var(--bs-gray-200);
  }

  .progress-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 0.25rem;
  }
}

.severity-status {
  .severity-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.75rem;
    border-radius: var(--bs-border-radius-pill);
    font-size: 0.75rem;
    font-weight: 600;

    &.badge-safe {
      color: var(--bs-success);
      background: rgba(var(--bs-success-rgb), 0.1);
      border: 1px solid rgba(var(--bs-success-rgb), 0.3);
    }

    &.badge-warning {
      color: var(--bs-warning);
      background: rgba(var(--bs-warning-rgb), 0.1);
      border: 1px solid rgba(var(--bs-warning-rgb), 0.3);
    }

    &.badge-critical {
      color: var(--bs-danger);
      background: rgba(var(--bs-danger-rgb), 0.1);
      border: 1px solid rgba(var(--bs-danger-rgb), 0.3);
    }
  }
}

.threshold-indicators {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;

  .threshold-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;

    .threshold-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;

      &.dot-safe {
        background: var(--bs-success);
      }

      &.dot-warning {
        background: var(--bs-warning);
      }

      &.dot-critical {
        background: var(--bs-danger);
      }
    }

    .threshold-label {
      color: var(--bs-gray-600);
      font-weight: 500;
    }
  }
}

@keyframes pulse-critical {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

// Dark mode support
[data-bs-theme="dark"] {
  .number-display {
    .number-value .number-unit {
      color: var(--bs-gray-400);
    }

    .trend-display {
      background: var(--bs-gray-800);

      &.trend-neutral {
        color: var(--bs-gray-400);
      }
    }
  }

  .progress-container .progress {
    background-color: var(--bs-gray-700);
  }

  .threshold-indicators .threshold-item .threshold-label {
    color: var(--bs-gray-400);
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .number-display {
    .number-value {
      font-size: 2rem;
    }

    .trend-display {
      position: static;
      margin-top: 0.5rem;
    }
  }

  .threshold-indicators {
    font-size: 0.625rem;
  }
}
</style>