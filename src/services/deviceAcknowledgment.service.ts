import ApiService from '@/core/services/ApiService';

class DeviceAcknowledgmentService {
  /**
   * Get acknowledgment status for a specific command
   */
  static async getCommandStatus(commandId: string) {
    try {
      const response = await ApiService.get(`/device-acknowledgment/command/${commandId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting command status:', error);
      throw error;
    }
  }

  /**
   * Get all acknowledgments for a device
   */
  static async getDeviceAcknowledgments(deviceId: string, params: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());

      const response = await ApiService.get(
        `/device-acknowledgment/device/${deviceId}?${queryParams.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting device acknowledgments:', error);
      throw error;
    }
  }

  /**
   * Get acknowledgment statistics for a device
   */
  static async getDeviceAckStats(deviceId: string, fromDate?: Date) {
    try {
      const queryParams = new URLSearchParams();
      if (fromDate) queryParams.append('fromDate', fromDate.toISOString());

      const response = await ApiService.get(
        `/device-acknowledgment/device/${deviceId}/stats?${queryParams.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting device acknowledgment stats:', error);
      throw error;
    }
  }

  /**
   * Get pending acknowledgments for a device
   */
  static async getPendingAcknowledgments(deviceId: string) {
    try {
      const response = await ApiService.get(`/device-acknowledgment/device/${deviceId}/pending`);
      return response.data;
    } catch (error) {
      console.error('Error getting pending acknowledgments:', error);
      throw error;
    }
  }

  /**
   * Retry a failed or timed out command
   */
  static async retryCommand(commandId: string) {
    try {
      const response = await ApiService.post(`/device-acknowledgment/command/${commandId}/retry`);
      return response.data;
    } catch (error) {
      console.error('Error retrying command:', error);
      throw error;
    }
  }

  /**
   * Get system-wide acknowledgment overview
   */
  static async getSystemAckOverview(fromDate?: Date) {
    try {
      const queryParams = new URLSearchParams();
      if (fromDate) queryParams.append('fromDate', fromDate.toISOString());

      const response = await ApiService.get(
        `/device-acknowledgment/system/overview?${queryParams.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting system acknowledgment overview:', error);
      throw error;
    }
  }

  /**
   * Send device configuration with acknowledgment tracking
   */
  static async sendDeviceConfiguration(deviceId: string, configType: string, configData: any) {
    try {
      const endpoint = `/devices/${deviceId}/config/${configType.toLowerCase()}`;
      const response = await ApiService.post(endpoint, configData);
      return response.data;
    } catch (error) {
      console.error('Error sending device configuration:', error);
      throw error;
    }
  }

  /**
   * Format acknowledgment status for display
   */
  static formatAckStatus(status: string): { text: string; color: string; icon: string } {
    const statusMap = {
      'PENDING': { text: 'Pending', color: 'warning', icon: 'clock' },
      'SUCCESS': { text: 'Acknowledged', color: 'success', icon: 'check-circle' },
      'FAILED': { text: 'Failed', color: 'danger', icon: 'x-circle' },
      'TIMEOUT': { text: 'Timeout', color: 'secondary', icon: 'clock-history' }
    };

    return statusMap[status] || { text: 'Unknown', color: 'secondary', icon: 'question-circle' };
  }

  /**
   * Format response time for display
   */
  static formatResponseTime(responseTime: number | null): string {
    if (!responseTime) return 'N/A';
    
    if (responseTime < 1000) {
      return `${responseTime}ms`;
    } else {
      return `${(responseTime / 1000).toFixed(1)}s`;
    }
  }

  /**
   * Calculate remaining timeout time
   */
  static calculateRemainingTime(sentAt: Date, timeout: number): number {
    const sentTime = new Date(sentAt).getTime();
    const now = Date.now();
    const elapsed = now - sentTime;
    return Math.max(0, timeout - elapsed);
  }

  /**
   * Format remaining time for display
   */
  static formatRemainingTime(remainingTime: number): string {
    if (remainingTime <= 0) return 'Expired';
    
    const seconds = Math.ceil(remainingTime / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    }
  }

  /**
   * Get acknowledgment status color class for Bootstrap
   */
  static getStatusColorClass(status: string): string {
    const colorMap = {
      'PENDING': 'text-warning',
      'SUCCESS': 'text-success',
      'FAILED': 'text-danger',
      'TIMEOUT': 'text-secondary'
    };

    return colorMap[status] || 'text-secondary';
  }

  /**
   * Get acknowledgment status badge class for Bootstrap
   */
  static getStatusBadgeClass(status: string): string {
    const badgeMap = {
      'PENDING': 'badge-warning',
      'SUCCESS': 'badge-success',
      'FAILED': 'badge-danger',
      'TIMEOUT': 'badge-secondary'
    };

    return badgeMap[status] || 'badge-secondary';
  }
}

export default DeviceAcknowledgmentService;