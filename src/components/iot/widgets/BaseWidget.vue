<template>
  <div 
    class="base-widget"
    :class="[
      `widget-${widget.widget}`,
      `severity-${severity}`,
      { 'widget-loading': loading }
    ]"
  >
    <!-- Widget Header -->
    <div class="widget-header">
      <div class="widget-icon" v-if="widget.icon">
        <i :class="widget.icon" :style="{ color: widget.color }"></i>
      </div>
      <div class="widget-title">
        <h6 class="mb-0">{{ widget.label }}</h6>
        <small class="text-muted" v-if="lastUpdate">
          {{ formatTime(lastUpdate) }}
        </small>
      </div>
      <div class="widget-status">
        <span 
          class="status-indicator"
          :class="`status-${severity}`"
        ></span>
      </div>
    </div>

    <!-- Widget Content -->
    <div class="widget-content">
      <slot 
        :value="value"
        :formattedValue="formattedValue"
        :severity="severity"
        :trend="trend"
        :widget="widget"
      >
        <!-- Default content if no slot provided -->
        <div class="default-widget-content">
          <div class="widget-value">
            {{ formattedValue }}
            <span v-if="widget.unit" class="widget-unit">{{ widget.unit }}</span>
          </div>
        </div>
      </slot>
    </div>

    <!-- Widget Footer -->
    <div class="widget-footer" v-if="showTrend && trend !== undefined">
      <div class="trend-indicator" :class="trendClass">
        <i :class="trendIcon"></i>
        <span>{{ Math.abs(trend) }}%</span>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="widget-loading-overlay">
      <div class="spinner-border spinner-border-sm text-primary"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { WidgetConfig, SeverityLevel } from '@/types/deviceTemplate.types';
import { formatTime } from '@/utils/dateFormatter';

interface Props {
  widget: WidgetConfig;
  value: number | string | boolean;
  previousValue?: number | string | boolean;
  lastUpdate?: string;
  loading?: boolean;
  showTrend?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showTrend: true
});

/**
 * Format value based on widget configuration
 */
const formattedValue = computed(() => {
  if (typeof props.value === 'number') {
    const decimals = props.widget.decimals ?? 1;
    return props.value.toFixed(decimals);
  }
  return String(props.value);
});

/**
 * Calculate severity based on widget configuration
 */
const severity = computed((): SeverityLevel => {
  if (!props.widget.severityLevels || typeof props.value !== 'number') {
    return 'safe';
  }

  const { safe, warning, critical } = props.widget.severityLevels;
  const numValue = props.value;

  // Parse critical condition
  if (critical.startsWith('>')) {
    const threshold = parseFloat(critical.substring(1));
    if (numValue > threshold) return 'critical';
  } else if (critical.startsWith('<')) {
    const threshold = parseFloat(critical.substring(1));
    if (numValue < threshold) return 'critical';
  }

  // Parse warning condition
  if (warning.includes('-')) {
    const [min, max] = warning.split('-').map(s => parseFloat(s));
    if (numValue >= min && numValue <= max) return 'warning';
  } else if (warning.startsWith('>')) {
    const threshold = parseFloat(warning.substring(1));
    if (numValue > threshold) return 'warning';
  } else if (warning.startsWith('<')) {
    const threshold = parseFloat(warning.substring(1));
    if (numValue < threshold) return 'warning';
  }

  return 'safe';
});

/**
 * Calculate trend percentage
 */
const trend = computed(() => {
  if (typeof props.value !== 'number' || typeof props.previousValue !== 'number') {
    return undefined;
  }
  
  if (props.previousValue === 0) return 0;
  
  return ((props.value - props.previousValue) / props.previousValue) * 100;
});

/**
 * Trend styling
 */
const trendClass = computed(() => {
  if (trend.value === undefined) return '';
  return trend.value > 0 ? 'trend-up' : trend.value < 0 ? 'trend-down' : 'trend-neutral';
});

const trendIcon = computed(() => {
  if (trend.value === undefined) return '';
  return trend.value > 0 ? 'bi bi-arrow-up' : trend.value < 0 ? 'bi bi-arrow-down' : 'bi bi-dash';
});
</script>

<style scoped lang="scss">
.base-widget {
  background: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  padding: 1.5rem;
  position: relative;
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;

  &:hover {
    box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  // Severity-based styling
  &.severity-safe {
    border-left: 4px solid var(--bs-success);
  }

  &.severity-warning {
    border-left: 4px solid var(--bs-warning);
  }

  &.severity-critical {
    border-left: 4px solid var(--bs-danger);
  }

  &.widget-loading {
    opacity: 0.7;
  }
}

.widget-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;

  .widget-icon {
    font-size: 1.5rem;
    opacity: 0.8;
  }

  .widget-title {
    flex: 1;
    
    h6 {
      font-weight: 600;
      color: var(--bs-gray-800);
    }
  }

  .widget-status {
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;

      &.status-safe {
        background: var(--bs-success);
        box-shadow: 0 0 0 2px rgba(var(--bs-success-rgb), 0.3);
      }

      &.status-warning {
        background: var(--bs-warning);
        box-shadow: 0 0 0 2px rgba(var(--bs-warning-rgb), 0.3);
      }

      &.status-critical {
        background: var(--bs-danger);
        box-shadow: 0 0 0 2px rgba(var(--bs-danger-rgb), 0.3);
        animation: pulse-critical 2s infinite;
      }
    }
  }
}

.widget-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;

  .default-widget-content {
    text-align: center;
    width: 100%;

    .widget-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--bs-gray-900);
      line-height: 1;

      .widget-unit {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--bs-gray-600);
        margin-left: 0.25rem;
      }
    }
  }
}

.widget-footer {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--bs-border-color);

  .trend-indicator {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;

    &.trend-up {
      color: var(--bs-success);
    }

    &.trend-down {
      color: var(--bs-danger);
    }

    &.trend-neutral {
      color: var(--bs-gray-500);
    }
  }
}

.widget-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--bs-border-radius-lg);
}

@keyframes pulse-critical {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--bs-danger-rgb), 0.7);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(var(--bs-danger-rgb), 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(var(--bs-danger-rgb), 0);
  }
}

// Dark mode support
[data-bs-theme="dark"] {
  .base-widget {
    .widget-title h6 {
      color: var(--bs-gray-100);
    }

    .default-widget-content .widget-value {
      color: var(--bs-gray-100);
    }
  }

  .widget-loading-overlay {
    background: rgba(0, 0, 0, 0.8);
  }
}
</style>