"use client";

import { Clock3 } from "lucide-react";
import { useDeadline } from "@/lib/useDeadline";

export default function CountdownTimer({ deadlineHour = 9, deadlineMinute = 0 }) {
  const { isOrderingOpen, getDeadlineMessage, deadlineTime } = useDeadline(deadlineHour, deadlineMinute);

  const formatDeadlineTime = () => {
    if (!deadlineTime) return "09:00 AM";
    return deadlineTime.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    });
  };

  return (
    <div className="cutoff-card">
      <div className="cutoff-icon">
        <Clock3 size={20} />
      </div>
      <div>
        <span>{isOrderingOpen ? "ORDERING IS OPEN" : "ORDERING CLOSED"}</span>
        <b>{getDeadlineMessage()}</b>
        <small>
          Today&apos;s kitchen run · {formatDeadlineTime()}
        </small>
      </div>
    </div>
  );
}