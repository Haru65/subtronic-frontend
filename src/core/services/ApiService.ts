import type { App } from "vue";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import axios from "axios";
import VueAxios from "vue-axios";

/**
 * @description service to call HTTP request via Axios
 */
class ApiService {
  /**
   * @description property to share vue instance
   */
  public static vueInstance: App;

  /**
   * @description initialize vue axios
   */
  public static init(app: App<Element>) {
    ApiService.vueInstance = app;
    ApiService.vueInstance.use(VueAxios, axios);
    ApiService.vueInstance.axios.defaults.baseURL =
      import.meta.env.VITE_APP_API_URL;
    // Set default headers
    ApiService.vueInstance.axios.defaults.headers.common["Accept"] = "application/json";
    
    // Setup request interceptor to automatically add auth token - COMMENTED OUT FOR DEVELOPMENT
    // ApiService.vueInstance.axios.interceptors.request.use((config) => {
    //   const token = localStorage.getItem('accessToken');
    //   if (token) {
    //     config.headers.Authorization = `Bearer ${token}`;
    //   }
    //   return config;
    // }, (error) => {
    //   return Promise.reject(error);
    // });

    // Setup response interceptor to handle auth errors - COMMENTED OUT FOR DEVELOPMENT
    // ApiService.vueInstance.axios.interceptors.response.use(
    //   (response) => response,
    //   (error) => {
    //     if (error.response?.status === 401) {
    //       // Unauthorized - clear tokens and redirect to login
    //       console.warn('🔐 Unauthorized access - please login');
    //       localStorage.removeItem('accessToken');
    //       localStorage.removeItem('refreshToken');
    //       localStorage.removeItem('user');
    //       localStorage.removeItem('isAuthenticated');
    //       // Redirect to login page
    //       if (window.location.pathname !== '/login') {
    //         window.location.href = '/login';
    //       }
    //     }
    //     return Promise.reject(error);
    //   }
    // );
  }

  /**
   * @description set the default authorization header
   */
  public static setHeader(): void {
    const token = localStorage.getItem('accessToken');
    if (token) {
      ApiService.vueInstance.axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }

  /**
   * @description set headers for file uploads
   */
  public static imgsetHeader(): void {
    ApiService.vueInstance.axios.defaults.headers.common["Accept"] = "multipart/form-data";
  }

  public static patchsetHeader(): void {
    ApiService.vueInstance.axios.defaults.headers.common["Accept"] = "application/x-www-form-urlencoded";
  }

  /**
   * @description send the GET HTTP request
   * @param resource: string
   * @param params: AxiosRequestConfig
   * @returns Promise<AxiosResponse>
   */
  public static query(resource: string, params: any): Promise<AxiosResponse> {
    return ApiService.vueInstance.axios.get(resource, params);
  }

  /**
   * @description send the GET HTTP request
   * @param resource: string
   * @param slug: string
   * @returns Promise<AxiosResponse>
   */
  public static get(
    resource: string,
    slug = "" as string
  ): Promise<AxiosResponse> {
    return ApiService.vueInstance.axios.get(`${resource}/${slug}`);
  }

  // company listing unique
  public static listingget(
    resource: string,
    slug = "" as string
  ): Promise<AxiosResponse> {
    //console.log(resource);
    //console.log(slug);
    return ApiService.vueInstance.axios.get(`${resource}?${slug}`);
  }

  /**
 * @description set the POST HTTP request
 * @param resource: string
 * @param params: any
 * @param config: Optional AxiosRequestConfig for custom configurations like responseType
 * @returns Promise<AxiosResponse>
 */
  static post(resource: string, params: any, config?: AxiosRequestConfig): Promise<AxiosResponse> {
    // If config is provided, merge it with any default settings
    const requestConfig = config || {};  // Default to an empty object if no config is passed
    return ApiService.vueInstance.axios.post(`${resource}`, params, requestConfig);
  }

  /**
   * @description send the UPDATE HTTP request
   * @param resource: string
   * @param slug: string
   * @param params: AxiosRequestConfig
   * @returns Promise<AxiosResponse>
   */
  public static update(
    resource: string,
    slug: string,
    params: any
  ): Promise<AxiosResponse> {
    return ApiService.vueInstance.axios.put(`${resource}/${slug}`, params);
  }

  /**
   * @description Send the PUT HTTP request
   * @param resource: string
   * @param params: AxiosRequestConfig
   * @returns Promise<AxiosResponse>
   */
  public static put(resource: string, params: any): Promise<AxiosResponse> {
    return ApiService.vueInstance.axios.put(`${resource}`, params);
  }

  /**
   * @description Send the DELETE HTTP request
   * @param resource: string
   * @returns Promise<AxiosResponse>
   */
  public static delete(resource: string): Promise<AxiosResponse> {
    return ApiService.vueInstance.axios.delete(resource);
  }
}

export default ApiService;
