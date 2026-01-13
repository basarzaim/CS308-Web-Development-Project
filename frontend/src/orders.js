

// Sales Manager functions for return management
export async function approveReturn(orderId) {
  const numericId = Number(orderId);
  if (!Number.isFinite(numericId)) {
    throw new Error("Invalid order ID");
  }

  try {
    const { data } = await api.post(/orders//approve-return/);
    return data.order || data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to approve return"));
  }
}

export async function denyReturn(orderId) {
  const numericId = Number(orderId);
  if (!Number.isFinite(numericId)) {
    throw new Error("Invalid order ID");
  }

  try {
    const { data } = await api.post(/orders//deny-return/);
    return data.order || data;
  } catch (error) {
    throw new Error(extractMessage(error, "Failed to deny return"));
  }
}
