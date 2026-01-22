import { ref } from 'vue';
import ApiService from '@/core/services/ApiService';

export interface IAlarm {
  id: number;
  name: string;
  device_name: string;
  unit_no: string;
  location: string;
  parameter: string;
  alarm_type: string;
  status: string;
  severity: 'critical' | 'warning' | 'info' | 'ok' | 'battery';
  pv_values: {
    pv1: number;
    pv2: number;
    pv3: number;
    pv4: number;
    pv5: number;
    pv6: number;
  };
  notification_config: {
    sms_numbers: string[];
    email_ids: string[];
  };
  link: string;
  created_at: string;
  last_modified: string;
}

export interface IDevice {
  id: string;
  name: string;
  unit_no: string;
  location: string;
  alarm_count: number;
  status: 'critical' | 'warning' | 'info' | 'ok' | 'battery';
  device_type: 'sensor' | 'motor' | 'pump' | 'ups' | 'controller';
  last_update: string;
  pv_preview: number[];
}

class AlarmService {
  private alarms = ref<IAlarm[]>([]);
  private devices = ref<IDevice[]>([]);
  private loading = ref(false);
  private error = ref<string | null>(null);

  /**
   * Get all alarms
   */
  async getAllAlarms(): Promise<IAlarm[]> {
    this.loading.value = true;
    this.error.value = null;

    try {
      const response = await ApiService.get('/api/alarms');
      if (response.data.success) {
        this.alarms.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch alarms');
      }
    } catch (error) {
      this.error.value = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error fetching alarms:', error);
      throw error;
    } finally {
      this.loading.value = false;
    }
  }

  /**
   * Get alarm by ID
   */
  async getAlarmById(id: number): Promise<IAlarm> {
    this.loading.value = true;
    this.error.value = null;

    try {
      const response = await ApiService.get(`/api/alarms/${id}`);
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch alarm');
      }
    } catch (error) {
      this.error.value = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error fetching alarm:', error);
      throw error;
    } finally {
      this.loading.value = false;
    }
  }

  /**
   * Create new alarm
   */
  async createAlarm(alarmData: Omit<IAlarm, 'id' | 'created_at' | 'last_modified'>): Promise<IAlarm> {
    this.loading.value = true;
    this.error.value = null;

    try {
      const response = await ApiService.post('/api/alarms', alarmData);
      if (response.data.success) {
        const newAlarm = response.data.data;
        this.alarms.value.push(newAlarm);
        return newAlarm;
      } else {
        throw new Error(response.data.message || 'Failed to create alarm');
      }
    } catch (error) {
      this.error.value = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error creating alarm:', error);
      throw error;
    } finally {
      this.loading.value = false;
    }
  }

  /**
   * Update alarm
   */
  async updateAlarm(id: number, alarmData: Partial<IAlarm>): Promise<IAlarm> {
    this.loading.value = true;
    this.error.value = null;

    try {
      const response = await ApiService.put(`/api/alarms/${id}`, alarmData);
      if (response.data.success) {
        const updatedAlarm = response.data.data;
        const index = this.alarms.value.findIndex(alarm => alarm.id === id);
        if (index !== -1) {
          this.alarms.value[index] = updatedAlarm;
        }
        return updatedAlarm;
      } else {
        throw new Error(response.data.message || 'Failed to update alarm');
      }
    } catch (error) {
      this.error.value = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error updating alarm:', error);
      throw error;
    } finally {
      this.loading.value = false;
    }
  }

  /**
   * Delete alarm
   */
  async deleteAlarm(id: number): Promise<void> {
    this.loading.value = true;
    this.error.value = null;

    try {
      const response = await ApiService.delete(`/api/alarms/${id}`);
      if (response.data.success) {
        this.alarms.value = this.alarms.value.filter(alarm => alarm.id !== id);
      } else {
        throw new Error(response.data.message || 'Failed to delete alarm');
      }
    } catch (error) {
      this.error.value = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error deleting alarm:', error);
      throw error;
    } finally {
      this.loading.value = false;
    }
  }

  /**
   * Send SMS notification for alarm
   */
  async sendSMSNotification(id: number): Promise<any> {
    this.loading.value = true;
    this.error.value = null;

    try {
      const response = await ApiService.post(`/api/alarms/${id}/send-sms`);
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to send SMS notification');
      }
    } catch (error) {
      this.error.value = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error sending SMS notification:', error);
      throw error;
    } finally {
      this.loading.value = false;
    }
  }

  /**
   * Send email notification for alarm
   */
  async sendEmailNotification(id: number): Promise<any> {
    this.loading.value = true;
    this.error.value = null;

    try {
      const response = await ApiService.post(`/api/alarms/${id}/send-email`);
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to send email notification');
      }
    } catch (error) {
      this.error.value = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error sending email notification:', error);
      throw error;
    } finally {
      this.loading.value = false;
    }
  }

  /**
   * Trigger alarm notification (both SMS and email)
   */
  async triggerAlarmNotification(id: number): Promise<any> {
    this.loading.value = true;
    this.error.value = null;

    try {
      const response = await ApiService.post(`/api/alarms/${id}/trigger-notification`);
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to trigger alarm notification');
      }
    } catch (error) {
      this.error.value = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error triggering alarm notification:', error);
      throw error;
    } finally {
      this.loading.value = false;
    }
  }

  /**
   * Get device status summary for dashboard
   */
  async getDeviceStatusSummary(): Promise<IDevice[]> {
    this.loading.value = true;
    this.error.value = null;

    try {
      const response = await ApiService.get('/api/alarms/dashboard/device-status');
      if (response.data.success) {
        this.devices.value = response.data.data;
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch device status');
      }
    } catch (error) {
      this.error.value = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error fetching device status:', error);
      throw error;
    } finally {
      this.loading.value = false;
    }
  }

  // Getters for reactive data
  get alarmsData() {
    return this.alarms;
  }

  get devicesData() {
    return this.devices;
  }

  get isLoading() {
    return this.loading;
  }

  get errorMessage() {
    return this.error;
  }

  // Clear error
  clearError() {
    this.error.value = null;
  }

  /**
   * Get alarm history/log (triggered alarms from past)
   */
  async getAlarmHistory(options?: { device_name?: string; limit?: number; page?: number; days?: number }): Promise<any[]> {
    this.loading.value = true;
    this.error.value = null;

    try {
      const params = new URLSearchParams();
      if (options?.device_name) params.append('device_name', options.device_name);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.page) params.append('page', options.page.toString());
      if (options?.days) params.append('days', options.days.toString());

      const response = await ApiService.get(`/api/alarms/history/log${params.toString() ? '?' + params.toString() : ''}`);
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch alarm history');
      }
    } catch (error) {
      this.error.value = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error fetching alarm history:', error);
      throw error;
    } finally {
      this.loading.value = false;
    }
  }
}

// Export singleton instance
export const alarmService = new AlarmService();
export default alarmService;