"use client";

import { ArrowRight } from "lucide-react";
import { defaultUser } from "@/data/user";
import { useOrder } from "@/lib/OrderContext";
import Sidebar from "@/app/components/navigation/Sidebar";
import MobileNav from "@/app/components/navigation/MobileNav";
import Topbar from "@/app/components/navigation/Topbar";
import MealGrid from "@/app/components/meals/MealGrid";
import OrderCard from "@/app/components/orders/OrderCard";
import OrderTracking from "@/app/components/orders/OrderTracking";
import BasketBar from "@/app/components/orders/BasketBar";
import CountdownTimer from "@/app/components/ui/CountdownTimer";
import Link from "next/link";

export default function Home() {
  const { 
    basket, 
    addToBasket, 
    updateBasketQuantity, 
    getBasketTotal, 
    getBasketCount,
    currentOrder,
    menuItems,
  } = useOrder();

  const handleAddToBasket = (mealId) => {
    addToBasket(mealId, 1);
  };

  const handleUpdateQuantity = (mealId, quantity) => {
    updateBasketQuantity(mealId, quantity);
  };

  const basketCount = getBasketCount();
  const basketTotal = getBasketTotal();

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="app-shell">
      <Sidebar />
      
      <main className="main-content">
        <Topbar />
        
        <section className="welcome-row">
          <div>
            <p className="eyebrow">{formattedDate.toUpperCase()}</p>
            <h1>Good morning, <em>{defaultUser.name.split(" ")[0]}.</em></h1>
            <p className="subhead">Your day tastes better when it&apos;s planned.</p>
          </div>
          <CountdownTimer />
        </section>

        <section className="hero-banner">
          <div className="hero-copy">
            <span className="hero-kicker">YOUR MIDDAY, SORTED</span>
            <h2>Choose now.<br /><i>Collect later.</i></h2>
            <p>Pre-order before 9 AM and skip the queue when your food is ready.</p>
            <Link href="/menu" className="hero-action">
              See today&apos;s menu <ArrowRight size={16} />
            </Link>
          </div>
          <div className="hero-art">
            <div className="sun-shape" />
            <div className="hero-plate">
              <div className="food food-one" />
              <div className="food food-two" />
              <div className="food food-three" />
            </div>
            <span className="hero-sticker">made for<br /><b>your day</b> <span>✳</span></span>
          </div>
        </section>

        <section className="section-heading">
          <div>
            <p className="eyebrow">FROM THE KITCHEN</p>
            <h2>Today&apos;s menu <span>· {menuItems.length} choices</span></h2>
          </div>
          <Link href="/menu" className="text-button">View all <ArrowRight size={15} /></Link>
        </section>
        
        <MealGrid 
          meals={menuItems.slice(0, 3)}
          basket={basket}
          onAdd={handleAddToBasket}
          onUpdateQuantity={handleUpdateQuantity}
        />

        <section className="bottom-grid">
          {currentOrder ? (
            <div className="order-card">
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">ON YOUR RADAR</p>
                  <h2>Current order</h2>
                </div>
                <span className="status-pill"><span />Confirmed</span>
              </div>
              <div className="order-details">
                <div className="order-number">
                  <span>#{currentOrder.id}</span>
                  {currentOrder.items.map((item, index) => (
                    <b key={index}>{item.mealName} <small>{item.quantity} × KSh {item.price}</small></b>
                  ))}
                </div>
                <div className="order-total">
                  <small>Total</small>
                  <b>KSh {currentOrder.total}</b>
                </div>
              </div>
              <OrderTracking order={currentOrder} />
              <div className="pickup-row">
                Pick up at <b>{currentOrder.pickupLocation}</b>
              </div>
            </div>
          ) : (
            <div className="order-card empty-order">
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">ON YOUR RADAR</p>
                  <h2>No active orders</h2>
                </div>
              </div>
              <p className="empty-order-text">Place an order to track it here.</p>
            </div>
          )}
          
          <div className="collection-card">
            <div>
              <p className="eyebrow">QUICK COLLECTION</p>
              <h2>Grab and go.</h2>
              <p>Your order will be waiting at the main cafeteria counter from 12:30 PM.</p>
            </div>
            <div className="qr-placeholder">
              <div /><div /><div /><div /><span>PLT<br />2841</span>
            </div>
          </div>
        </section>
      </main>

      <BasketBar 
        itemCount={basketCount} 
        total={basketTotal}
        onClick={() => console.log("Navigate to checkout")}
      />
      <MobileNav />
    </div>
  );
}