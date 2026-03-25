/**
 * 🔒 ORDER LIFECYCLE GUARD
 * Enforces valid state transitions and prevents race conditions
 *
 * ORDER FLOW:
 * pending → assigned → in_progress → completed
 */

export function guardOrderLifecycle(order, action) {
  if (!order) throw new Error("Order not loaded");

  const status = order.jobStatus;

  // Block already finished jobs
  if (status === "completed") {
    throw new Error("Order already completed");
  }

  switch (action) {
    /**
     * 🟡 START CLEANING
     * Only allowed when order is ASSIGNED
     */
    case "start":
      if (status !== "assigned") {
        throw new Error(
          `Cannot start order in '${status}' state`
        );
      }
      break;

    /**
     * 🟢 COMPLETE JOB
     * Only allowed when order is IN_PROGRESS
     */
    case "complete":
      if (status !== "in_progress") {
        throw new Error(
          `Cannot complete order in '${status}' state`
        );
      }
      break;

    /**
     * 🔴 SAFETY
     */
    default:
      throw new Error("Unknown lifecycle action");
  }

  return true;
}
