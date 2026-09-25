"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { meals } from "@/data/meals";
import { orderStatuses, pickupLocations } from "@/data/orders";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const OrderContext = createContext();
const BASKET_STORAGE_KEY = "plate_basket";
const ORDERS_STORAGE_KEY = "plate_orders";

function mapDatabaseOrder(row) {
  const location = Array.isArray(row.pickup_locations) ? row.pickup_locations[0] : row.pickup_locations;
  const items = row.items || row.order_items || [];
  return {
    id: row.order_number || row.id,
    databaseId: row.id,
    items: items.map((item) => ({
      mealName: item.mealName || item.item_name,
      quantity: Number(item.quantity),
      price: Number(item.price ?? item.unit_price),
      totalPrice: Number(item.totalPrice ?? item.line_total),
    })),
    total: Number(row.total),
    pickupLocation: row.pickup_location || location?.name || "Pickup location",
    pickupDate: row.pickup_date,
    pickupTime: String(row.pickup_time || "").slice(0, 5),
    pickupDateTime: row.pickup_datetime || null,
    paymentMethod: row.payment_method === "mpesa" ? "mpesa" : "pickup",
    paymentStatus: row.payment_status,
    status: row.status,
    createdAt: row.created_at,
    actualReadyTime: row.ready_at || row.preparing_at || null,
    collectedAt: row.collected_at || null,
    notes: row.notes || "",
  };
}

export const OrderProvider = ({ children }) => {
  const [basket, setBasket] = useState({});
  const [menuItems, setMenuItems] = useState(meals);
  const [orders, setOrders] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadInitialState() {
      let initialBasket = {};
      let initialOrders = [];

      try {
        const savedBasket = localStorage.getItem(BASKET_STORAGE_KEY);
        if (savedBasket) initialBasket = JSON.parse(savedBasket);
      } catch (error) {
        console.error("Failed to load basket:", error);
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const { data: menuData, error: menuError } = await supabase
          .from("menu_items")
          .select("id, name, description, category, image_url, price, is_available, prep_minutes, sort_order")
          .eq("is_available", true)
          .order("sort_order", { ascending: true });
        if (!menuError && Array.isArray(menuData) && menuData.length) {
          setMenuItems(menuData.map((item) => ({
            id: item.id,
            name: item.name,
            detail: item.description,
            description: item.description,
            category: item.category,
            image: item.image_url,
            price: Number(item.price),
            available: item.is_available,
            prepTime: `${item.prep_minutes} min`,
            accent: /plant|veget/i.test(item.category) ? "green" : /premium/i.test(item.category) ? "gold" : "coral",
          })));
        } else if (menuError) {
          console.warn("Could not load menu from Supabase; using demo menu:", menuError.message);
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const response = await fetch("/api/orders", {
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: "no-store",
          });
          const result = await response.json();
          if (response.ok && Array.isArray(result.orders)) {
            initialOrders = result.orders.map(mapDatabaseOrder);
          } else if (!response.ok) {
            console.warn("Could not load orders from Supabase:", result.error);
          }
        } else {
          const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
          if (savedOrders) initialOrders = JSON.parse(savedOrders);
        }
      } catch (error) {
        // Supabase env may not be configured during local UI prototyping.
        try {
          const savedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
          if (savedOrders) initialOrders = JSON.parse(savedOrders);
        } catch {}
        console.warn("Could not load Supabase order history:", error);
      }

      if (!active) return;
      const current = initialOrders.find(
        (order) => order.status !== orderStatuses.COLLECTED && order.status !== orderStatuses.CANCELLED
      ) || null;
      setBasket(initialBasket);
      setOrders(initialOrders);
      setCurrentOrder(current);
      setIsLoaded(true);
    }

    loadInitialState();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(basket));
  }, [basket, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }, [orders, isLoaded]);

  const addToBasket = (mealId, quantity = 1) => {
    setBasket((prev) => {
      const next = (prev[mealId] || 0) + quantity;
      if (next <= 0) {
        const { [mealId]: removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [mealId]: next };
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
      return { ...prev, [mealId]: quantity };
    });
  };

  const clearBasket = () => setBasket({});

  const getBasketItems = () =>
    Object.entries(basket).map(([mealId, quantity]) => ({
      meal: menuItems.find((meal) => String(meal.id) === mealId || meal.id === Number(mealId)) || meals.find((meal) => meal.id === Number(mealId)),
      quantity,
    })).filter((item) => item.meal);

  const getBasketTotal = () => getBasketItems().reduce(
    (sum, { meal, quantity }) => sum + meal.price * quantity, 0
  );

  const getBasketCount = () => Object.values(basket).reduce((sum, quantity) => sum + quantity, 0);

  const placeOrder = async (pickupLocation, paymentMethod, notes = "", pickupDate = null, pickupTime = null) => {
    const basketItems = getBasketItems();
    if (!basketItems.length) throw new Error("Basket is empty.");

    const supabase = getSupabaseBrowserClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.access_token) throw new Error("Please sign in before placing an order.");

    const location = pickupLocations.find((item) => item.id === pickupLocation);
    if (!location) throw new Error("Choose a valid pickup location.");

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        items: basketItems.map(({ meal, quantity }) => ({ name: meal.name, quantity })),
        pickupLocation: location.name,
        paymentMethod,
        pickupDate,
        pickupTime,
        notes,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to place order.");

    const newOrder = mapDatabaseOrder(result.order);
    setOrders((prev) => [newOrder, ...prev.filter((order) => order.databaseId !== newOrder.databaseId)]);
    setCurrentOrder(newOrder);
    clearBasket();
    return newOrder;
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders((prev) => prev.map((order) => order.id === orderId ? { ...order, status: newStatus } : order));
    if (currentOrder?.id === orderId) setCurrentOrder((prev) => ({ ...prev, status: newStatus }));
  };

  const getOrderById = (orderId) => orders.find((order) => order.id === orderId);
  const getActiveOrders = () => orders.filter(
    (order) => order.status !== orderStatuses.COLLECTED && order.status !== orderStatuses.CANCELLED
  );
  const getPastOrders = () => orders.filter(
    (order) => order.status === orderStatuses.COLLECTED || order.status === orderStatuses.CANCELLED
  );

  const value = {
    basket, orders, currentOrder, isLoaded, menuItems, addToBasket, removeFromBasket,
    updateBasketQuantity, clearBasket, getBasketItems, getBasketTotal,
    getBasketCount, placeOrder, updateOrderStatus, getOrderById,
    getActiveOrders, getPastOrders,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export const useOrder = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error("useOrder must be used within an OrderProvider");
  return context;
};
