import { ref, computed } from 'vue';
import { useDeviceSettingsCache } from '@/stores/deviceSettingsCache';
import { mqttService } from '@/services/mqtt.service';
import Swal from 'sweetalert2';

/**
 * Composable for managing device settings with local caching
 * 
 * Usage in components:
 * const { stageUpdate, sendStagedChanges, getStagedSummary, hasPendingChanges } = useDeviceSettingsCaching(deviceId);
 * 
 * Example workflow:
 * 1. stageUpdate('Electrode', 'Zinc')  - Update staged locally
 * 2. stageUpdate('Mode', 'Normal')      - Add another update
 * 3. sendStagedChanges()                - Send all accumulated changes
 */

export function useDeviceSettingsCaching(deviceId: string) {
  const {
    initializeDeviceCache,
    stageSettingUpdate,
    stageMultipleUpdates,
    getCompleteSettingsPayload,
    getStagedChanges,
    hasStagedChanges,
    getStagedChangesSummary,
    clearStagedChanges,
    updateOriginalSettings,
    discardStagedChanges
  } = useDeviceSettingsCache();

  const isSending = ref(false);
  const lastSentChanges = ref<Record<string, any>>({});

  /**
   * Initialize cache with current device settings
   * Filters out deprecated logging interval keys to prevent them from appearing as changes
   */
  const initializeSettings = (currentSettings: Record<string, any>) => {
    // Filter out old/deprecated logging interval keys
    const filteredSettings = { ...currentSettings };
    delete filteredSettings['loggingInterval'];
    delete filteredSettings['loggingIntervalFormatted'];
    
    initializeDeviceCache(deviceId, filteredSettings);
  };

  /**
   * Stage a single setting update
   */
  const stageUpdate = (key: string, value: any) => {
    stageSettingUpdate(deviceId, key, value);
  };

  /**
   * Stage multiple updates at once
   */
  const stageBatchUpdates = (updates: Record<string, any>) => {
    stageMultipleUpdates(deviceId, updates);
  };

  /**
   * Get summary of what will be sent
   */
  const getStagedSummary = () => {
    return getStagedChangesSummary(deviceId);
  };

  /**
   * Check if there are pending changes to send
   */
  const hasPendingChanges = computed(() => hasStagedChanges(deviceId));

  /**
   * Get the complete payload that will be sent
   */
  const getPayload = () => {
    return getCompleteSettingsPayload(deviceId);
  };

  /**
   * Send all staged changes to device
   * Returns the complete payload that was sent
   */
  const sendStagedChanges = async (): Promise<Record<string, any> | null> => {
    try {
      if (!hasStagedChanges(deviceId)) {
        console.log('⚠️ No staged changes to send');
        await Swal.fire({
          icon: 'info',
          title: 'No Changes',
          text: 'There are no pending changes to send',
          timer: 2000,
          showConfirmButton: false
        });
        return null;
      }

      isSending.value = true;
      const summary = getStagedChangesSummary(deviceId);
      
      console.log(`📤 Sending ${summary.count} staged changes for device ${deviceId}...`);
      console.log('   Changes:', summary.changes);

      // Get complete payload with all fields
      const completePayload = getCompleteSettingsPayload(deviceId);

      // Send to backend
      const response = await mqttService.sendCompleteSettingsPayload(deviceId, completePayload);

      console.log(`📥 Response from backend:`, response);

      if (response && response.success) {
        lastSentChanges.value = { ...getStagedChanges(deviceId) };
        
        // Clear staged changes after successful send
        console.log(`🧹 Clearing staged changes for device ${deviceId}...`);
        clearStagedChanges(deviceId);
        console.log(`✅ Cleared staged changes - cache state updated`);

        console.log(`✅ All ${summary.count} changes sent successfully`);
        
        await Swal.fire({
          icon: 'success',
          title: 'Changes Applied',
          text: `${summary.count} setting(s) updated and sent to device`,
          timer: 2000,
          showConfirmButton: false
        });

        return completePayload;
      } else {
        const errorMsg = response?.error || 'Failed to send settings';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Error sending staged changes:', error);
      
      await Swal.fire({
        icon: 'error',
        title: 'Send Failed',
        text: error.message || 'Failed to send settings changes'
      });

      return null;
    } finally {
      isSending.value = false;
    }
  };

  /**
   * Discard all pending changes without sending
   */
  const discardChanges = async () => {
    if (!hasStagedChanges(deviceId)) {
      return;
    }

    const result = await Swal.fire({
      icon: 'warning',
      title: 'Discard Changes?',
      text: 'Are you sure you want to discard all pending settings changes?',
      showCancelButton: true,
      confirmButtonText: 'Discard',
      confirmButtonColor: '#d33'
    });

    if (result.isConfirmed) {
      discardStagedChanges(deviceId);
      console.log('✅ Discarded staged changes');
      
      await Swal.fire({
        icon: 'success',
        title: 'Changes Discarded',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  /**
   * Get detailed change summary for UI display
   */
  const getChangeSummaryForUI = () => {
    const summary = getStagedChangesSummary(deviceId);
    const changes: Array<{ key: string; value: any }> = [];
    
    Object.entries(summary.changes).forEach(([key, value]) => {
      changes.push({ key, value });
    });

    return {
      hasChanges: summary.count > 0,
      changeCount: summary.count,
      changes,
      formatted: changes.map(c => `${c.key}: ${c.value}`).join(', ')
    };
  };

  /**
   * Apply a setting immediately and stage it
   * Useful for UI that needs instant feedback while still using cache
   */
  const applyAndStageUpdate = async (
    key: string,
    value: any,
    onApply?: () => Promise<void> | void
  ) => {
    try {
      // Apply change in UI immediately
      if (onApply) {
        await onApply();
      }

      // Stage the change for later sending
      stageUpdate(key, value);
      
      console.log(`✅ Applied and staged: ${key} = ${value}`);
    } catch (error: any) {
      console.error(`❌ Error applying update: ${key}`, error);
      throw error;
    }
  };

  return {
    // Configuration
    initializeSettings,
    
    // Staging
    stageUpdate,
    stageBatchUpdates,
    applyAndStageUpdate,
    
    // Query
    getStagedSummary,
    hasPendingChanges,
    getPayload,
    getChangeSummaryForUI,
    
    // Sending
    sendStagedChanges,
    discardChanges,
    isSending,
    lastSentChanges,
    
    // Cache management
    updateOriginalSettings
  };
}
