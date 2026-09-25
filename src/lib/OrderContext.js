"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { meals } from "@/data/meals";
import { createOrder, orderStatuses } from "@/data/orders";

const OrderContext = createContext();

const BASKET_STORAGE_KEY = "plate_basket";
const ORDERS_STORAGE_KEY = "plate_orders";

export const OrderProvider = ({ children }) => {
  const [basket, setBasket] = useState({});
  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedBasket = localStorage.getItem(BASKET_STORAGE_KEY);
    const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
    
    let initialBasket = {};
    let initialOrders = [];
    let initialCurrentOrder = null;
    
    if (savedBasket) {
      try {
        initialBasket = JSON.parse(savedBasket);
      } catch (e) {
        console.error("Failed to parse basket from localStorage:", e);
      }
    }
    
    if (savedOrders) {
      try {
        initialOrders = JSON.parse(savedOrders);
        // Set the most recent active order as current
        const activeOrder = initialOrders.find(
          (order) => order.status !== orderStatuses.COLLECTED && order.status !== orderStatuses.CANCELLED
        );
        if (activeOrder) {
          initialCurrentOrder = activeOrder;
        }
      } catch (e) {
        console.error("Failed to parse orders from localStorage:", e);
      }
    }
    
    // Batch state updates to avoid cascading renders
    const updateState = () => {
      setBasket(initialBasket);
      setOrders(initialOrders);
      setCurrentOrder(initialCurrentOrder);
      setIsLoaded(true);
    };
    
    // Use requestAnimationFrame to defer state updates
    requestAnimationFrame(updateState);
  }, []);

  // Save basket to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(basket));
    }
  }, [basket, isLoaded]);

  // Save orders to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    }
  }, [orders, isLoaded]);

  const addToBasket = (mealId, quantity = 1) => {
    setBasket((prev) => {
      const currentQuantity = prev[mealId] || 0;
      const newQuantity = currentQuantity + quantity;
      
      if (newQuantity <= 0) {
        const { [mealId]: removed, ...rest } = prev;
        return rest;
      }
      
      return {
        ...prev,
        [mealId]: newQuantity,
      };
    });
  };

  const removeFromBasket = (mealId) => {
    setBasket((prev) => {
      const { [mealId]: removed, ...rest } = prev;
      return rest;
    });
  };

  const updateBasketQuantity = (mealId, quantity) => {
    setBasket((prev) => {
      if (quantity <= 0) {
        const { [mealId]: removed, ...rest } = prev;
        return rest;
      }
      
      return {
        ...prev,
        [mealId]: quantity,
      };
    });
  };

  const clearBasket = () => {
    setBasket({});
  };

  const getBasketItems = () => {
    return Object.entries(basket).map(([mealId, quantity]) => ({
      meal: meals.find((m) => m.id === parseInt(mealId)),
      quantity,
    })).filter(item => item.meal);
  };

  const getBasketTotal = () => {
    return getBasketItems().reduce(
      (sum, { meal, quantity }) => sum + meal.price * quantity,
      0
    );
  };

  const getBasketCount = () => {
    return Object.values(basket).reduce((sum, quantity) => sum + quantity, 0);
  };

  const placeOrder = (pickupLocation, paymentMethod, notes = "", pickupDate = null, pickupTime = null) => {
    const basketItems = getBasketItems();
    
    if (basketItems.length === 0) {
      throw new Error("Basket is empty");
    }

    const newOrder = createOrder(basketItems, pickupLocation, paymentMethod, pickupDate, pickupTime);
    newOrder.notes = notes;
    
    setOrders((prev) => [newOrder, ...prev]);
    setCurrentOrder(newOrder);
    clearBasket();
    
    return newOrder;
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
    
    if (currentOrder?.id === orderId) {
      setCurrentOrder((prev) => ({ ...prev, status: newStatus }));
    }
  };

  const getOrderById = (orderId) => {
    return orders.find((order) => order.id === orderId);
  };

  const getActiveOrders = () => {
    return orders.filter(
      (order) => order.status !== orderStatuses.COLLECTED && order.status !== orderStatuses.CANCELLED
    );
  };

  const getPastOrders = () => {
    return orders.filter(
      (order) => order.status === orderStatuses.COLLECTED || order.status === orderStatuses.CANCELLED
    );
  };

  const value = {
    basket,
    orders,
    currentOrder,
    isLoaded,
    addToBasket,
    removeFromBasket,
    updateBasketQuantity,
    clearBasket,
    getBasketItems,
    getBasketTotal,
    getBasketCount,
    placeOrder,
    updateOrderStatus,
    getOrderById,
    getActiveOrders,
    getPastOrders,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrder must be used within an OrderProvider");
  }
  return context;
};