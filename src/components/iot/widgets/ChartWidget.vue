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
      <div class="chart-widget-content">
        <!-- Current Value Display -->
        <div class="current-value" :class="`severity-${severity}`">
          <span class="value-text">{{ formattedValue }}</span>
          <span v-if="widget.unit" class="value-unit">{{ widget.unit }}</span>
        </div>

        <!-- Chart Container -->
        <div class="chart-container" ref="chartContainer">
          <canvas
            ref="chartCanvas"
            :width="chartWidth"
            :height="chartHeight"
          ></canvas>
        </div>

        <!-- Chart Legend -->
        <div class="chart-legend" v-if="showLegend">
          <div class="legend-item">
            <span class="legend-color" :style="{ backgroundColor: chartColor }"></span>
            <span class="legend-label">{{ widget.label }}</span>
          </div>
        </div>

        <!-- Time Range Selector -->
        <div class="time-range-selector" v-if="showTimeRange">
          <div class="btn-group btn-group-sm" role="group">
            <button
              v-for="range in timeRanges"
              :key="range.key"
              type="button"
              class="btn"
              :class="selectedTimeRange === range.key ? 'btn-primary' : 'btn-outline-primary'"
              @click="selectTimeRange(range.key)"
            >
              {{ range.label }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </BaseWidget>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import BaseWidget from './BaseWidget.vue';
import type { WidgetConfig, SeverityLevel } from '@/types/deviceTemplate.types';

interface ChartDataPoint {
  timestamp: string;
  value: number;
}

interface TimeRange {
  key: string;
  label: string;
  duration: number; // minutes
}

interface Props {
  widget: WidgetConfig;
  value: number;
  previousValue?: number;
  lastUpdate?: string;
  loading?: boolean;
  showTrend?: boolean;
  showLegend?: boolean;
  showTimeRange?: boolean;
  data?: ChartDataPoint[];
  height?: number;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  showTrend: true,
  showLegend: true,
  showTimeRange: true,
  data: () => [],
  height: 120
});

const emit = defineEmits<{
  timeRangeChanged: [range: string];
}>();

// Refs
const chartContainer = ref<HTMLDivElement>();
const chartCanvas = ref<HTMLCanvasElement>();
const selectedTimeRange = ref('1h');

// Chart dimensions
const chartWidth = computed(() => 300);
const chartHeight = computed(() => props.height);

// Time ranges
const timeRanges: TimeRange[] = [
  { key: '15m', label: '15m', duration: 15 },
  { key: '1h', label: '1h', duration: 60 },
  { key: '6h', label: '6h', duration: 360 },
  { key: '24h', label: '24h', duration: 1440 }
];

// Chart color based on severity
const chartColor = computed(() => {
  if (!props.widget.severityLevels || typeof props.value !== 'number') {
    return props.widget.color || '#3b82f6';
  }

  const { safe, warning, critical } = props.widget.severityLevels;
  const numValue = props.value;

  // Parse critical condition
  if (critical.startsWith('>')) {
    const threshold = parseFloat(critical.substring(1));
    if (numValue > threshold) return '#ef4444';
  } else if (critical.startsWith('<')) {
    const threshold = parseFloat(critical.substring(1));
    if (numValue < threshold) return '#ef4444';
  }

  // Parse warning condition
  if (warning.includes('-')) {
    const [min, max] = warning.split('-').map(s => parseFloat(s));
    if (numValue >= min && numValue <= max) return '#f59e0b';
  } else if (warning.startsWith('>')) {
    const threshold = parseFloat(warning.substring(1));
    if (numValue > threshold) return '#f59e0b';
  } else if (warning.startsWith('<')) {
    const threshold = parseFloat(warning.substring(1));
    if (numValue < threshold) return '#f59e0b';
  }

  return '#10b981';
});

// Chart data processing
const chartData = computed(() => {
  if (!props.data || props.data.length === 0) {
    // Generate sample data if none provided
    const now = Date.now();
    const sampleData: ChartDataPoint[] = [];
    
    for (let i = 29; i >= 0; i--) {
      sampleData.push({
        timestamp: new Date(now - i * 60000).toISOString(),
        value: props.value + (Math.random() - 0.5) * (props.value * 0.1)
      });
    }
    
    return sampleData;
  }
  
  return props.data;
});

/**
 * Draw the chart on canvas
 */
const drawChart = () => {
  if (!chartCanvas.value) return;
  
  const canvas = chartCanvas.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const data = chartData.value;
  if (data.length === 0) return;

  // Chart dimensions with padding
  const padding = 20;
  const chartAreaWidth = canvas.width - padding * 2;
  const chartAreaHeight = canvas.height - padding * 2;

  // Find min/max values
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;

  // Draw chart based on type
  const chartType = props.widget.chartType || 'line';
  
  if (chartType === 'area') {
    drawAreaChart(ctx, data, padding, chartAreaWidth, chartAreaHeight, minValue, valueRange);
  } else if (chartType === 'bar') {
    drawBarChart(ctx, data, padding, chartAreaWidth, chartAreaHeight, minValue, valueRange);
  } else {
    drawLineChart(ctx, data, padding, chartAreaWidth, chartAreaHeight, minValue, valueRange);
  }
};

