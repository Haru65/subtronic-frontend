<template>
  <div
    class="modal fade"
    tabindex="-1"
    id="add_alarm_modal"
    ref="newAddressModalRef"
    aria-labelledby="addAlarmModalLabel"
  >
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title" id="addAlarmModalLabel">Add New Alarm</h3>
          <div
            class="btn btn-icon btn-sm btn-active-light-primary ms-2"
            data-bs-dismiss="modal"
            aria-label="Close modal"
          >
            <i class="ki-duotone ki-cross fs-1">
              <span class="path1"></span>
              <span class="path2"></span>
            </i>
          </div>
        </div>

        <div class="modal-body">
          <VForm
            @submit="saveAlarm"
            :validation-schema="validationSchema"
            id="add_alarm_form"
          >
            <div class="row mb-6">
              <!-- Alarm Name -->
              <div class="col-md-6 form-group mb-6">
                <label class="form-label required fs-5 fw-bold text-gray-700 mb-2">
                  Alarm Name
                </label>
                <Field
                  name="name"
                  v-model="formData.name"
                  type="text"
                  class="form-control form-control-solid"
                  placeholder="Enter Alarm Name"
                  aria-label="Alarm Name"
                />
                <ErrorMessage name="name" class="text-danger mt-1" />
              </div>
              <!-- Device Name -->
              <div class="col-md-6 form-group mb-6">
                <label class="form-label required fs-5 fw-bold text-gray-700 mb-2">
                  Device Name
                </label>
                <Field
                  name="device_name"
                  as="select"
                  v-model="formData.device_name"
                  class="form-control form-control-solid"
                  aria-label="Device Name"
                  :disabled="loadingDevices"
                >
                  <option value="" disabled>
                    {{ loadingDevices ? 'Loading devices...' : 'Select Device' }}
                  </option>
                  <option v-for="device in devices" :key="device" :value="device">
                    {{ device }}
                  </option>
                </Field>
                <ErrorMessage name="device_name" class="text-danger mt-1" />
              </div>
            </div>

            <div class="row mb-6">
              <!-- Device Parameters Section -->
              <div class="col-12">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <label class="form-label fs-5 fw-bold text-gray-700 mb-0">
                    Device Parameters (from Device)
                  </label>
                  <span v-if="loadingDeviceParams" class="spinner-border spinner-border-sm text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                  </span>
                </div>
                <div class="row">
                  <div class="col-md-4">
                    <label class="form-label text-gray-600 mb-1">Ref 1 - Upper</label>
                    <Field
                      name="device_params.ref_1_upper"
                      v-model="formData.device_params.ref_1_upper"
                      type="number"
                      step="0.1"
                      class="form-control form-control-solid"
                      placeholder="Upper Value"
                    />
                    <label class="form-label text-gray-600 mb-1 mt-2">Ref 1 - Lower</label>
                    <Field
                      name="device_params.ref_1_lower"
                      v-model="formData.device_params.ref_1_lower"
                      type="number"
                      step="0.1"
                      class="form-control form-control-solid"
                      placeholder="Lower Value"
                    />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label text-gray-600 mb-1">Ref 2 - Upper</label>
                    <Field
                      name="device_params.ref_2_upper"
                      v-model="formData.device_params.ref_2_upper"
                      type="number"
                      step="0.1"
                      class="form-control form-control-solid"
                      placeholder="Upper Value"
                    />
                    <label class="form-label text-gray-600 mb-1 mt-2">Ref 2 - Lower</label>
                    <Field
                      name="device_params.ref_2_lower"
                      v-model="formData.device_params.ref_2_lower"
                      type="number"
                      step="0.1"
                      class="form-control form-control-solid"
                      placeholder="Lower Value"
                    />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label text-gray-600 mb-1">Ref 3 - Upper</label>
                    <Field
                      name="device_params.ref_3_upper"
                      v-model="formData.device_params.ref_3_upper"
                      type="number"
                      step="0.1"
                      class="form-control form-control-solid"
                      placeholder="Upper Value"
                    />
                    <label class="form-label text-gray-600 mb-1 mt-2">Ref 3 - Lower</label>
                    <Field
                      name="device_params.ref_3_lower"
                      v-model="formData.device_params.ref_3_lower"
                      type="number"
                      step="0.1"
                      class="form-control form-control-solid"
                      placeholder="Lower Value"
                    />
                  </div>
                </div>
                <div class="row mt-3">
                  <div class="col-md-4">
                    <label class="form-label text-gray-600 mb-1">DCV - Upper</label>
                    <Field
                      name="device_params.dcv_upper"
                      v-model="formData.device_params.dcv_upper"
                      type="number"
                      step="0.1"
                      class="form-control form-control-solid"
                      placeholder="Upper Value"
                    />
                    <label class="form-label text-gray-600 mb-1 mt-2">DCV - Lower</label>
                    <Field
                      name="device_params.dcv_lower"
                      v-model="formData.device_params.dcv_lower"
                      type="number"
                      step="0.1"
                      class="form-control form-control-solid"
                      placeholder="Lower Value"
                    />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label text-gray-600 mb-1">DCI - Upper</label>
                    <Field
                      name="device_params.dci_upper"
                      v-model="formData.device_params.dci_upper"
                      type="number"
                      step="0.1"
                      class="form-control form-control-solid"
                      placeholder="Upper Value"
                    />
                    <label class="form-label text-gray-600 mb-1 mt-2">DCI - Lower</label>
                    <Field
                      name="device_params.dci_lower"
                      v-model="formData.device_params.dci_lower"
                      type="number"
                      step="0.1"
                      class="form-control form-control-solid"
                      placeholder="Lower Value"
                    />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label text-gray-600 mb-1">ACV - Upper</label>
                    <Field
                      name="device_params.acv_upper"
                      v-model="formData.device_params.acv_upper"
                      type="number"
                      step="0.1"
                      class="form-control form-control-solid"
                      placeholder="Upper Value"
                    />
                    <label class="form-label text-gray-600 mb-1 mt-2">ACV - Lower</label>
                    <Field
                      name="device_params.acv_lower"
                      v-model="formData.device_params.acv_lower"
                      type="number"
                      step="0.1"
                      class="form-control form-control-solid"
                      placeholder="Lower Value"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Notification Configuration -->
            <div class="row mb-6">
              <div class="col-md-6 form-group mb-6">
                <label class="form-label fs-5 fw-bold text-gray-700 mb-2">
                  SMS Numbers (comma-separated)
                </label>
                <Field
                  name="sms_numbers"
                  v-model="smsNumbersString"
                  type="text"
                  class="form-control form-control-solid"
                  placeholder="e.g., +1234567890, +0987654321"
                  aria-label="SMS Numbers"
                />
                <small class="form-text text-muted">Enter phone numbers separated by commas</small>
              </div>
              <div class="col-md-6 form-group mb-6">
                <label class="form-label fs-5 fw-bold text-gray-700 mb-2">
                  Email IDs (comma-separated)
                </label>
                <Field
                  name="email_ids"
                  v-model="emailIdsString"
                  type="text"
                  class="form-control form-control-solid"
                  placeholder="e.g., admin@company.com, tech@company.com"
                  aria-label="Email IDs"
                />
                <small class="form-text text-muted">Enter email addresses separated by commas</small>
              </div>
            </div>

            <div class="row mb-6">
              <!-- Status -->
              <div class="col-md-6 form-group mb-6">
                <label class="form-label required fs-5 fw-bold text-gray-700 mb-2">
                  Status
                </label>
                <Field
                  name="status"
                  as="select"
                  v-model="formData.status"
                  class="form-control form-control-solid"
                  aria-label="Status"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </Field>
                <ErrorMessage name="status" class="text-danger mt-1" />
              </div>

            </div>

            <!-- Device Parameters -->
          </VForm>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-light"
            data-bs-dismiss="modal"
            aria-label="Close modal"
          >
            Close
          </button>
          <button
            ref="submitButtonRef"
            type="submit"
            form="add_alarm_form"
            :data-kt-indicator="dataLoading ? 'on' : ''"
            class="btn btn-success px-6"
            aria-label="Save alarm"
          >
            <span v-if="!dataLoading" class="indicator-label">Save</span>
            <span v-if="dataLoading" class="indicator-progress">
              Please wait...
              <span class="spinner-border spinner-border-sm align-middle ms-2"></span>
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted } from "vue";
import { ErrorMessage, Field, Form as VForm } from "vee-validate";
import * as Yup from "yup";
import moment from "moment";
import Swal from "sweetalert2";
import { hideModal } from "@/core/helpers/dom";
import ApiService from "@/core/services/ApiService";

