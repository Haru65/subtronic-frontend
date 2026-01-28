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
      <div class="gauge-widget-content" :class="`size-${size}`">
        <!-- Half Gauge SVG -->
        <div class="gauge-container">
          <svg 
            :viewBox="`0 0 ${viewBoxWidth} ${viewBoxHeight}`"
            class="gauge-svg"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <!-- Gradient for track -->
              <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="var(--bs-success)" stop-opacity="0.2"/>
                <stop offset="50%" stop-color="var(--bs-warning)" stop-opacity="0.2"/>
                <stop offset="100%" stop-color="var(--bs-danger)" stop-opacity="0.2"/>
              </linearGradient>
              
              <!-- Drop shadow for progress -->
              <filter id="gaugeShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.3"/>
              </filter>
            </defs>
            
            <!-- Background Track (gray) -->
            <path
              :d="arcPath"
              fill="none"
              :stroke="'var(--gauge-track-bg, #e5e7eb)'"
              :stroke-width="strokeWidth"
              stroke-linecap="round"
              class="gauge-track-bg"
            />
            
            <!-- Colored Zone Track (gradient background) -->
            <path
              :d="arcPath"
              fill="none"
              stroke="url(#trackGradient)"
              :stroke-width="strokeWidth"
              stroke-linecap="round"
              class="gauge-track-zones"
            />
            
            <!-- Progress Arc -->
            <path
              :d="arcPath"
              fill="none"
              :stroke="progressColor"
              :stroke-width="strokeWidth"
              :stroke-dasharray="arcLength"
              :stroke-dashoffset="progressOffset"
              stroke-linecap="round"
              class="gauge-progress"
              filter="url(#gaugeShadow)"
            />
            
            <!-- Tick Marks -->
            <g class="gauge-ticks">
              <line
                v-for="tick in tickMarks"
                :key="tick.angle"
                :x1="tick.x1"
                :y1="tick.y1"
                :x2="tick.x2"
                :y2="tick.y2"
                :stroke="tick.isMajor ? 'var(--bs-gray-600)' : 'var(--bs-gray-400)'"
                :stroke-width="tick.isMajor ? 2 : 1"
                stroke-linecap="round"
              />
            </g>
            
            <!-- Min Label -->
            <text
              :x="minLabelPos.x"
              :y="minLabelPos.y"
              text-anchor="middle"
              class="gauge-label"
            >
              {{ minValue }}
            </text>
            
            <!-- Max Label -->
            <text
              :x="maxLabelPos.x"
              :y="maxLabelPos.y"
              text-anchor="middle"
              class="gauge-label"
            >
              {{ maxValue }}
            </text>
            
            <!-- Center Value -->
            <text
              :x="centerX"
              :y="centerY - 10"
              text-anchor="middle"
              dominant-baseline="middle"
              class="gauge-value"
              :class="`severity-${currentSeverity}`"
            >
              {{ formattedValue }}
            </text>
            
            <!-- Unit -->
            <text
              v-if="widget.unit"
              :x="centerX"
              :y="centerY + 12"
              text-anchor="middle"
              dominant-baseline="middle"
              class="gauge-unit"
            >
              {{ widget.unit }}
            </text>
            
            <!-- Severity Status Text -->
            <text
              :x="centerX"
              :y="centerY + 30"
              text-anchor="middle"
              dominant-baseline="middle"
              class="gauge-status"
              :class="`status-${currentSeverity}`"
            >
              {{ severityLabel }}
            </text>
          </svg>
        </div>

        <!-- Severity Legend -->
        <div class="severity-legend">
          <div class="legend-item" :class="{ active: currentSeverity === 'safe' }">
            <span class="legend-indicator safe"></span>
            <span class="legend-label">Safe</span>
            <span class="legend-range">0 - {{ safeThreshold }}</span>
          </div>
          <div class="legend-item" :class="{ active: currentSeverity === 'warning' }">
            <span class="legend-indicator warning"></span>
            <span class="legend-label">Warning</span>
            <span class="legend-range">{{ safeThreshold }} - {{ warningThreshold }}</span>
          </div>
          <div class="legend-item" :class="{ active: currentSeverity === 'critical' }">
            <span class="legend-indicator critical"></span>
            <span class="legend-label">Critical</span>
            <span class="legend-range">&gt; {{ warningThreshold }}</span>
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

// ============ CONFIGURATION ============
const viewBoxWidth = 200;
const viewBoxHeight = 120;
const centerX = viewBoxWidth / 2;
const centerY = 95;
const radius = 75;
const strokeWidth = 12;

// ============ VALUE BOUNDS ============
const minValue = computed(() => props.widget.min ?? 0);
const maxValue = computed(() => props.widget.max ?? 2000);

