"use client";

import { MapPin, ChevronRight } from "lucide-react";
import { orderStatusLabels } from "@/data/orders";

export default function OrderCard({ order, onViewDetails }) {
  const statusLabel = orderStatusLabels[order.status] || order.status;
  
  return (
    <div className="order-card">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">ON YOUR RADAR</p>
          <h2>Current order</h2>
        </div>
        <span className="status-pill">
          <span />{statusLabel}
        </span>
      </div>
      
      <div className="order-details">
        <div className="order-number">
          <span>#{order.id}</span>
          {order.items.map((item, index) => (
            <b key={index}>
              {item.mealName} <small>{item.quantity} × KSh {item.price}</small>
            </b>
          ))}
        </div>
        
        <div className="order-total">
          <small>Total</small>
          <b>KSh {order.total}</b>
        </div>
      </div>
      
      <div className="pickup-row">
        <MapPin size={16} />
        <span>
          Pick up at <b>{order.pickupLocation}</b>
        </span>
        <ChevronRight size={16} />
      </div>
    </div>
  );
}