/**
 * Draw line chart
 */
const drawLineChart = (
  ctx: CanvasRenderingContext2D,
  data: ChartDataPoint[],
  padding: number,
  width: number,
  height: number,
  minValue: number,
  valueRange: number
) => {
  ctx.strokeStyle = chartColor.value;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  
  data.forEach((point, index) => {
    const x = padding + (index / (data.length - 1)) * width;
    const y = padding + height - ((point.value - minValue) / valueRange) * height;
    
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  
  ctx.stroke();

  // Draw points
  ctx.fillStyle = chartColor.value;
  data.forEach((point, index) => {
    const x = padding + (index / (data.length - 1)) * width;
    const y = padding + height - ((point.value - minValue) / valueRange) * height;
    
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fill();
  });
};

/**
 * Draw area chart
 */
const drawAreaChart = (
  ctx: CanvasRenderingContext2D,
  data: ChartDataPoint[],
  padding: number,
  width: number,
  height: number,
  minValue: number,
  valueRange: number
) => {
  // Create gradient
  const gradient = ctx.createLinearGradient(0, padding, 0, padding + height);
  gradient.addColorStop(0, chartColor.value + '40');
  gradient.addColorStop(1, chartColor.value + '10');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  
  // Start from bottom left
  ctx.moveTo(padding, padding + height);
  
  // Draw the area
  data.forEach((point, index) => {
    const x = padding + (index / (data.length - 1)) * width;
    const y = padding + height - ((point.value - minValue) / valueRange) * height;
    ctx.lineTo(x, y);
  });
  
  // Close the area
  ctx.lineTo(padding + width, padding + height);
  ctx.closePath();
  ctx.fill();

  // Draw the line on top
  drawLineChart(ctx, data, padding, width, height, minValue, valueRange);
};

/**
 * Draw bar chart
 */
const drawBarChart = (
  ctx: CanvasRenderingContext2D,
  data: ChartDataPoint[],
  padding: number,
  width: number,
  height: number,
  minValue: number,
  valueRange: number
) => {
  ctx.fillStyle = chartColor.value;
  
  const barWidth = width / data.length * 0.8;
  const barSpacing = width / data.length * 0.2;
  
  data.forEach((point, index) => {
    const x = padding + index * (width / data.length) + barSpacing / 2;
    const barHeight = ((point.value - minValue) / valueRange) * height;
    const y = padding + height - barHeight;
    
    ctx.fillRect(x, y, barWidth, barHeight);
  });
};

/**
 * Select time range
 */
const selectTimeRange = (range: string) => {
  selectedTimeRange.value = range;
  emit('timeRangeChanged', range);
};

// Lifecycle
onMounted(() => {
  nextTick(() => {
    drawChart();
  });
});

// Watch for data changes
watch([() => props.data, () => props.value, chartColor], () => {
  nextTick(() => {
    drawChart();
  });
});
</script>

<style scoped lang="scss">
.chart-widget-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 1rem;
}

.current-value {
  text-align: center;
  margin-bottom: 0.5rem;

  .value-text {
    font-size: 1.5rem;
    font-weight: 700;
    transition: color 0.3s ease;
  }

  .value-unit {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--bs-gray-600);
    margin-left: 0.25rem;
  }

  // Severity-based colors
  &.severity-safe .value-text {
    color: var(--bs-success);
  }

  &.severity-warning .value-text {
    color: var(--bs-warning);
  }

  &.severity-critical .value-text {
    color: var(--bs-danger);
  }
}

.chart-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 120px;
  background: var(--bs-gray-50);
  border-radius: var(--bs-border-radius);
  padding: 0.5rem;

  canvas {
    max-width: 100%;
    height: auto;
  }
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 1rem;

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .legend-label {
      color: var(--bs-gray-600);
      font-weight: 500;
    }
  }
}

.time-range-selector {
  display: flex;
  justify-content: center;

  .btn-group {
    .btn {
      font-size: 0.75rem;
      padding: 0.25rem 0.75rem;
    }
  }
}

// Dark mode support
[data-bs-theme="dark"] {
  .current-value .value-unit {
    color: var(--bs-gray-400);
  }

  .chart-container {
    background: var(--bs-gray-800);
  }

  .chart-legend .legend-item .legend-label {
    color: var(--bs-gray-400);
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .current-value .value-text {
    font-size: 1.25rem;
  }

  .chart-container {
    min-height: 100px;
  }

  .time-range-selector .btn-group .btn {
    font-size: 0.625rem;
    padding: 0.2rem 0.5rem;
  }
}
</style>