// ============ THRESHOLD CONFIGURATION ============
// Extract thresholds from widget config or use defaults for 0-2000 range
const safeThreshold = computed(() => {
  if (props.widget.severityLevels?.warning) {
    const warning = props.widget.severityLevels.warning;
    if (warning.includes('-')) {
      return parseFloat(warning.split('-')[0].trim());
    } else if (warning.startsWith('>')) {
      return parseFloat(warning.substring(1));
    }
  }
  // Default: 25% of max
  return Math.round(maxValue.value * 0.25);
});

const warningThreshold = computed(() => {
  if (props.widget.severityLevels?.critical) {
    const critical = props.widget.severityLevels.critical;
    if (critical.startsWith('>')) {
      return parseFloat(critical.substring(1));
    }
  }
  // Default: 50% of max
  return Math.round(maxValue.value * 0.5);
});

// ============ VALUE CALCULATIONS ============
const clampedValue = computed(() => {
  const val = props.value ?? 0;
  return Math.max(minValue.value, Math.min(maxValue.value, val));
});

const normalizedValue = computed(() => {
  const range = maxValue.value - minValue.value;
  if (range === 0) return 0;
  return (clampedValue.value - minValue.value) / range;
});

// ============ SEVERITY CALCULATION ============
type SeverityType = 'safe' | 'warning' | 'critical';

const currentSeverity = computed((): SeverityType => {
  const val = props.value ?? 0;
  
  if (props.widget.severityLevels) {
    const { warning, critical } = props.widget.severityLevels;
    
    // Check critical first
    if (critical) {
      if (critical.startsWith('>') && val > parseFloat(critical.substring(1))) {
        return 'critical';
      }
      if (critical.startsWith('<') && val < parseFloat(critical.substring(1))) {
        return 'critical';
      }
    }
    
    // Check warning
    if (warning) {
      if (warning.includes('-')) {
        const [min, max] = warning.split('-').map(s => parseFloat(s.trim()));
        if (val >= min && val <= max) return 'warning';
      } else if (warning.startsWith('>') && val > parseFloat(warning.substring(1))) {
        return 'warning';
      } else if (warning.startsWith('<') && val < parseFloat(warning.substring(1))) {
        return 'warning';
      }
    }
    
    return 'safe';
  }
  
  // Default thresholds if no config
  if (val > warningThreshold.value) return 'critical';
  if (val > safeThreshold.value) return 'warning';
  return 'safe';
});

const severityLabel = computed(() => {
  switch (currentSeverity.value) {
    case 'critical': return 'CRITICAL';
    case 'warning': return 'WARNING';
    default: return 'NORMAL';
  }
});

// ============ ARC GEOMETRY ============
// Half circle arc from left to right (180 degrees)
const startAngle = Math.PI; // 180 degrees (left)
const endAngle = 0; // 0 degrees (right)
const arcLength = computed(() => Math.PI * radius); // Half circumference

