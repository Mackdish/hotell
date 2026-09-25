"use client";

import { Check } from "lucide-react";
import { orderStatusSteps, getOrderStatusProgress } from "@/data/orders";

export default function OrderTracking({ order }) {
  const progress = getOrderStatusProgress(order.status);
  
  return (
    <div className="progress">
      <div className="progress-line">
        <span style={{ width: `${progress.percentage}%` }} />
      </div>
      
      {orderStatusSteps.map((step, index) => {
        const isDone = index < progress.currentStep;
        const isCurrent = index === progress.currentStep;
        
        return (
          <div 
            key={step.status} 
            className={`progress-step ${isDone ? "done" : ""} ${isCurrent ? "current" : ""}`}
          >
            <span>
              {isDone ? <Check size={13} /> : step.icon}
            </span>
            <small>{step.label}</small>
          </div>
        );
      })}
    </div>
  );
}