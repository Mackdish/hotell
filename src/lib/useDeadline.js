"use client";

import { useState, useEffect } from "react";

// Default ordering deadline: 9:00 AM
const DEFAULT_DEADLINE_HOUR = 9;
const DEFAULT_DEADLINE_MINUTE = 0;

export const useDeadline = (deadlineHour = DEFAULT_DEADLINE_HOUR, deadlineMinute = DEFAULT_DEADLINE_MINUTE) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isOrderingOpen, setIsOrderingOpen] = useState(true);
  const [deadlineTime, setDeadlineTime] = useState(null);

  useEffect(() => {
    const calculateDeadline = () => {
      const now = new Date();
      const deadline = new Date(now);
      deadline.setHours(deadlineHour, deadlineMinute, 0, 0);

      // If deadline has already passed today, set it for tomorrow
      if (now >= deadline) {
        deadline.setDate(deadline.getDate() + 1);
      }

      setDeadlineTime(deadline);

      const diff = deadline - now;
      const isPastDeadline = diff <= 0;

      setIsOrderingOpen(!isPastDeadline);

      if (!isPastDeadline) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setTimeRemaining({ hours, minutes, seconds });
      } else {
        setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateDeadline();
    const interval = setInterval(calculateDeadline, 1000);

    return () => clearInterval(interval);
  }, [deadlineHour, deadlineMinute]);

  const formatTimeRemaining = () => {
    if (!timeRemaining) return "Loading...";

    const { hours, minutes, seconds } = timeRemaining;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getDeadlineMessage = () => {
    if (!isOrderingOpen) {
      return "Today's ordering is closed";
    }

    if (!timeRemaining) {
      return "Loading...";
    }

    const { hours, minutes } = timeRemaining;
    
    if (hours > 1) {
      return `Closes in ${hours}h ${minutes}m`;
    } else if (hours === 1) {
      return `Closes in 1h ${minutes}m`;
    } else if (minutes > 1) {
      return `Closes in ${minutes} minutes`;
    } else if (minutes === 1) {
      return "Closes in 1 minute";
    } else {
      return "Ordering closing soon";
    }
  };

  const getDeadlineTime = () => {
    if (!deadlineTime) return null;
    return deadlineTime.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    });
  };

  return {
    timeRemaining,
    isOrderingOpen,
    deadlineTime,
    formatTimeRemaining,
    getDeadlineMessage,
    getDeadlineTime,
  };
};