const arcPath = computed(() => {
  const startX = centerX - radius;
  const startY = centerY;
  const endX = centerX + radius;
  const endY = centerY;
  
  // Arc: M startX,startY A rx,ry rotation large-arc-flag sweep-flag endX,endY
  return `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;
});

// Progress offset (full arc length = hidden, 0 = fully visible)
const progressOffset = computed(() => {
  return arcLength.value * (1 - normalizedValue.value);
});

// ============ TICK MARKS ============
const tickMarks = computed(() => {
  const ticks = [];
  const tickCount = 10;
  const innerRadius = radius - strokeWidth / 2 - 4;
  const majorTickLength = 8;
  const minorTickLength = 4;
  
  for (let i = 0; i <= tickCount; i++) {
    const angle = Math.PI - (Math.PI * i / tickCount);
    const isMajor = i % 2 === 0;
    const tickLength = isMajor ? majorTickLength : minorTickLength;
    
    const x1 = centerX + innerRadius * Math.cos(angle);
    const y1 = centerY - innerRadius * Math.sin(angle);
    const x2 = centerX + (innerRadius - tickLength) * Math.cos(angle);
    const y2 = centerY - (innerRadius - tickLength) * Math.sin(angle);
    
    ticks.push({ angle, x1, y1, x2, y2, isMajor });
  }
  
  return ticks;
});

// ============ LABEL POSITIONS ============
const minLabelPos = computed(() => ({
  x: centerX - radius - 5,
  y: centerY + 15
}));

const maxLabelPos = computed(() => ({
  x: centerX + radius + 5,
  y: centerY + 15
}));

// ============ COLORS ============
const progressColor = computed(() => {
  switch (currentSeverity.value) {
    case 'critical': return 'var(--bs-danger, #dc3545)';
    case 'warning': return 'var(--bs-warning, #ffc107)';
    default: return 'var(--bs-success, #198754)';
  }
});
</script>

<style scoped lang="scss">
.gauge-widget-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 0.75rem;
  gap: 0.75rem;
}

.gauge-container {
  width: 100%;
  max-width: 220px;
}

.gauge-svg {
  width: 100%;
  height: auto;
  display: block;
}

.gauge-track-bg {
  opacity: 1;
}

.gauge-track-zones {
  opacity: 0.6;
}

.gauge-progress {
  transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1),
              stroke 0.4s ease;
}

.gauge-ticks line {
  opacity: 0.6;
}

.gauge-label {
  font-size: 10px;
  font-weight: 600;
  fill: var(--bs-secondary, #6c757d);
  font-family: system-ui, -apple-system, sans-serif;
}

.gauge-value {
  font-size: 28px;
  font-weight: 700;
  font-family: system-ui, -apple-system, sans-serif;
  fill: var(--bs-body-color, #212529);
  transition: fill 0.3s ease;
  
  &.severity-safe {
    fill: var(--bs-success, #198754);
  }
  
  &.severity-warning {
    fill: var(--bs-warning, #ffc107);
  }
  
  &.severity-critical {
    fill: var(--bs-danger, #dc3545);
  }
}

.gauge-unit {
  font-size: 11px;
  font-weight: 500;
  fill: var(--bs-secondary, #6c757d);
  font-family: system-ui, -apple-system, sans-serif;
}

.gauge-status {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  font-family: system-ui, -apple-system, sans-serif;
  transition: fill 0.3s ease;
  
  &.status-safe {
    fill: var(--bs-success, #198754);
  }
  
  &.status-warning {
    fill: var(--bs-warning, #ffc107);
  }
  
  &.status-critical {
    fill: var(--bs-danger, #dc3545);
  }
}

// Severity Legend
.severity-legend {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  width: 100%;
  padding: 0.5rem;
  background: var(--bs-gray-100, #f8f9fa);
  border-radius: 8px;
}

.legend-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  transition: all 0.3s ease;
  opacity: 0.6;
  
  &.active {
    opacity: 1;
    background: var(--bs-white, #fff);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .legend-indicator {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    
    &.safe {
      background: var(--bs-success, #198754);
    }
    
    &.warning {
      background: var(--bs-warning, #ffc107);
    }
    
    &.critical {
      background: var(--bs-danger, #dc3545);
    }
  }
  
  .legend-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--bs-body-color, #212529);
  }
  
  .legend-range {
    font-size: 0.6rem;
    font-weight: 500;
    color: var(--bs-secondary, #6c757d);
  }
}

// Size variants
.gauge-widget-content {
  &.size-sm {
    .gauge-container {
      max-width: 160px;
    }
    
    .gauge-value {
      font-size: 22px;
    }
    
    .severity-legend {
      gap: 0.5rem;
    }
    
    .legend-item {
      padding: 0.25rem 0.35rem;
    }
  }
  
  &.size-lg {
    .gauge-container {
      max-width: 280px;
    }
    
    .gauge-value {
      font-size: 36px;
    }
    
    .gauge-unit {
      font-size: 14px;
    }
    
    .gauge-status {
      font-size: 12px;
    }
  }
}

// Dark mode
:root[data-bs-theme="dark"],
[data-bs-theme="dark"] {
  --gauge-track-bg: #374151;
  
  .gauge-value {
    fill: var(--bs-gray-100, #f8f9fa);
    
    &.severity-safe {
      fill: var(--bs-success);
    }
    
    &.severity-warning {
      fill: var(--bs-warning);
    }
    
    &.severity-critical {
      fill: var(--bs-danger);
    }
  }
  
  .gauge-label,
  .gauge-unit {
    fill: var(--bs-gray-400, #adb5bd);
  }
  
  .severity-legend {
    background: var(--bs-gray-800, #343a40);
  }
  
  .legend-item {
    &.active {
      background: var(--bs-gray-700, #495057);
    }
    
    .legend-label {
      color: var(--bs-gray-100, #f8f9fa);
    }
    
    .legend-range {
      color: var(--bs-gray-400, #adb5bd);
    }
  }
}

// Animation for critical state
@keyframes pulse-critical {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.gauge-status.status-critical {
  animation: pulse-critical 1.5s ease-in-out infinite;
}

// Responsive
@media (max-width: 576px) {
  .severity-legend {
    gap: 0.35rem;
    padding: 0.35rem;
  }
  
  .legend-item {
    padding: 0.25rem 0.35rem;
    
    .legend-label {
      font-size: 0.6rem;
    }
    
    .legend-range {
      font-size: 0.55rem;
    }
  }
}
</style>