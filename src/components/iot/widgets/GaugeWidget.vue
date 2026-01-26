<template>
  <BaseWidget
    :widget="widget"
    :value="value"
    :previous-value="previousValue"
    :last-update="lastUpdate"
    :loading="loading"
    :show-trend="showTrend"
  >
    <template #default="{ formattedValue, severity }">
      <div class="gauge-widget-content">
        <!-- Gauge SVG -->
        <div class="gauge-container">
          <svg 
            :width="gaugeSize" 
            :height="gaugeSize * 0.6" 
            class="gauge-svg"
            :viewBox="`0 0 ${gaugeSize} ${gaugeSize * 0.6}`"
          >
            <!-- Background Arc -->
            <path
              :d="backgroundArcPath"
              :stroke="backgroundStroke"
              :stroke-width="strokeWidth"
              fill="none"
              class="gauge-background"
            />
            
            <!-- Progress Arc -->
            <path
              :d="progressArcPath"
              :stroke="progressStroke"
              :stroke-width="strokeWidth"
              fill="none"
              class="gauge-progress"
              :style="{ 
                strokeDasharray: `${progressLength} ${totalLength}`,
                strokeDashoffset: 0
              }"
            />
            
            <!-- Center Value -->
            <text
              :x="gaugeSize / 2"
              :y="gaugeSize * 0.45"
              text-anchor="middle"
              class="gauge-value"
              :class="`text-${severity}`"
            >
              {{ formattedValue }}
            </text>
            
            <!-- Unit -->
            <text
              v-if="widget.unit"
              :x="gaugeSize / 2"
              :y="gaugeSize * 0.52"
              text-anchor="middle"
              class="gauge-unit"
            >
              {{ widget.unit }}
            </text>
          </svg>
        </div>

        <!-- Min/Max Labels -->
        <div class="gauge-labels">
          <span class="gauge-min">{{ widget.min ?? 0 }}</span>
          <span class="gauge-max">{{ widget.max ?? 100 }}</span>
        </div>

        <!-- Severity Zones -->
        <div class="severity-zones" v-if="widget.severityLevels">
          <div class="zone-indicators">
            <div class="zone safe">
              <span class="zone-dot bg-success"></span>
              <span class="zone-label">Safe</span>
            </div>
            <div class="zone warning">
              <span class="zone-dot bg-warning"></span>
              <span class="zone-label">Warning</span>
            </div>
            <div class="zone critical">
              <span class="zone-dot bg-danger"></span>
              <span class="zone-label">Critical</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </BaseWidget>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BaseWidget from './BaseWidget.vue';
import type { WidgetConfig } from '@/types/deviceTemplate.types';

interface Props {
  widget: WidgetConfig;
  value: number;
  previousValue?: number;
  lastUpdate?: string;
  loading?: boolean;
  showTrend?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showTrend: true,
  size: 'md'
});

// Gauge dimensions
const gaugeSize = computed(() => {
  switch (props.size) {
    case 'sm': return 120;
    case 'lg': return 200;
    default: return 160;
  }
});

const strokeWidth = computed(() => {
  switch (props.size) {
    case 'sm': return 8;
    case 'lg': return 16;
    default: return 12;
  }
});

// Gauge calculations
const radius = computed(() => (gaugeSize.value - strokeWidth.value) / 2);
const centerX = computed(() => gaugeSize.value / 2);
const centerY = computed(() => gaugeSize.value / 2);

// Arc paths (semicircle from -90° to 90°)
const startAngle = -Math.PI / 2; // -90 degrees
const endAngle = Math.PI / 2;    // 90 degrees

const backgroundArcPath = computed(() => {
  const x1 = centerX.value + radius.value * Math.cos(startAngle);
  const y1 = centerY.value + radius.value * Math.sin(startAngle);
  const x2 = centerX.value + radius.value * Math.cos(endAngle);
  const y2 = centerY.value + radius.value * Math.sin(endAngle);
  
  return `M ${x1} ${y1} A ${radius.value} ${radius.value} 0 0 1 ${x2} ${y2}`;
});

// Progress calculation
const minValue = computed(() => props.widget.min ?? 0);
const maxValue = computed(() => props.widget.max ?? 100);
const normalizedValue = computed(() => {
  const range = maxValue.value - minValue.value;
  const clampedValue = Math.max(minValue.value, Math.min(maxValue.value, props.value));
  return (clampedValue - minValue.value) / range;
});

