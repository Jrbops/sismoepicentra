import { renderPrometheus } from '../utils/metrics';

export default defineEventHandler(() => {
  return renderPrometheus();
});
