"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin, CreditCard, Smartphone, Clock3, CalendarDays } from "lucide-react";
import { useOrder } from "@/lib/OrderContext";
import { pickupLocations, paymentMethods } from "@/data/orders";
import { defaultUser } from "@/data/user";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import Sidebar from "@/app/components/navigation/Sidebar";
import MobileNav from "@/app/components/navigation/MobileNav";
import Topbar from "@/app/components/navigation/Topbar";

function getNairobiSchedule() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const today = values.year + "-" + values.month + "-" + values.day;
  const afterCutoff = values.hour >= "09";
  const earliest = new Date(today + "T00:00:00+03:00");
  if (afterCutoff) earliest.setUTCDate(earliest.getUTCDate() + 1);
  const minDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(earliest);
  return { today, minDate, afterCutoff, currentTime: values.hour + ":" + values.minute };
}

export default function CheckoutPage() {
  const router = useRouter();
  const { 
    basket, 
    getBasketItems, 
    getBasketTotal, 
    getBasketCount, 
    placeOrder,
    clearBasket 
  } = useOrder();
  
  const [selectedPickup, setSelectedPickup] = useState(defaultUser.defaultPickupLocation);
  const [selectedPayment, setSelectedPayment] = useState(defaultUser.defaultPaymentMethod);
  const [pickupDate, setPickupDate] = useState(() => getNairobiSchedule().minDate);
  const [pickupTime, setPickupTime] = useState("12:30");
  const [notes, setNotes] = useState("");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

  const basketItems = getBasketItems();
  const basketTotal = getBasketTotal();
  const basketCount = getBasketCount();

  const handlePlaceOrder = async () => {
    if (basketCount === 0) return;
    const schedule = getNairobiSchedule();
    if (pickupDate < schedule.minDate) {
      alert("Please choose " + schedule.minDate + " or a later pickup date. Same-day orders close at 9:00 AM EAT.");
      setPickupDate(schedule.minDate);
      return;
    }
    if (!pickupTime) {
      alert("Please select a pickup time.");
      return;
    }
    if (pickupDate === schedule.today && pickupTime <= schedule.currentTime) {
      alert("Please choose a pickup time later than the current time in Kenya.");
      return;
    }

    if (selectedPayment === "mpesa" && !paymentPhone.trim()) {
      alert("Enter the phone number to receive your M-Pesa prompt.");
      return;
    }

    setIsPlacingOrder(true);
    setPaymentError("");
    setPaymentMessage("");
    setPaymentUrl(null);
    let createdOrder = null;

    try {
      createdOrder = await placeOrder(
        selectedPickup,
        selectedPayment,
        notes,
        pickupDate,
        pickupTime
      );

      if (selectedPayment === "mpesa") {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Order was placed, but your session expired. Sign in again to initiate payment.");

        const response = await fetch("/api/payments/payza", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ orderNumber: createdOrder.id, phone: paymentPhone }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not start the PayzaAPI payment.");
        setPaymentUrl(result.paymentUrl || null);
        setPaymentMessage(result.message || "M-Pesa payment request sent. Check your phone and enter your PIN.");
      } else {
        setPaymentMessage("Your order is placed. Pay when you collect it.");
      }

      setPlacedOrder(createdOrder);
      setOrderSuccess(true);
    } catch (error) {
      console.error("Failed to place order or start payment:", error);
      if (createdOrder) {
        setPlacedOrder(createdOrder);
        setPaymentError(error?.message || "Your order was created but payment could not be started.");
        setOrderSuccess(true);
      } else {
        alert(error?.message || "Failed to place order. Please try again.");
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleContinue = () => {
    setOrderSuccess(false);
    setPlacedOrder(null);
    setNotes("");
    // Navigate to orders page
    router.push("/orders");
  };

  if (basketCount === 0 && !orderSuccess) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <Topbar />
          <section className="page-header">
            <h1>Your basket is empty</h1>
            <p className="subhead">Add some delicious meals to get started.</p>
          </section>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (orderSuccess && placedOrder) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">
          <Topbar />
          <section className="page-header">
            <div>
              <p className="eyebrow">{selectedPayment === "mpesa" && placedOrder.paymentStatus !== "paid" ? "ORDER AWAITING PAYMENT" : "ORDER CONFIRMED"}</p>
              <h1>Order #{placedOrder.id}</h1>
              <p className="subhead">Your order has been placed successfully!</p>
            </div>
          </section>

          <section className="order-confirmation">
            <div className="confirmation-card">
              <div className="success-icon">✓</div>
              <h2>{selectedPayment === "mpesa" ? "Order placed — payment pending" : "Order confirmed!"}</h2>
              <p>{paymentError || paymentMessage || (selectedPayment === "mpesa" ? "Complete the M-Pesa prompt to confirm your order." : "Your order is placed and will be ready for pickup at the specified location.")}</p>
              {paymentUrl && <a className="primary-button inline-flex items-center justify-center" href={paymentUrl} target="_blank" rel="noreferrer">Open PayzaAPI checkout <ArrowRight size={16} /></a>}
              {paymentError && selectedPayment === "mpesa" && <p className="text-sm text-amber-700">Your order reference is {placedOrder.id}. Contact the cafeteria before making another payment attempt.</p>}
              
              <div className="order-summary">
                <h3>Order details</h3>
                {placedOrder.items.map((item, index) => (
                  <div key={index} className="summary-item">
                    <span>{item.mealName} × {item.quantity}</span>
                    <strong>KSh {item.totalPrice}</strong>
                  </div>
                ))}
                <div className="summary-total">
                  <span>Total</span>
                  <strong>KSh {placedOrder.total}</strong>
                </div>
              </div>

              <div className="pickup-info">
                <MapPin size={20} />
                <div>
                  <strong>Pickup location</strong>
                  <p>{pickupLocations.find(l => l.id === selectedPickup)?.name}</p>
                  <p>{placedOrder.pickupDate} at {placedOrder.pickupTime}</p>
                </div>
              </div>

              <div className="payment-info">
                {selectedPayment === "mpesa" ? (
                  <>
                    <Smartphone size={20} />
                    <div>
                      <strong>Payment method</strong>
                      <p>M-Pesa</p>
                    </div>
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    <div>
                      <strong>Payment method</strong>
                      <p>Pay at pickup</p>
                    </div>
                  </>
                )}
              </div>

              <button 
                className="primary-button" 
                onClick={handleContinue}
              >
                Track your order <ArrowRight size={16} />
              </button>
            </div>
          </section>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Topbar />
        
        <section className="page-header">
          <div>
            <p className="eyebrow">CHECKOUT</p>
            <h1>Review your order</h1>
            <p className="subhead">Confirm your meal selection and pickup details.</p>
          </div>
        </section>

        <section className="checkout-layout">
          <div className="checkout-main">
            <div className="checkout-section">
              <h2>Your meals</h2>
              <div className="basket-items">
                {basketItems.map(({ meal, quantity }) => (
                  <div key={meal.id} className="basket-item">
                    <div className="item-info">
                      <h3>{meal.name}</h3>
                      <p>{meal.detail}</p>
                    </div>
                    <div className="item-quantity">
                      <span>× {quantity}</span>
                      <strong>KSh {meal.price * quantity}</strong>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="basket-total">
                <span>Total</span>
                <strong>KSh {basketTotal}</strong>
              </div>
            </div>

            <div className="checkout-section">
              <h2>Pickup location</h2>
              <div className="pickup-options">
                {pickupLocations.map((location) => (
                  <button
                    key={location.id}
                    className={`pickup-option ${selectedPickup === location.id ? "selected" : ""}`}
                    onClick={() => setSelectedPickup(location.id)}
                  >
                    <div className="pickup-option-content">
                      <strong>{location.name}</strong>
                      <small>{location.description}</small>
                    </div>
                    {selectedPickup === location.id && <div className="selected-indicator">✓</div>}
                  </button>
                ))}
              </div>
            </div>

            <div className="checkout-section">
              <h2>Pickup date & time</h2>
              <p className="mb-4 text-sm text-gray-500">Place same-day orders before 9:00 AM East Africa Time. Orders after the cutoff are scheduled for the next day.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-semibold">
                  <span className="flex items-center gap-2"><CalendarDays size={16} /> Pickup date</span>
                  <input className="rounded-xl border border-[#e5e6dc] bg-white px-4 py-3" type="date" min={getNairobiSchedule().minDate} value={pickupDate} onChange={(event) => setPickupDate(event.target.value)} required />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold">
                  <span className="flex items-center gap-2"><Clock3 size={16} /> Pickup time</span>
                  <input className="rounded-xl border border-[#e5e6dc] bg-white px-4 py-3" type="time" value={pickupTime} onChange={(event) => setPickupTime(event.target.value)} required />
                </label>
              </div>
            </div>

            {selectedPayment === "mpesa" && (
              <div className="checkout-section">
                <h2>M-Pesa phone number</h2>
                <p className="mb-3 text-sm text-gray-500">Enter the Safaricom number that should receive the STK Push.</p>
                <input
                  className="w-full rounded-xl border border-[#e5e6dc] bg-white px-4 py-3"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="0712345678 or 254712345678"
                  value={paymentPhone}
                  onChange={(event) => setPaymentPhone(event.target.value)}
                  required
                />
              </div>
            )}

            <div className="checkout-section">
              <h2>Payment method</h2>
              <div className="payment-options">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    className={`payment-option ${selectedPayment === method.id ? "selected" : ""}`}
                    onClick={() => setSelectedPayment(method.id)}
                  >
                    <div className="payment-option-content">
                      <strong>{method.name}</strong>
                      <small>{method.description}</small>
                    </div>
                    {selectedPayment === method.id && <div className="selected-indicator">✓</div>}
                  </button>
                ))}
              </div>
            </div>

            <div className="checkout-section">
              <h2>Special instructions</h2>
              <textarea
                className="notes-input"
                placeholder="Add any special requests or dietary requirements..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="checkout-sidebar">
            <div className="order-summary-card">
              <h2>Order summary</h2>
              <div className="summary-details">
                <div className="summary-row">
                  <span>Subtotal ({basketCount} {basketCount === 1 ? "meal" : "meals"})</span>
                  <strong>KSh {basketTotal}</strong>
                </div>
                <div className="summary-row">
                  <span>Service fee</span>
                  <strong>KSh 0</strong>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <strong>KSh {basketTotal}</strong>
                </div>
              </div>

              <button 
                className="primary-button"
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
              >
                {isPlacingOrder ? "Placing order..." : selectedPayment === "mpesa" ? "Place order & pay with M-Pesa" : "Place order"} <ArrowRight size={16} />
              </button>

              <p className="terms-text">
                By placing this order, you agree to our terms and conditions.
              </p>
            </div>
          </div>
        </section>
      </main>
      <MobileNav />
    </div>
  );
}