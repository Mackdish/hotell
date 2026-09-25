"use client";

import { useState } from "react";
import { defaultUser } from "@/data/user";
import { useOrder } from "@/lib/OrderContext";
import { orderStatusLabels } from "@/data/orders";
import Sidebar from "@/app/components/navigation/Sidebar";
import MobileNav from "@/app/components/navigation/MobileNav";
import Topbar from "@/app/components/navigation/Topbar";
import OrderTracking from "@/app/components/orders/OrderTracking";

export default function OrdersPage() {
  const { getActiveOrders, getPastOrders } = useOrder();
  const [selectedTab, setSelectedTab] = useState("active");

  const activeOrders = getActiveOrders();
  const pastOrders = getPastOrders();

  const displayOrders = selectedTab === "active" ? activeOrders : pastOrders;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="app-shell">
      <Sidebar />
      
      <main className="main-content">
        <Topbar />
        
        <section className="page-header">
          <div>
            <p className="eyebrow">YOUR ORDERS</p>
            <h1>Order history</h1>
            <p className="subhead">Track your current orders and view past orders.</p>
          </div>
        </section>

        <section className="orders-tabs">
          <button
            className={`order-tab ${selectedTab === "active" ? "active" : ""}`}
            onClick={() => setSelectedTab("active")}
          >
            Active ({activeOrders.length})
          </button>
          <button
            className={`order-tab ${selectedTab === "past" ? "active" : ""}`}
            onClick={() => setSelectedTab("past")}
          >
            Past ({pastOrders.length})
          </button>
        </section>

        {displayOrders.length === 0 ? (
          <div className="empty-state">
            <p>No {selectedTab} orders found.</p>
            {selectedTab === "active" && (
              <p className="empty-action">Place an order to get started!</p>
            )}
          </div>
        ) : (
          <section className="orders-list">
            {displayOrders.map((order) => (
              <div key={order.id} className="order-card expanded">
                <div className="order-card-header">
                  <div className="order-id-section">
                    <span className="order-number-large">#{order.id}</span>
                    <span className="order-date">
                      {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
                    </span>
                  </div>
                  <span className={`status-pill ${order.status}`}>
                    <span />{orderStatusLabels[order.status]}
                  </span>
                </div>

                <div className="order-items-summary">
                  {order.items.map((item, index) => (
                    <div key={index} className="order-item-summary">
                      <span>{item.mealName} × {item.quantity}</span>
                      <strong>KSh {item.totalPrice}</strong>
                    </div>
                  ))}
                </div>

                <div className="order-total-section">
                  <span>Total</span>
                  <strong>KSh {order.total}</strong>
                </div>

                {selectedTab === "active" && (
                  <div className="order-tracking-section">
                    <OrderTracking order={order} />
                  </div>
                )}

                <div className="order-details-section">
                  <div className="detail-row">
                    <span className="detail-label">Pickup location</span>
                    <span className="detail-value">{order.pickupLocation}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Payment method</span>
                    <span className="detail-value">
                      {order.paymentMethod === "mpesa" ? "M-Pesa" : "Pay at pickup"}
                    </span>
                  </div>
                  {order.notes && (
                    <div className="detail-row">
                      <span className="detail-label">Special instructions</span>
                      <span className="detail-value">{order.notes}</span>
                    </div>
                  )}
                </div>

                {order.actualReadyTime && (
                  <div className="order-ready-time">
                    <span>Ready at {formatTime(order.actualReadyTime)}</span>
                  </div>
                )}

                {order.collectedAt && (
                  <div className="order-collected-time">
                    <span>Collected at {formatTime(order.collectedAt)}</span>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </main>
      
      <MobileNav />
    </div>
  );
}