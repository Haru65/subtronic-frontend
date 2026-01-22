/**
 * Device Routes Configuration
 * 
 * This file contains route definitions for the device management section
 * with proper authentication guards, page titles, and breadcrumbs.
 */

import type { RouteRecordRaw } from 'vue-router';

/**
 * Device-related routes
 */
export const deviceRoutes: RouteRecordRaw[] = [
  {
    path: '/devices',
    name: 'devices',
    component: () => import('@/views/apps/iot/devices/DevicesWithZones.vue'),
    meta: {
      pageTitle: 'Devices',
      breadcrumbs: ['IOT', 'Devices'],
      requiresAuth: true,
      permissions: ['read_devices'], // Required permission
    },
  },
  {
    path: '/devices/:deviceId',
    name: 'device-details',
    component: () => import('@/views/apps/iot/devices/DeviceDetailsPage.vue'),
    meta: {
      pageTitle: 'Device Details',
      breadcrumbs: ['IOT', 'Devices', 'Details'],
      requiresAuth: true,
      permissions: ['read_devices'],
    },
    // Route guard to validate deviceId parameter
    beforeEnter: (to, from, next) => {
      const deviceId = to.params.deviceId as string;
      
      // Validate deviceId format (numeric or DEVICE_XXX)
      const isValidFormat = /^\d+$/.test(deviceId) || /^DEVICE_\d+$/i.test(deviceId);
      
      if (!isValidFormat) {
        console.error('Invalid device ID format:', deviceId);
        next({ name: 'devices' }); // Redirect to device list
        return;
      }
      
      next();
    },
  },
  // Alternative route using numeric ID format
  {
    path: '/device/:id(\\d+)',
    redirect: to => {
      return { name: 'device-details', params: { deviceId: to.params.id } };
    },
  },
];

/**
 * Navigation helper functions
 */
export const deviceNavigation = {
  /**
   * Navigate to device list
   */
  toDeviceList: () => ({ name: 'devices' }),
  
  /**
   * Navigate to device details
   */
  toDeviceDetails: (deviceId: string | number) => ({
    name: 'device-details',
    params: { deviceId: String(deviceId) },
  }),
  
  /**
   * Get device detail URL
   */
  getDeviceUrl: (deviceId: string | number): string => {
    return `/devices/${deviceId}`;
  },
};

/**
 * Type-safe route names
 */
export enum DeviceRouteNames {
  DEVICES = 'devices',
  DEVICE_DETAILS = 'device-details',
}

/**
 * Extended meta type for device routes
 */
declare module 'vue-router' {
  interface RouteMeta {
    pageTitle?: string;
    breadcrumbs?: string[];
    requiresAuth?: boolean;
    permissions?: string[];
  }
}

export default deviceRoutes;