export default defineComponent({
  name: "add-alarm-modal",
  components: {
    ErrorMessage,
    Field,
    VForm,
  },
  emits: ["add-alarm"],
  setup(props, { emit }) {
    const submitButtonRef = ref<null | HTMLButtonElement>(null);
    const newAddressModalRef = ref<null | HTMLElement>(null);
    const dataLoading = ref(false);
    const loadingDeviceParams = ref(false);
    const loadingDevices = ref(false);

    const devices = ref<string[]>([]);

    const formData = ref({
      name: "",
      device_name: "",
      parameter: "",
      status: "Active",
      severity: "info",
      device_params: {
        ref_1_upper: 0,
        ref_1_lower: 0,
        ref_2_upper: 0,
        ref_2_lower: 0,
        ref_3_upper: 0,
        ref_3_lower: 0,
        dcv_upper: 0,
        dcv_lower: 0,
        dci_upper: 0,
        dci_lower: 0,
        acv_upper: 0,
        acv_lower: 0,
      },
      notification_config: {
        sms_numbers: [],
        email_ids: [],
      },
      created_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      last_modified: moment().format("YYYY-MM-DD HH:mm:ss"),
    });

    // String representations for comma-separated inputs
    const smsNumbersString = ref("");
    const emailIdsString = ref("");

    const validationSchema = Yup.object({
      name: Yup.string().required("Alarm Name is required").label("Alarm Name"),
      device_name: Yup.string().required("Device Name is required").label("Device Name"),
      status: Yup.string().required("Status is required").label("Status"),
    });

    // Validate that lower bounds don't exceed upper bounds
    const validateBounds = () => {
      const params = formData.value.device_params;
      const errors: string[] = [];

      if (params.ref_1_lower > params.ref_1_upper) {
        errors.push("Ref 1: Lower bound cannot exceed upper bound");
      }
      if (params.ref_2_lower > params.ref_2_upper) {
        errors.push("Ref 2: Lower bound cannot exceed upper bound");
      }
      if (params.ref_3_lower > params.ref_3_upper) {
        errors.push("Ref 3: Lower bound cannot exceed upper bound");
      }
      if (params.dcv_lower > params.dcv_upper) {
        errors.push("DCV: Lower bound cannot exceed upper bound");
      }
      if (params.dci_lower > params.dci_upper) {
        errors.push("DCI: Lower bound cannot exceed upper bound");
      }
      if (params.acv_lower > params.acv_upper) {
        errors.push("ACV: Lower bound cannot exceed upper bound");
      }

      return errors;
    };

    // Fetch devices from backend
    const fetchDevices = async () => {
      loadingDevices.value = true;
      try {
        const response = await ApiService.get('/api/devices');
        if (response.data.success && response.data.devices) {
          devices.value = response.data.devices.map((device: any) => device.name || device.deviceName || device.deviceId);
        }
      } catch (error) {
        console.error('Error fetching devices:', error);
        devices.value = [];
      } finally {
        loadingDevices.value = false;
      }
    };

    // Fetch device parameters when device is selected
    const fetchDeviceParameters = async (deviceName: string) => {
      if (!deviceName) return;
      
      loadingDeviceParams.value = true;
      try {
        const response = await ApiService.get(`/api/devices/params/${deviceName}`);
        if (response.data.success && response.data.data) {
          const params = response.data.data.device_params;
          formData.value.device_params = {
            ref_1_upper: params.ref_1_upper || 0,
            ref_1_lower: params.ref_1_lower || 0,
            ref_2_upper: params.ref_2_upper || 0,
            ref_2_lower: params.ref_2_lower || 0,
            ref_3_upper: params.ref_3_upper || 0,
            ref_3_lower: params.ref_3_lower || 0,
            dcv_upper: params.dcv_upper || 0,
            dcv_lower: params.dcv_lower || 0,
            dci_upper: params.dci_upper || 0,
            dci_lower: params.dci_lower || 0,
            acv_upper: params.acv_upper || 0,
            acv_lower: params.acv_lower || 0,
          };
        }
      } catch (error) {
        console.error('Error fetching device parameters:', error);
        // Reset to default values if fetch fails
        formData.value.device_params = {
          ref_1_upper: 0,
          ref_1_lower: 0,
          ref_2_upper: 0,
          ref_2_lower: 0,
          ref_3_upper: 0,
          ref_3_lower: 0,
          dcv_upper: 0,
          dcv_lower: 0,
          dci_upper: 0,
          dci_lower: 0,
          acv_upper: 0,
          acv_lower: 0,
        };
      } finally {
        loadingDeviceParams.value = false;
      }
    };

    // Watch for device_name changes
    watch(() => formData.value.device_name, (newDeviceName) => {
      if (newDeviceName) {
        fetchDeviceParameters(newDeviceName);
      }
    });

    // Fetch devices on component mount
    onMounted(() => {
      fetchDevices();
    });

    const saveAlarm = async () => {
      dataLoading.value = true;
      try {
        // Validate bounds first
        const boundErrors = validateBounds();
        if (boundErrors.length > 0) {
          Swal.fire({
            title: "Validation Error",
            text: boundErrors.join('\n'),
            icon: "error",
            buttonsStyling: false,
            confirmButtonText: "Ok, got it!",
            customClass: { confirmButton: "btn btn-primary" },
          });
          dataLoading.value = false;
          return;
        }

        // Process notification strings into arrays
        const smsNumbers = smsNumbersString.value
          .split(',')
          .map(num => num.trim())
          .filter(num => num.length > 0);
        
        const emailIds = emailIdsString.value
          .split(',')
          .map(email => email.trim())
          .filter(email => email.length > 0);

        const newAlarm = {
          ...formData.value,
          notification_config: {
            sms_numbers: smsNumbers,
            email_ids: emailIds,
          },
        };
        
        // POST the alarm to the backend API - CRITICAL FIX
        console.log('📤 Saving alarm to backend API:', newAlarm);
        const response = await ApiService.post('/api/alarms', newAlarm);
        
        if (response.data.success) {
          // Emit event with the saved alarm including the database ID
          console.log('✅ Alarm saved successfully:', response.data.data);
          emit("add-alarm", response.data.data);
          
          Swal.fire({
            title: "Success",
            text: "Alarm saved successfully to database!",
            icon: "success",
            buttonsStyling: false,
            confirmButtonText: "Ok, got it!",
            customClass: { confirmButton: "btn btn-primary" },
          });
          clearFormData();
          hideModal(newAddressModalRef.value);
        } else {
          throw new Error(response.data.message || 'Failed to save alarm');
        }
      } catch (error: any) {
        console.error('❌ Error saving alarm:', error);
        Swal.fire({
          title: "Error",
          text: error.message || "An error occurred while saving the alarm to the database.",
          icon: "error",
          buttonsStyling: false,
          confirmButtonText: "Ok, got it!",
          customClass: { confirmButton: "btn btn-primary" },
        });
      } finally {
        dataLoading.value = false;
      }
    };

    const clearFormData = () => {
      formData.value = {
        name: "",
        device_name: "",
        parameter: "",
        status: "Active",
        severity: "info",
        device_params: {
          ref_1: 0,
          ref_2: 0,
          ref_3: 0,
          dcv: 0,
          dci: 0,
          acv: 0,
        },
        notification_config: {
          sms_numbers: [],
          email_ids: [],
        },
        created_at: moment().format("YYYY-MM-DD HH:mm:ss"),
        last_modified: moment().format("YYYY-MM-DD HH:mm:ss"),
      };
      // Clear string inputs
      smsNumbersString.value = "";
      emailIdsString.value = "";
    };

    return {
      formData,
      saveAlarm,
      submitButtonRef,
      newAddressModalRef,
      clearFormData,
      dataLoading,
      validationSchema,
      devices,
      smsNumbersString,
      emailIdsString,
      loadingDeviceParams,
      loadingDevices,
    };
  },
});
</script>