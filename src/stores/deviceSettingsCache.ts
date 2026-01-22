import { ref, computed } from 'vue';

/**
 * Device Settings Cache Store
 * 
 * This store manages a local cache of device settings that accumulates updates before sending.
 * Instead of sending settings immediately upon each change, updates are staged locally.
 * When ready, all accumulated changes are sent together with the complete settings payload.
 * 
 * Benefits:
 * - Prevents partial/inconsistent data being sent to device
 * - Allows batching multiple setting updates
 * - Ensures non-updated fields are always included in payload
 * - Better user experience with control over when to apply settings
 */

interface SettingsCache {
  [deviceId: string]: {
    originalSettings: Record<string, any>;
    stagedChanges: Record<string, any>;
    lastUpdate: number;
  };
}

// Global cache store
const cache = ref<SettingsCache>({});

/**
 * Initialize cache for a device with its current settings
 */
export function initializeDeviceCache(deviceId: string, currentSettings: Record<string, any>) {
  if (!cache.value[deviceId]) {
    cache.value[deviceId] = {
      originalSettings: { ...currentSettings },
      stagedChanges: {},
      lastUpdate: Date.now()
    };
    console.log(`📦 [CACHE] Initialized cache for device ${deviceId}:`, currentSettings);
  }
}

/**
 * Stage a single setting update locally without sending
 */
export function stageSettingUpdate(deviceId: string, key: string, value: any) {
  if (!cache.value[deviceId]) {
    console.warn(`⚠️ [CACHE] No cache initialized for device ${deviceId}`);
    return;
  }

  cache.value[deviceId].stagedChanges[key] = value;
  cache.value[deviceId].lastUpdate = Date.now();
  console.log(`📝 [CACHE] Staged update for device ${deviceId}: ${key} = ${value}`);
  console.log(`   Current staged changes:`, cache.value[deviceId].stagedChanges);
}

/**
 * Stage multiple setting updates at once
 */
export function stageMultipleUpdates(deviceId: string, updates: Record<string, any>) {
  if (!cache.value[deviceId]) {
    console.warn(`⚠️ [CACHE] No cache initialized for device ${deviceId}`);
    return;
  }

  Object.assign(cache.value[deviceId].stagedChanges, updates);
  cache.value[deviceId].lastUpdate = Date.now();
  console.log(`📝 [CACHE] Staged multiple updates for device ${deviceId}:`, updates);
  console.log(`   Current staged changes:`, cache.value[deviceId].stagedChanges);
}

/**
 * Get the complete settings payload with all non-updated values + staged changes
 * This ensures the device always receives a complete settings frame
 * Filters out lowercase/camelCase versions to prevent duplicates
 */
export function getCompleteSettingsPayload(deviceId: string): Record<string, any> {
  if (!cache.value[deviceId]) {
    console.warn(`⚠️ [CACHE] No cache initialized for device ${deviceId}`);
    return {};
  }

  const deviceCache = cache.value[deviceId];
  
  // Start with original settings (includes all existing values)
  const completePayload = { ...deviceCache.originalSettings };
  
  // Override with any staged changes
  Object.assign(completePayload, deviceCache.stagedChanges);
  
  // Filter to only include capitalized/proper parameter names
  // Remove any lowercase or camelCase versions to prevent duplicates
  const filteredPayload: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(completePayload)) {
    // Keep: Capitalized names like "Electrode", "Event", "Interrupt Start TimeStamp"
    // Also keep: Special names like "Depolarization_interval", "logging_interval"
    // Remove: Lowercase/camelCase versions like "event", "electrode", "interruptStartTimestamp"
    
    // Skip lowercase/camelCase versions
    if (
      key === 'event' ||
      key === 'electrode' ||
      key === 'mode' ||
      key === 'manualModeAction' ||
      key === 'shuntVoltage' ||
      key === 'shuntCurrent' ||
      key === 'referenceFail' ||
      key === 'referenceUP' ||
      key === 'referenceOP' ||
      key === 'referenceOV' ||
      key === 'di1' ||
      key === 'di2' ||
      key === 'di3' ||
      key === 'di4' ||
      key === 'interruptOnTime' ||
      key === 'interruptOffTime' ||
      key === 'interruptStartTimestamp' ||
      key === 'interruptStopTimestamp' ||
      key === 'dpolInterval' ||
      key === 'depolarizationStartTimestamp' ||
      key === 'depolarizationStopTimestamp' ||
      key === 'instantMode' ||
      key === 'instantStartTimestamp' ||
      key === 'instantEndTimestamp' ||
      key === 'loggingInterval' ||
      key === 'logging_Interval'
    ) {
      console.log(`🔍 [CACHE] Filtering out duplicate/lowercase parameter: ${key}`);
      continue;
    }
    
    // Keep all other parameters (capitalized names, special formats)
    filteredPayload[key] = value;
  }
  
  console.log(`📦 [CACHE] Complete settings payload for device ${deviceId}:`);
  console.log(`   Original fields: `, Object.keys(deviceCache.originalSettings));
  console.log(`   Staged changes:  `, Object.keys(deviceCache.stagedChanges));
  console.log(`   After filtering: `, Object.keys(filteredPayload));
  
  return filteredPayload;
}

