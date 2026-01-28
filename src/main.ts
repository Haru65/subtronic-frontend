import { createApp } from "vue";
import { createPinia } from "pinia";
import { Tooltip } from "bootstrap";
import App from "./App.vue";
// JSON Parse Error Handling - MUST be before any other imports
const originalJSONParse = JSON.parse;
JSON.parse = function(text) {
  try {
    // Handle empty or invalid inputs
    if (text === undefined || text === null) {
      console.warn('JSON.parse called with null/undefined, returning empty object');
      return {};
    }
    
    if (typeof text !== 'string') {
      // If it's already an object, return it
      if (typeof text === 'object') {
        return text;
      }
      console.warn('JSON.parse called with non-string value:', typeof text, text);
      return {};
    }
    
    // Handle empty or whitespace-only strings
    if (text.trim() === '') {
      console.warn('JSON.parse called with empty string, returning empty object');
      return {};
    }
    
    // Handle common non-JSON values that might be passed
    if (text === 'auto' || text === 'end' || text.includes('px') || text.startsWith('#kt_')) {
      console.warn('JSON.parse called with non-JSON value:', text, 'returning as string');
      return text;
    }
    
    return originalJSONParse.call(this, text);
  } catch (error) {
    console.warn('JSON Parse Error for input:', text, 'Error:', error.message, 'Returning input as-is');
    // Return the original text if it's a simple string, otherwise return empty object
    return typeof text === 'string' ? text : {};
  }
};

// Your Vue app creation code continues here...

/*
Using the main router without auth checks
 */
import router from "./router";
import ElementPlus from "element-plus";
import i18n from "@/core/plugins/i18n";

//imports for app initialization
import ApiService from "@/core/services/ApiService";
import { initApexCharts } from "@/core/plugins/apexcharts";
import { initInlineSvg } from "@/core/plugins/inline-svg";
import { initVeeValidate } from "@/core/plugins/vee-validate";
import { initKtIcon } from "@/core/plugins/keenthemes";
import { webSocketService } from "@/services/websocket.service";

import "@/core/plugins/prismjs";

const app = createApp(App);

// Define a function to track route changes
function trackRouteChange(toRoute, fromRoute) {
  const eventName = 'Route Change';
  const eventCategory = 'Navigation';
  const eventLabel = `From: ${fromRoute.fullPath} - To: ${toRoute.fullPath}`;
  
  if (typeof window.gtag !== 'undefined') {
    // Ensure GA config uses cookie_domain: 'auto'
    window.gtag('config', 'G-XXXXXXX', { cookie_domain: `zeptac-iot-platform-vp3h.vercel.app` }); // Replace G-XXXXXXX with your GA ID
    window.gtag('event', eventName, {
      'event_category': eventCategory,  
      'event_label': eventLabel
    });
  }
  // If you do NOT want GA, comment out or remove the above block safely.
}

// Add a router guard to track page views
// router.afterEach((to, from) => {
//   // Track route change event
//   trackRouteChange(to, from);
// });

app.use(createPinia());
app.use(router);
app.use(ElementPlus);

// Initialize WebSocket service globally
try {
  webSocketService.initialize();
  console.log('✅ WebSocket service initialized globally');
  // Make available on window for debugging
  (window as any).webSocketService = webSocketService;
} catch (error) {
  console.error('❌ Failed to initialize WebSocket service:', error);
}

ApiService.init(app);
initApexCharts(app);
initInlineSvg(app);
initKtIcon(app);
initVeeValidate();

app.use(i18n);

app.directive("tooltip", (el) => {
  new Tooltip(el);
});

app.mount("#app");
