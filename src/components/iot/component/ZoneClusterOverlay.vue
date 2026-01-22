<template>
  <div class="zone-cluster-overlay">
    <!-- Cluster Controls -->
    <div class="cluster-controls mb-4 d-flex flex-wrap gap-3 align-items-center">
      <button 
        class="btn btn-outline-primary btn-sm"
        :class="{ active: viewMode === 'clusters' }"
        @click="viewMode = 'clusters'"
      >
        <i class="bi bi-diagram-2 me-2"></i>Cluster View
      </button>
      <button 
        class="btn btn-outline-primary btn-sm"
        :class="{ active: viewMode === 'list' }"
        @click="viewMode = 'list'"
      >
        <i class="bi bi-list-ul me-2"></i>List View
      </button>
      <button 
        class="btn btn-outline-secondary btn-sm"
        @click="toggleClusterAnimation"
      >
        <i class="bi bi-play-fill me-2"></i>{{ animatingCluster ? 'Pause' : 'Animate' }} Clusters
      </button>
      <span class="badge bg-info ms-auto">{{ clusters.length }} Clusters</span>
    </div>

    <!-- Cluster View - Overlay Style -->
    <div v-if="viewMode === 'clusters'" class="clusters-container">
      <div class="row g-4">
        <div
          class="col-lg-3 col-md-4 col-sm-6 col-12"
          v-for="cluster in clusters"
          :key="cluster.id"
        >
          <div 
            class="cluster-card h-100 shadow-sm cursor-pointer position-relative overflow-hidden"
            @click="selectCluster(cluster)"
            @mouseover="hoveredClusterId = cluster.id"
            @mouseout="hoveredClusterId = null"
            :class="{ 'cluster-hovered': hoveredClusterId === cluster.id }"
            :style="getClusterCardStyle(cluster)"
          >
            <!-- Animated Background Overlay -->
            <div 
              class="cluster-overlay-bg"
              :style="{ backgroundColor: cluster.color + '20' }"
            ></div>

            <!-- Cluster Badge -->
            <div class="position-absolute top-0 end-0 p-3">
              <span 
                class="badge rounded-pill"
                :style="{ backgroundColor: cluster.color }"
              >
                {{ cluster.devices.length }}
              </span>
            </div>

            <!-- Cluster Content -->
            <div class="cluster-content position-relative z-1 p-4">
              <!-- Cluster Icon -->
              <div class="mb-3">
                <i 
                  class="bi bi-diagram-2 fs-1" 
                  :style="{ color: cluster.color }"
                ></i>
              </div>
              
              <!-- Cluster Name -->
              <h5 class="card-title fw-bold mb-2">{{ cluster.name }}</h5>
              
              <!-- Cluster Stats -->
              <div class="cluster-stats mb-3">
                <div class="stat-item d-flex justify-content-between align-items-center mb-2">
                  <span class="text-muted small">Devices:</span>
                  <span class="fw-semibold">{{ cluster.devices.length }}</span>
                </div>
                <div class="stat-item d-flex justify-content-between align-items-center mb-2">
                  <span class="text-muted small">Online:</span>
                  <span class="text-success fw-semibold">{{ getOnlineCount(cluster) }}</span>
                </div>
                <div class="stat-item d-flex justify-content-between align-items-center">
                  <span class="text-muted small">Offline:</span>
                  <span class="text-danger fw-semibold">{{ getOfflineCount(cluster) }}</span>
                </div>
              </div>

              <!-- Device Mini List -->
              <div class="cluster-devices mb-3">
                <div class="small text-muted mb-2">Devices:</div>
                <div class="device-mini-list">
                  <div
                    v-for="device in cluster.devices.slice(0, 3)"
                    :key="device.id"
                    class="device-mini-item d-flex align-items-center gap-2 mb-1"
                  >
                    <i 
                      :class="{
                        'bi-circle-fill text-success': device.status === 'online',
                        'bi-circle-fill text-danger': device.status === 'offline',
                        'bi-circle-fill text-warning': device.status === 'warning'
                      }"
                      class="bi fs-8"
                    ></i>
                    <span class="text-truncate small">{{ device.name }}</span>
                  </div>
                  <div 
                    v-if="cluster.devices.length > 3"
                    class="text-muted small mt-1"
                  >
                    +{{ cluster.devices.length - 3 }} more
                  </div>
                </div>
              </div>

              <!-- Hover Action -->
              <div class="cluster-action text-center mt-3 pt-3 border-top">
                <small class="text-primary fw-semibold">
                  <i class="bi bi-chevron-right"></i> View Cluster Details
                </small>
              </div>
            </div>

            <!-- Location Tag -->
            <div 
              v-if="cluster.location"
              class="position-absolute bottom-0 start-0 p-2"
            >
              <span class="badge bg-secondary-light small">
                <i class="bi bi-geo-alt me-1"></i>{{ cluster.location }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- No Clusters Message -->
      <div v-if="clusters.length === 0" class="text-center text-muted py-10">
        <i class="bi bi-search fs-1 mb-3"></i>
        <p class="fs-5 fw-semibold mb-1">No device clusters found</p>
        <p class="small">Devices will be grouped into clusters based on location.</p>
      </div>
    </div>

    <!-- List View -->
    <div v-else class="list-view">
      <div v-for="cluster in clusters" :key="cluster.id" class="mb-4">
        <div class="card">
          <div 
            class="card-header"
            :style="{ backgroundColor: cluster.color + '30', borderLeft: `4px solid ${cluster.color}` }"
          >
            <h6 class="mb-0">
              <i 
                class="bi bi-diagram-2 me-2" 
                :style="{ color: cluster.color }"
              ></i>
              {{ cluster.name }}
              <span class="badge ms-2" :style="{ backgroundColor: cluster.color }">
                {{ cluster.devices.length }} devices
              </span>
            </h6>
          </div>
          <div class="card-body">
            <div class="row">
              <div
                class="col-lg-3 col-md-4 col-sm-6"
                v-for="device in cluster.devices"
                :key="device.id"
              >
                <div class="device-item-compact">
                  <div class="d-flex align-items-center gap-2 mb-2">
                    <i 
                      :class="{
                        'bi-circle-fill text-success': device.status === 'online',
                        'bi-circle-fill text-danger': device.status === 'offline',
                        'bi-circle-fill text-warning': device.status === 'warning'
                      }"
                      class="bi"
                    ></i>
                    <span class="fw-semibold">{{ device.name }}</span>
                  </div>
                  <small class="text-muted">{{ device.location }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Cluster Details Modal -->
    <div 
      v-if="selectedCluster"
      class="cluster-details-overlay"
      @click.self="selectedCluster = null"
    >
      <div class="cluster-details-card">
        <button 
          class="btn-close position-absolute top-0 end-0 m-3"
          @click="selectedCluster = null"
        ></button>

        <div 
          class="cluster-details-header p-4"
          :style="{ backgroundColor: selectedCluster.color + '20' }"
        >
          <h4 class="mb-2">{{ selectedCluster.name }}</h4>
          <p class="text-muted mb-0">{{ selectedCluster.devices.length }} devices in this cluster</p>
        </div>

        <div class="cluster-details-body p-4">
          <h6 class="fw-bold mb-3">Devices in Cluster</h6>
          <div class="row g-3">
            <div
              class="col-12"
              v-for="device in selectedCluster.devices"
              :key="device.id"
            >
              <div class="d-flex align-items-center justify-content-between p-2 border rounded">
                <div class="d-flex align-items-center gap-2">
                  <i 
                    :class="{
                      'bi-circle-fill text-success': device.status === 'online',
                      'bi-circle-fill text-danger': device.status === 'offline',
                      'bi-circle-fill text-warning': device.status === 'warning'
                    }"
                    class="bi"
                  ></i>
                  <div>
                    <div class="fw-semibold">{{ device.name }}</div>
                    <small class="text-muted">{{ device.location }}</small>
                  </div>
                </div>
                <span class="badge bg-info">{{ device.status }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from "vue";

type DeviceStatus = "online" | "offline" | "warning" | "critical";

interface Device {
  id: string;
  name: string;
  location: string;
  status: DeviceStatus;
  coordinates?: { lat: number; lng: number };
}

interface Cluster {
  id: string;
  name: string;
  color: string;
  location: string;
  devices: Device[];
  centroid?: { lat: number; lng: number };
}

export default defineComponent({
  name: "ZoneClusterOverlay",
  props: {
    devices: {
      type: Array as () => Device[],
      required: true,
    },
  },
  emits: ["clusterSelected"],
  setup(props, { emit }) {
    const viewMode = ref<"clusters" | "list">("clusters");
    const hoveredClusterId = ref<string | null>(null);
    const selectedCluster = ref<Cluster | null>(null);
    const animatingCluster = ref(false);
    let animationInterval: NodeJS.Timeout | null = null;

    // Cluster colors palette
    const clusterColors = [
      "#007bff", // Blue
      "#28a745", // Green
      "#ffc107", // Yellow
      "#dc3545", // Red
      "#20c997", // Teal
      "#e83e8c", // Pink
      "#fd7e14", // Orange
      "#6f42c1", // Purple
    ];

    // Clustering algorithm - Group devices by location
    const clusterDevices = (devices: Device[]): Cluster[] => {
      if (!devices.length) return [];

      // Group by location (using location as primary grouping)
      const locationMap = new Map<string, Device[]>();
      
      devices.forEach((device) => {
        const location = device.location || "Unknown Location";
        if (!locationMap.has(location)) {
          locationMap.set(location, []);
        }
        locationMap.get(location)!.push(device);
      });

      // Create clusters from location groups
      const clusters: Cluster[] = [];
      let clusterIndex = 0;

      locationMap.forEach((devices, location) => {
        clusters.push({
          id: `cluster-${clusterIndex}`,
          name: `Cluster - ${location}`,
          location: location,
          color: clusterColors[clusterIndex % clusterColors.length],
          devices: devices,
          centroid: calculateCentroid(devices),
        });
        clusterIndex++;
      });

      return clusters.sort((a, b) => b.devices.length - a.devices.length);
    };

    // Calculate centroid of devices (if coordinates available)
    const calculateCentroid = (
      devices: Device[]
    ): { lat: number; lng: number } | undefined => {
      const devicesWithCoords = devices.filter((d) => d.coordinates);
      if (!devicesWithCoords.length) return undefined;

      const avgLat =
        devicesWithCoords.reduce((sum, d) => sum + (d.coordinates?.lat || 0), 0) /
        devicesWithCoords.length;
      const avgLng =
        devicesWithCoords.reduce((sum, d) => sum + (d.coordinates?.lng || 0), 0) /
        devicesWithCoords.length;

      return { lat: avgLat, lng: avgLng };
    };

    const clusters = computed(() => clusterDevices(props.devices));

    const getClusterCardStyle = (cluster: Cluster) => ({
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      transform: hoveredClusterId.value === cluster.id ? "translateY(-8px) scale(1.02)" : "translateY(0)",
      boxShadow:
        hoveredClusterId.value === cluster.id
          ? `0 12px 24px ${cluster.color}40`
          : "0 2px 4px rgba(0,0,0,0.1)",
    });

    const getOnlineCount = (cluster: Cluster) =>
      cluster.devices.filter((d) => d.status === "online").length;

    const getOfflineCount = (cluster: Cluster) =>
      cluster.devices.filter((d) => d.status === "offline").length;

    const selectCluster = (cluster: Cluster) => {
      selectedCluster.value = cluster;
      emit("clusterSelected", cluster);
    };

    const toggleClusterAnimation = () => {
      animatingCluster.value = !animatingCluster.value;

      if (animatingCluster.value) {
        let colorIndex = 0;
        animationInterval = setInterval(() => {
          const clusterElements = document.querySelectorAll(".cluster-card");
          clusterElements.forEach((el, index) => {
            const element = el as HTMLElement;
            if (index === colorIndex % clusterElements.length) {
              element.classList.add("pulse-animation");
              setTimeout(() => element.classList.remove("pulse-animation"), 600);
            }
          });
          colorIndex++;
        }, 800);
      } else {
        if (animationInterval) clearInterval(animationInterval);
      }
    };

    onUnmounted(() => {
      if (animationInterval) clearInterval(animationInterval);
    });

    return {
      viewMode,
      clusters,
      hoveredClusterId,
      selectedCluster,
      animatingCluster,
      getClusterCardStyle,
      getOnlineCount,
      getOfflineCount,
      selectCluster,
      toggleClusterAnimation,
    };
  },
});
</script>

<style scoped>
.zone-cluster-overlay {
  animation: fadeIn 0.4s ease-in;
}

.cluster-controls {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.cluster-controls .btn {
  transition: all 0.3s ease;
}

.cluster-controls .btn.active {
  background-color: #007bff;
  border-color: #007bff;
  color: white;
}

.clusters-container {
  animation: slideUp 0.3s ease-out;
}

.cluster-card {
  background: white;
  border: 2px solid transparent;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.cluster-card:hover {
  border-color: currentColor;
}

.cluster-overlay-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.1;
  z-index: 0;
}

.cluster-content {
  z-index: 2;
}

.cluster-hovered {
  animation: pulseGlow 0.6s ease-out;
}

.device-mini-list {
  font-size: 0.85rem;
}

.device-mini-item {
  padding: 0.25rem 0;
}

.cluster-details-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
  padding: 1rem;
}

.cluster-details-card {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease-out;
}

.cluster-details-header {
  border-bottom: 2px solid #e9ecef;
}

.bg-secondary-light {
  background-color: #6c757d30 !important;
}

.pulse-animation {
  animation: pulse 0.6s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulseGlow {
  0% {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  50% {
    filter: brightness(1.05);
  }
  100% {
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
}

.cursor-pointer {
  cursor: pointer;
}

.btn-close {
  z-index: 10;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .cluster-details-overlay {
    padding: 0;
  }

  .cluster-details-card {
    border-radius: 12px 12px 0 0;
    max-height: 90vh;
  }
}
</style>
