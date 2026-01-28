<template>
  <div class="gas-concentration-chart-widget">
    <!-- Widget Header -->
    <div class="widget-header">
      <div class="widget-icon">
        <i :class="widget.icon || 'bi bi-graph-up'" :style="{ color: widget.color || '#007bff' }"></i>
      </div>
      <div class="widget-title">
        <h6 class="mb-0">{{ widget.label }}</h6>
      </div>
    </div>

    <!-- Chart Canvas -->
    <div class="chart-wrapper">
      <canvas ref="chartCanvas" class="chart-canvas"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import type { SubtronicsWidgetConfig } from '@/types/subtronics.types';

interface Props {
  widget: SubtronicsWidgetConfig;
  currentValue?: number;
  a1Level?: number;
  a2Level?: number;
  a3Level?: number;
  lastUpdate?: string;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  currentValue: 0,
  a1Level: 250,
  a2Level: 500,
  a3Level: 1000
});

defineEmits<{
  action: [action: string];
}>();

// Canvas refs
const chartCanvas = ref<HTMLCanvasElement | null>(null);
const chartWidth = ref(800);
const chartHeight = ref(300);

// Data storage - 60 points for 60 minutes
const dataPoints = ref<Array<{ minute: number; value: number }>>([]);
const maxPoints = 60;

// Get line color based on value
const getValueColor = (value: number): string => {
  if (value >= 1000) return '#dc3545'; // Red - above 1000
  if (value >= 500) return '#ffc107';  // Yellow - 500 to 1000
  if (value >= 250) return '#28a745';  // Green - 250 to 500
  return '#000000'; // Black - below 250
};

// Add new data point
const addDataPoint = (value: number) => {
  const minute = dataPoints.value.length + 1;
  
  dataPoints.value.push({ minute, value });
  
  // Keep only last 60 points
  if (dataPoints.value.length > maxPoints) {
    // Shift all points and renumber
    dataPoints.value = dataPoints.value.slice(-maxPoints).map((p, i) => ({
      minute: i + 1,
      value: p.value
    }));
  }
  
  drawChart();
};

// Draw the chart
const drawChart = () => {
  if (!chartCanvas.value) return;
  
  const canvas = chartCanvas.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartArea = {
    x: padding.left,
    y: padding.top,
    width: chartWidth.value - padding.left - padding.right,
    height: chartHeight.value - padding.top - padding.bottom
  };
  
  // Clear canvas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, chartWidth.value, chartHeight.value);
  
  // Fixed Y-axis max at 1500
  const maxValue = 1500;
  
  // Fixed Y-axis values: 0, 250, 500, 1000, 1500
  const yAxisValues = [0, 250, 500, 1000, 1500];
  
  // Draw grid
  ctx.strokeStyle = '#e9ecef';
  ctx.lineWidth = 1;
  
  // Horizontal grid lines at fixed values
  yAxisValues.forEach(value => {
    const y = chartArea.y + chartArea.height - (value / maxValue) * chartArea.height;
    ctx.beginPath();
    ctx.moveTo(chartArea.x, y);
    ctx.lineTo(chartArea.x + chartArea.width, y);
    ctx.stroke();
    
    // Y-axis labels
    ctx.fillStyle = '#495057';
    ctx.font = '11px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(value.toString(), chartArea.x - 8, y + 4);
  });
  
  // Vertical grid lines (every 10 minutes)
  for (let i = 0; i <= 6; i++) {
    const x = chartArea.x + (chartArea.width * i) / 6;
    ctx.beginPath();
    ctx.strokeStyle = '#e9ecef';
    ctx.moveTo(x, chartArea.y);
    ctx.lineTo(x, chartArea.y + chartArea.height);
    ctx.stroke();
    
    // X-axis labels (1min, 10min, 20min, etc.)
    const minute = i * 10;
    ctx.fillStyle = '#495057';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(minute === 0 ? '1min' : `${minute}min`, x, chartArea.y + chartArea.height + 20);
  }
  
  // Draw axes
  ctx.strokeStyle = '#6c757d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(chartArea.x, chartArea.y);
  ctx.lineTo(chartArea.x, chartArea.y + chartArea.height);
  ctx.lineTo(chartArea.x + chartArea.width, chartArea.y + chartArea.height);
  ctx.stroke();
  
  // Draw data line
  if (dataPoints.value.length < 2) {
    // Show message if no data
    ctx.fillStyle = '#6c757d';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Waiting for data...', chartWidth.value / 2, chartHeight.value / 2);
    return;
  }
  
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Draw continuous line segments with colors based on value
  for (let i = 0; i < dataPoints.value.length - 1; i++) {
    const p1 = dataPoints.value[i];
    const p2 = dataPoints.value[i + 1];
    
    const x1 = chartArea.x + ((p1.minute - 1) / (maxPoints - 1)) * chartArea.width;
    const y1 = chartArea.y + chartArea.height - (p1.value / maxValue) * chartArea.height;
    const x2 = chartArea.x + ((p2.minute - 1) / (maxPoints - 1)) * chartArea.width;
    const y2 = chartArea.y + chartArea.height - (p2.value / maxValue) * chartArea.height;
    
    ctx.strokeStyle = getValueColor(p1.value);
    ctx.setLineDash([]); // Solid line, no dashes
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
};

// Resize handler
const resizeChart = () => {
  if (!chartCanvas.value) return;
  
  const container = chartCanvas.value.parentElement;
  if (!container) return;
  
  chartWidth.value = container.clientWidth || 800;
  chartHeight.value = 300;
  
  chartCanvas.value.width = chartWidth.value;
  chartCanvas.value.height = chartHeight.value;
  
  drawChart();
};

// Watch for new values from WebSocket - trigger on lastUpdate to catch every update
watch(() => props.lastUpdate, (newTimestamp) => {
  console.log('📊 Chart update triggered, value:', props.currentValue, 'timestamp:', newTimestamp);
  if (props.currentValue !== undefined && props.currentValue !== null) {
    addDataPoint(props.currentValue);
  }
});

// Also watch currentValue for initial load
watch(() => props.currentValue, (newValue) => {
  console.log('📊 Chart value changed:', newValue);
}, { immediate: true });

onMounted(() => {
  console.log('📊 GasConcentrationChart mounted, initial value:', props.currentValue);
  window.addEventListener('resize', resizeChart);
  nextTick(() => {
    resizeChart();
    // Add initial point if we have a value
    if (props.currentValue) {
      addDataPoint(props.currentValue);
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeChart);
});
</script>

<style scoped lang="scss">
.gas-concentration-chart-widget {
  background: var(--bs-white);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  padding: 1.5rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.widget-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;

  .widget-icon {
    width: 2.5rem;
    height: 2.5rem;
    background: var(--bs-gray-100);
    border-radius: var(--bs-border-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
  }

  .widget-title h6 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--bs-gray-900);
  }
}

.chart-wrapper {
  flex: 1;
  min-height: 300px;
  
  .chart-canvas {
    width: 100%;
    height: 300px;
    border: 1px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius);
    background: white;
  }
}
</style>
