<template>
  <div class="card">
    <div class="card-header border-0 pt-6">
      <!-- Card title -->
      <div class="card-title">
        <!-- Search -->
        <div class="d-flex align-items-center position-relative my-1">
          <KTIcon icon-name="magnifier" icon-class="fs-1 position-absolute ms-6" />
          <input
            type="text"
            v-model="search"
            @input="searchItems"
            class="form-control form-control-solid w-250px ps-15"
            placeholder="Search Locations"
          />
        </div>
      </div>
      <!-- Card toolbar -->
      <div class="card-toolbar">
        <button
          type="button"
          class="btn btn-primary"
          data-bs-toggle="modal"
          data-bs-target="#add_location_modal"
        >
          <KTIcon icon-name="plus" icon-class="fs-2" />
          Add Location
        </button>
      </div>
    </div>
    <div class="card-body pt-0">
      <!-- Add Location Modal -->
      <LocationAddModal @add-location="addLocation" />

      <!-- Datatable -->
      <Datatable
        checkbox-label="id"
        @on-sort="sort"
        @on-items-select="onItemSelect"
        :data="tableData"
        :header="tableHeader"
        :checkbox-enabled="true"
        :items-per-page="limit"
        :items-per-page-dropdown-enabled="false"
        :loading="loading"
      >
        <template v-slot:id="{ row: location }">
          {{ location.id }}
        </template>
        <template v-slot:device_name="{ row: location }">
          {{ location.device_name }}
        </template>
        <template v-slot:device_location="{ row: location }">
          {{ location.device_location || 'Not Set' }}
        </template>
        <template v-slot:last_online="{ row: location }">
          {{ location.last_online || 'Never' }}
        </template>
        <template v-slot:actions="{ row: location }">
          <div class="dropdown">
            <a
              href="#"
              class="text-gray-700 hover:text-gray-700 cursor-pointer transition-colors"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              @click.prevent
            >
              <KTIcon icon-name="dots-circle-vertical" icon-class="fs-2x" />
            </a>
            <ul class="dropdown-menu dropdown-menu-end min-w-150px py-2 shadow-sm">
              <li>
                <a
                  class="dropdown-item d-flex align-items-center gap-3 px-4 py-3 hover-bg-light-danger cursor-pointer"
                  @click.prevent="deleteItem(location.id)"
                >
                  <KTIcon icon-name="trash" icon-class="fs-3 text-danger" />
                  <span class="text-danger">Delete</span>
                </a>
              </li>
            </ul>
          </div>
        </template>
      </Datatable>
      <div class="d-flex justify-content-between p-2">
        <div>
          <el-select
            class="w-100px rounded-2"
            v-model="limit"
            filterable
            @change="updateLimit"
          >
            <el-option
              v-for="item in limits"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </div>
        <ul class="pagination">
          <li class="paginate_button page-item" style="cursor: auto">
            <span @click="prevPage" class="paginate_button page-link">
              <i class="ki-duotone ki-left fs-2"></i>
            </span>
          </li>
          <li class="paginate_button disabled">
            <span class="paginate_button page-link"> Page - {{ page }} </span>
          </li>
          <li class="paginate_button page-item" style="cursor: pointer">
            <span @click="nextPage" class="paginate_button page-link">
              <i class="ki-duotone ki-right fs-2"></i>
            </span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import Datatable from "@/components/kt-datatable/KTDataTable.vue";
import LocationAddModal from "./LocationAddModal.vue";
import Swal from "sweetalert2";
import arraySort from "array-sort";
import ApiService from "@/core/services/ApiService";
import { reverseGeocode } from "@/utils/reverseGeocode";
import { formatLastSeen } from "@/utils/dateFormatter";

interface ILocation {
  id: number;
  device_name: string;
  device_location?: string;
  last_online?: string;
}

