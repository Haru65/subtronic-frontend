<template>
  <div class="setting-control">
    <!-- Number Input -->
    <div v-if="setting.type === 'number'" class="number-control">
      <input
        type="number"
        class="form-control form-control-sm"
        :value="value"
        :min="setting.min"
        :max="setting.max"
        :step="getStep()"
        @input="handleInput"
        @blur="handleBlur"
      />
      <span v-if="setting.unit" class="input-unit">{{ setting.unit }}</span>
    </div>

    <!-- Text Input -->
    <div v-else-if="setting.type === 'string'" class="text-control">
      <input
        type="text"
        class="form-control form-control-sm"
        :value="value"
        @input="handleInput"
        @blur="handleBlur"
      />
    </div>

    <!-- Boolean Toggle -->
    <div v-else-if="setting.type === 'boolean'" class="boolean-control">
      <div class="form-check form-switch">
        <input
          class="form-check-input"
          type="checkbox"
          :checked="value"
          @change="handleToggle"
        />
        <label class="form-check-label">
          {{ value ? 'Enabled' : 'Disabled' }}
        </label>
      </div>
    </div>

    <!-- Select Dropdown -->
    <div v-else-if="setting.type === 'select'" class="select-control">
      <select
        class="form-select form-select-sm"
        :value="value"
        @change="handleSelect"
      >
        <option
          v-for="option in setting.options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </div>

    <!-- Range Slider -->
    <div v-else-if="setting.type === 'range'" class="range-control">
      <div class="range-wrapper">
        <input
          type="range"
          class="form-range"
          :value="value"
          :min="setting.min"
          :max="setting.max"
          :step="getStep()"
          @input="handleRange"
        />
        <div class="range-value">
          {{ value }}
          <span v-if="setting.unit">{{ setting.unit }}</span>
        </div>
      </div>
      <div class="range-labels">
        <small class="text-muted">{{ setting.min }}</small>
        <small class="text-muted">{{ setting.max }}</small>
      </div>
    </div>

    <!-- Validation Message -->
    <div v-if="validationMessage" class="validation-message">
      <small class="text-danger">{{ validationMessage }}</small>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { SettingConfig } from '@/types/deviceTemplate.types';

interface Props {
  setting: SettingConfig;
  value: any;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  update: [key: string, value: any];
}>();

const validationMessage = ref<string>('');

/**
 * Get appropriate step value for number inputs
 */
const getStep = () => {
  if (props.setting.type === 'number' || props.setting.type === 'range') {
    // If min/max are decimals, use 0.1, otherwise use 1
    const hasDecimals = (props.setting.min && props.setting.min % 1 !== 0) || 
                       (props.setting.max && props.setting.max % 1 !== 0);
    return hasDecimals ? 0.1 : 1;
  }
  return 1;
};

/**
 * Validate input value
 */
const validateValue = (value: any): boolean => {
  validationMessage.value = '';

  if (props.setting.type === 'number' || props.setting.type === 'range') {
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      validationMessage.value = 'Please enter a valid number';
      return false;
    }
    
    if (props.setting.min !== undefined && numValue < props.setting.min) {
      validationMessage.value = `Value must be at least ${props.setting.min}`;
      return false;
    }
    
    if (props.setting.max !== undefined && numValue > props.setting.max) {
      validationMessage.value = `Value must be at most ${props.setting.max}`;
      return false;
    }
  }

  return true;
};

/**
 * Handle input changes
 */
const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  let value = target.value;

  if (props.setting.type === 'number') {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      value = numValue;
    }
  }

  if (validateValue(value)) {
    emit('update', props.setting.key, value);
  }
};

/**
 * Handle blur events (final validation)
 */
const handleBlur = (event: Event) => {
  const target = event.target as HTMLInputElement;
  let value = target.value;

  if (props.setting.type === 'number') {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      // Clamp value to min/max
      let clampedValue = numValue;
      if (props.setting.min !== undefined) {
        clampedValue = Math.max(clampedValue, props.setting.min);
      }
      if (props.setting.max !== undefined) {
        clampedValue = Math.min(clampedValue, props.setting.max);
      }
      
      if (clampedValue !== numValue) {
        target.value = clampedValue.toString();
        value = clampedValue;
      }
    }
  }

  emit('update', props.setting.key, value);
};

/**
 * Handle boolean toggle
 */
const handleToggle = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update', props.setting.key, target.checked);
};

/**
 * Handle select changes
 */
const handleSelect = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  let value: any = target.value;

  // Try to parse as number if the original option value is a number
  const selectedOption = props.setting.options?.find(opt => opt.value.toString() === value);
  if (selectedOption && typeof selectedOption.value === 'number') {
    value = parseFloat(value);
  }

  emit('update', props.setting.key, value);
};

/**
 * Handle range slider changes
 */
const handleRange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const value = parseFloat(target.value);
  emit('update', props.setting.key, value);
};
</script>

<style scoped lang="scss">
.setting-control {
  min-width: 120px;
}

.number-control {
  position: relative;

  .input-unit {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.75rem;
    color: var(--bs-gray-600);
    pointer-events: none;
  }

  input[type="number"] {
    padding-right: 2.5rem;
  }
}

.boolean-control {
  .form-check {
    margin: 0;
    padding-left: 2.5rem;

    .form-check-input {
      margin-left: -2.5rem;
    }

    .form-check-label {
      font-size: 0.875rem;
      color: var(--bs-gray-700);
      cursor: pointer;
    }
  }
}

.range-control {
  .range-wrapper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.25rem;

    .form-range {
      flex: 1;
    }

    .range-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--bs-gray-900);
      min-width: 3rem;
      text-align: right;
    }
  }

  .range-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
  }
}

.validation-message {
  margin-top: 0.25rem;
}

// Dark mode support
[data-bs-theme="dark"] {
  .number-control .input-unit {
    color: var(--bs-gray-400);
  }

  .boolean-control .form-check-label {
    color: var(--bs-gray-300);
  }

  .range-control .range-wrapper .range-value {
    color: var(--bs-gray-100);
  }
}

// Focus states
.form-control:focus,
.form-select:focus {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.25);
}

.form-check-input:focus {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.25);
}

.form-range:focus {
  outline: none;

  &::-webkit-slider-thumb {
    box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.25);
  }

  &::-moz-range-thumb {
    box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.25);
  }
}
</style>