/**
 * Get only the staged changes (delta)
 */
export function getStagedChanges(deviceId: string): Record<string, any> {
  if (!cache.value[deviceId]) {
    return {};
  }
  return { ...cache.value[deviceId].stagedChanges };
}

/**
 * Check if there are any staged changes
 */
export function hasStagedChanges(deviceId: string): boolean {
  if (!cache.value[deviceId]) {
    return false;
  }
  return Object.keys(cache.value[deviceId].stagedChanges).length > 0;
}

/**
 * Get all staged changes with a summary
 */
export function getStagedChangesSummary(deviceId: string) {
  if (!cache.value[deviceId]) {
    return { count: 0, changes: {} };
  }

  const staged = cache.value[deviceId].stagedChanges;
  return {
    count: Object.keys(staged).length,
    changes: staged,
    lastUpdate: cache.value[deviceId].lastUpdate
  };
}

/**
 * Clear staged changes after successfully sending
 * Updates the original settings with the sent values
 */
export function clearStagedChanges(deviceId: string) {
  if (!cache.value[deviceId]) {
    return;
  }

  // Merge staged changes into original settings for next time
  Object.assign(
    cache.value[deviceId].originalSettings,
    cache.value[deviceId].stagedChanges
  );

  // Clear staged changes
  cache.value[deviceId].stagedChanges = {};
  cache.value[deviceId].lastUpdate = Date.now();
  
  console.log(`✅ [CACHE] Cleared staged changes for device ${deviceId}`);
  console.log(`   Updated original settings:`, cache.value[deviceId].originalSettings);
}

/**
 * Update the device's original settings (called when device sends new settings)
 */
export function updateOriginalSettings(deviceId: string, newSettings: Record<string, any>) {
  if (!cache.value[deviceId]) {
    console.warn(`⚠️ [CACHE] No cache initialized for device ${deviceId}`);
    return;
  }

  cache.value[deviceId].originalSettings = { ...newSettings };
  cache.value[deviceId].lastUpdate = Date.now();
  
  console.log(`🔄 [CACHE] Updated original settings for device ${deviceId}:`, newSettings);
}

/**
 * Discard staged changes without sending
 */
export function discardStagedChanges(deviceId: string) {
  if (!cache.value[deviceId]) {
    return;
  }

  cache.value[deviceId].stagedChanges = {};
  cache.value[deviceId].lastUpdate = Date.now();
  
  console.log(`❌ [CACHE] Discarded staged changes for device ${deviceId}`);
}

/**
 * Get the current cache for a device (for debugging)
 */
export function getDeviceCache(deviceId: string) {
  return cache.value[deviceId] || null;
}

/**
 * Clear entire cache for a device
 */
export function clearDeviceCache(deviceId: string) {
  delete cache.value[deviceId];
  console.log(`🗑️ [CACHE] Cleared cache for device ${deviceId}`);
}

/**
 * Get all devices in cache
 */
export function getAllDevicesInCache() {
  return Object.keys(cache.value);
}

/**
 * Export the cache ref for reactive use in components
 */
export function useDeviceSettingsCache() {
  return {
    cache: computed(() => cache.value),
    initializeDeviceCache,
    stageSettingUpdate,
    stageMultipleUpdates,
    getCompleteSettingsPayload,
    getStagedChanges,
    hasStagedChanges,
    getStagedChangesSummary,
    clearStagedChanges,
    updateOriginalSettings,
    discardStagedChanges,
    getDeviceCache,
    clearDeviceCache,
    getAllDevicesInCache
  };
}
