export const orderStatuses = {
  CONFIRMED: "confirmed",
  PREPARING: "preparing", 
  READY: "ready",
  COLLECTED: "collected",
  CANCELLED: "cancelled",
};

export const orderStatusLabels = {
  [orderStatuses.CONFIRMED]: "Confirmed",
  [orderStatuses.PREPARING]: "Preparing",
  [orderStatuses.READY]: "Ready",
  [orderStatuses.COLLECTED]: "Collected",
  [orderStatuses.CANCELLED]: "Cancelled",
};

export const orderStatusSteps = [
  { status: orderStatuses.CONFIRMED, label: "Confirmed", icon: "✓" },
  { status: orderStatuses.PREPARING, label: "Preparing", icon: "2" },
  { status: orderStatuses.READY, label: "Ready", icon: "3" },
  { status: orderStatuses.COLLECTED, label: "Collected", icon: "4" },
];

export const pickupLocations = [
  { id: "main-cafeteria", name: "Main cafeteria counter", description: "Ground floor, main building" },
  { id: "block-b", name: "Block B pickup point", description: "Near lecture halls" },
  { id: "library", name: "Library café", description: "Ground floor, library building" },
];

export const paymentMethods = [
  { id: "mpesa", name: "M-Pesa", description: "Pay via mobile money" },
  { id: "pickup", name: "Pay at pickup", description: "Cash or card when collecting" },
];

export const generateOrderId = () => {
  const prefix = "PLT";
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${number}`;
};

export const createOrder = (items, pickupLocation, paymentMethod, pickupDate = null, pickupTime = null) => {
  return {
    id: generateOrderId(),
    items: items.map(item => ({
      mealId: item.meal.id,
      mealName: item.meal.name,
      quantity: item.quantity,
      price: item.meal.price,
      totalPrice: item.meal.price * item.quantity,
    })),
    total: items.reduce((sum, item) => sum + (item.meal.price * item.quantity), 0),
    pickupLocation,
    pickupDate,
    pickupTime,
    pickupDateTime: pickupDate && pickupTime ? pickupDate + "T" + pickupTime + ":00+03:00" : null,
    paymentMethod,
    status: orderStatuses.CONFIRMED,
    createdAt: new Date().toISOString(),
    estimatedReadyTime: null,
    actualReadyTime: null,
    collectedAt: null,
    notes: "",
  };
};

export const updateOrderStatus = (order, newStatus) => {
  const updatedOrder = { ...order, status: newStatus };
  
  if (newStatus === orderStatuses.READY && !order.actualReadyTime) {
    updatedOrder.actualReadyTime = new Date().toISOString();
  }
  
  if (newStatus === orderStatuses.COLLECTED && !order.collectedAt) {
    updatedOrder.collectedAt = new Date().toISOString();
  }
  
  return updatedOrder;
};

export const getOrderStatusProgress = (status) => {
  const currentIndex = orderStatusSteps.findIndex(step => step.status === status);
  return {
    currentStep: currentIndex,
    totalSteps: orderStatusSteps.length,
    percentage: ((currentIndex + 1) / orderStatusSteps.length) * 100,
  };
};