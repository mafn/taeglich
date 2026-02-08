import { defineDay } from "../../lib/day";

export default defineDay({
  title: "Liveness probe",
  description: "You are the pod. Respond to the /healthz probe to stay alive.",
  tags: ["devops", "interactive", "minimal"],
  shellMode: "compact",
});
