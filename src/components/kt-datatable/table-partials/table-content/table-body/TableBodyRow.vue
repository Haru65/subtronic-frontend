<template>
  <tbody class="fw-semibold text-gray-700">
    <template v-for="(row, i) in data" :key="row[checkboxLabel] || i">
      <tr>
        <td v-if="checkboxEnabled">
          <div
            class="form-check form-check-sm form-check-custom form-check-solid"
          >
            <input
              class="form-check-input"
              type="checkbox"
              :value="row[checkboxLabel]"
              v-model="selectedItems"
              @change="onChange"
            />
          </div>
        </td>
        <template v-for="(properties, j) in header" :key="j">
          <td :class="{ 'text-start': j === header.length - 1 }">
            <slot :name="`${properties.columnLabel}`" :row="row">
              {{ row }}
            </slot>
          </td>
        </template>
      </tr>
    </template>
  </tbody>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";

export default defineComponent({
  name: "table-body-row",
  components: {},
  props: {
    header: { type: Array as () => Array<any>, required: true },
    data: { type: Array as () => Array<any>, required: true },
    currentlySelectedItems: { type: Array, required: false, default: () => [] },
    checkboxEnabled: { type: Boolean, required: false, default: false },
    checkboxLabel: {
      type: String as () => string,
      required: false,
      default: "id",
    },
  },
  emits: ["on-select"],
  setup(props, { emit }) {
    const selectedItems = ref<Array<any>>([]);

    // Sync with parent's currentlySelectedItems to keep checkboxes in correct state
    watch(
      () => props.currentlySelectedItems,
      (newValue) => {
        console.log('🔄 TableBodyRow: Syncing from parent currentlySelectedItems:', newValue);
        selectedItems.value = [...(newValue || [])];
      },
      { deep: true }
    );

    // When data changes, clear selections
    watch(
      () => props.data,
      () => {
        console.log('📊 TableBodyRow: Data changed, clearing selections');
        selectedItems.value = [];
      }
    );

    const onChange = () => {
      console.log('☑️ TableBodyRow: onChange fired, selectedItems:', selectedItems.value);
      emit("on-select", selectedItems.value);
    };

    return {
      selectedItems,
      onChange,
    };
  },
});
</script>
