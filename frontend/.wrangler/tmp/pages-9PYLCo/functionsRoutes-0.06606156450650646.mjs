import { onRequestPost as __api_create_portal_js_onRequestPost } from "C:\\Auto script\\frontend\\functions\\api\\create-portal.js"
import { onRequestPost as __api_delete_account_js_onRequestPost } from "C:\\Auto script\\frontend\\functions\\api\\delete-account.js"
import { onRequestPost as __api_generate_js_onRequestPost } from "C:\\Auto script\\frontend\\functions\\api\\generate.js"
import { onRequestPost as __api_webhook_js_onRequestPost } from "C:\\Auto script\\frontend\\functions\\api\\webhook.js"

export const routes = [
    {
      routePath: "/api/create-portal",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_create_portal_js_onRequestPost],
    },
  {
      routePath: "/api/delete-account",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_delete_account_js_onRequestPost],
    },
  {
      routePath: "/api/generate",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_generate_js_onRequestPost],
    },
  {
      routePath: "/api/webhook",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_webhook_js_onRequestPost],
    },
  ]