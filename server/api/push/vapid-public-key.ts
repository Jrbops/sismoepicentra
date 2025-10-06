import { VAPID_PUBLIC_KEY } from '../../utils/vapid-keys';

export default defineEventHandler(() => {
  return { publicKey: VAPID_PUBLIC_KEY };
});