export default defineComponent({
  name: "location-listing",
  components: {
    Datatable,
    LocationAddModal,
  },
  setup() {
    const tableHeader = ref([
      { columnName: "ID", columnLabel: "id", sortEnabled: true, columnWidth: 50 },
      { columnName: "Device Name", columnLabel: "device_name", sortEnabled: true, columnWidth: 150 },
      { columnName: "Device Location", columnLabel: "device_location", sortEnabled: true, columnWidth: 150 },
      { columnName: "Last Online", columnLabel: "last_online", sortEnabled: true, columnWidth: 150 },
      { columnName: "Actions", columnLabel: "actions", sortEnabled: false, columnWidth: 75 },
    ]);

    const dummyData: ILocation[] = [];

    const tableData = ref<ILocation[]>([...dummyData]);
    const initValues = ref<ILocation[]>([...dummyData]);
    const search = ref<string>("");
    const loading = ref(false);
    const page = ref(1);
    const limit = ref(10);
    const limits = ref([10, 25, 50]);
    const selectedIds = ref<number[]>([]);
    const more = ref(true);

    // Process location field - reverse geocode if needed
    const processLocationField = async (location: string | undefined): Promise<string> => {
      if (!location) return "Not Set";
      
      // Check if location is coordinates (format: "lat, lon")
      const coordMatch = location.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
      if (coordMatch) {
        try {
          const lat = parseFloat(coordMatch[1]);
          const lon = parseFloat(coordMatch[2]);
          console.log(`🌐 Reverse geocoding location (${lat}, ${lon})...`);
          const geoData = await reverseGeocode(lat, lon);
          if (geoData && geoData.address) {
            console.log(`📍 Geocoded to: ${geoData.address}`);
            return geoData.address;
          }
        } catch (error) {
          console.warn(`⚠️ Geocoding failed for ${location}:`, error);
        }
      }
      
      return location;
    };

    // Fetch device locations with dynamic data
    const fetchDeviceLocations = async () => {
      loading.value = true;
      try {
        ApiService.setHeader();
        const response = await ApiService.query("/api/devices", {});
        
        if (response?.data?.success && response?.data?.devices) {
          const devices = response.data.devices;
          const locationsData: ILocation[] = await Promise.all(
            devices.map(async (device: any, index: number) => {
              // Format last online time - use HH:MM:SS format for recent times
              let lastOnlineStr = "Never";
              if (device.lastSeen) {
                lastOnlineStr = formatLastSeen(device.lastSeen);
              }

              // Process location field to geocode if needed
              const processedLocation = await processLocationField(device.location);

              return {
                id: index + 1,
                device_name: device.deviceName || device.name || "N/A",
                device_location: processedLocation,
                last_online: lastOnlineStr,
              };
            })
          );
          
          tableData.value = locationsData;
          initValues.value = locationsData;
          console.log('✅ Locations loaded:', locationsData.length);
        } else {
          console.warn('⚠️ No devices found in response');
        }
      } catch (error) {
        console.error("Error fetching device locations:", error);
        Swal.fire({
          title: "Error",
          text: "Failed to load device locations",
          icon: "error",
          buttonsStyling: false,
          confirmButtonText: "Ok, got it!",
          customClass: { confirmButton: "btn btn-primary" },
        });
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      fetchDeviceLocations();
    });

    const addLocation = (newLocation: ILocation) => {
      tableData.value.push(newLocation);
      initValues.value.push(newLocation);
      Swal.fire({
        title: "Success",
        text: "Location added successfully!",
        icon: "success",
        buttonsStyling: false,
        confirmButtonText: "Ok, got it!",
        customClass: { confirmButton: "btn btn-primary" },
      });
    };

    const deleteItem = async (id: number) => {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "You will not be able to recover this location!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "red",
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "No, cancel!",
      });

      if (result.isConfirmed) {
        tableData.value = tableData.value.filter((item) => item.id !== id);
        initValues.value = initValues.value.filter((item) => item.id !== id);
        Swal.fire({
          title: "Deleted!",
          text: "Location has been deleted.",
          icon: "success",
          buttonsStyling: false,
          confirmButtonText: "Ok, got it!",
          customClass: { confirmButton: "btn btn-primary" },
        });
      }
    };

    const searchItems = () => {
      tableData.value = [...initValues.value];
      if (search.value) {
        tableData.value = tableData.value.filter((item) =>
          Object.values(item).some(
            (val) =>
              val && typeof val === "string" &&
              val.toLowerCase().includes(search.value.toLowerCase())
          )
        );
      }
    };

    const sort = (sort: { label: string; order: string }) => {
      const reverse = sort.order === "asc";
      if (sort.label) {
        arraySort(tableData.value, sort.label, { reverse });
      }
    };

    const onItemSelect = (selectedItems: number[]) => {
      selectedIds.value = selectedItems;
    };

    const updateLimit = (newLimit: number) => {
      limit.value = newLimit;
      page.value = 1;
      updateTableData();
    };

    const prevPage = () => {
      if (page.value > 1) {
        page.value--;
        updateTableData();
      }
    };

    const nextPage = () => {
      if (more.value) {
        page.value++;
        updateTableData();
      }
    };

    const updateTableData = () => {
      loading.value = true;
      const start = (page.value - 1) * limit.value;
      const end = start + limit.value;
      tableData.value = initValues.value.slice(start, end);
      more.value = end < initValues.value.length;
      setTimeout(() => {
        loading.value = false;
      }, 250);
    };

    return {
      tableData,
      tableHeader,
      search,
      searchItems,
      selectedIds,
      sort,
      onItemSelect,
      loading,
      limit,
      limits,
      prevPage,
      nextPage,
      page,
      addLocation,
      deleteItem,
    };
  },
});
</script>