const progressAngle = computed(() => {
  return startAngle + (endAngle - startAngle) * normalizedValue.value;
});

const progressArcPath = computed(() => {
  const x1 = centerX.value + radius.value * Math.cos(startAngle);
  const y1 = centerY.value + radius.value * Math.sin(startAngle);
  const x2 = centerX.value + radius.value * Math.cos(progressAngle.value);
  const y2 = centerY.value + radius.value * Math.sin(progressAngle.value);
  
  const largeArcFlag = progressAngle.value - startAngle > Math.PI ? 1 : 0;
  
  return `M ${x1} ${y1} A ${radius.value} ${radius.value} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
});

// Arc lengths for stroke-dasharray animation
const totalLength = computed(() => Math.PI * radius.value); // Semicircle circumference
const progressLength = computed(() => totalLength.value * normalizedValue.value);

// Colors based on severity
const backgroundStroke = computed(() => 'var(--bs-gray-300)');
const progressStroke = computed(() => {
  // Calculate severity for color
  if (!props.widget.severityLevels) return 'var(--bs-primary)';
  
  const { safe, warning, critical } = props.widget.severityLevels;
  const numValue = props.value;

  // Parse critical condition
  if (critical.startsWith('>')) {
    const threshold = parseFloat(critical.substring(1));
    if (numValue > threshold) return 'var(--bs-danger)';
  } else if (critical.startsWith('<')) {
    const threshold = parseFloat(critical.substring(1));
    if (numValue < threshold) return 'var(--bs-danger)';
  }

  // Parse warning condition
  if (warning.includes('-')) {
    const [min, max] = warning.split('-').map(s => parseFloat(s));
    if (numValue >= min && numValue <= max) return 'var(--bs-warning)';
  } else if (warning.startsWith('>')) {
    const threshold = parseFloat(warning.substring(1));
    if (numValue > threshold) return 'var(--bs-warning)';
  } else if (warning.startsWith('<')) {
    const threshold = parseFloat(warning.substring(1));
    if (numValue < threshold) return 'var(--bs-warning)';
  }

  return 'var(--bs-success)';
});
</script>

<style scoped lang="scss">
.gauge-widget-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.gauge-container {
  position: relative;
  margin-bottom: 1rem;
}

.gauge-svg {
  .gauge-background {
    opacity: 0.3;
  }

  .gauge-progress {
    transition: stroke-dasharray 0.5s ease-in-out;
    stroke-linecap: round;
  }

  .gauge-value {
    font-size: 1.5rem;
    font-weight: 700;
    fill: var(--bs-gray-900);

    &.text-safe {
      fill: var(--bs-success);
    }

    &.text-warning {
      fill: var(--bs-warning);
    }

    &.text-critical {
      fill: var(--bs-danger);
    }
  }

  .gauge-unit {
    font-size: 0.75rem;
    font-weight: 500;
    fill: var(--bs-gray-600);
  }
}

.gauge-labels {
  display: flex;
  justify-content: space-between;
  width: 100%;
  font-size: 0.75rem;
  color: var(--bs-gray-600);
  margin-bottom: 0.75rem;

  .gauge-min,
  .gauge-max {
    font-weight: 500;
  }
}

.severity-zones {
  .zone-indicators {
    display: flex;
    gap: 1rem;
    justify-content: center;

    .zone {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;

      .zone-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }

      .zone-label {
        color: var(--bs-gray-600);
        font-weight: 500;
      }
    }
  }
}

// Dark mode support
[data-bs-theme="dark"] {
  .gauge-svg {
    .gauge-value {
      fill: var(--bs-gray-100);

      &.text-safe {
        fill: var(--bs-success);
      }

      &.text-warning {
        fill: var(--bs-warning);
      }

      &.text-critical {
        fill: var(--bs-danger);
      }
    }

    .gauge-unit {
      fill: var(--bs-gray-400);
    }
  }

  .gauge-labels {
    color: var(--bs-gray-400);
  }

  .severity-zones .zone .zone-label {
    color: var(--bs-gray-400);
  }
}

// Responsive sizing
@media (max-width: 768px) {
  .severity-zones .zone-indicators {
    gap: 0.5rem;
    
    .zone {
      font-size: 0.625rem;
    }
  }
}
</style>