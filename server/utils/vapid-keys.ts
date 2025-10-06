// VAPID keys for Web Push
// Production: generate with `npx web-push generate-vapid-keys` and store in env
// Development: these are placeholder keys (replace in production)

export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib27SRuu2kFI3Oi5Gg8Dw6jVLkq5Xw-yvYBCqAGLxDKPGxJzZQJGfLZPZQ0';
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'UUxI4O8-FbRouAevSmBQ6o8eDy73EiZANPOqGBJOZ_k';
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@zelzele.io';
