"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin, CreditCard, Smartphone } from "lucide-react";
import { useOrder } from "@/lib/OrderContext";
import { pickupLocations, paymentMethods } from "@/data/orders";
import { defaultUser } from "@/data/user";
import Sidebar from "@/app/components/navigation/Sidebar";
import MobileNav from "@/app/components/navigation/MobileNav";
import Topbar from "@/app/components/navigation/Topbar";

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
  const [notes, setNotes] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

  const basketItems = getBasketItems();
  const basketTotal = getBasketTotal();
  const basketCount = getBasketCount();

  const handlePlaceOrder = async () => {
    if (basketCount === 0) return;
    
    setIsPlacingOrder(true);
    
    try {
      const order = await placeOrder(
        selectedPickup,
        selectedPayment,
        notes
      );
      
      setPlacedOrder(order);
      setOrderSuccess(true);
    } catch (error) {
      console.error("Failed to place order:", error);
      alert("Failed to place order. Please try again.");
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
              <p className="eyebrow">ORDER CONFIRMED</p>
              <h1>Order #{placedOrder.id}</h1>
              <p className="subhead">Your order has been placed successfully!</p>
            </div>
          </section>

          <section className="order-confirmation">
            <div className="confirmation-card">
              <div className="success-icon">✓</div>
              <h2>Order confirmed!</h2>
              <p>Your order is being prepared and will be ready for pickup at the specified location.</p>
              
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
                {isPlacingOrder ? "Placing order..." : "Place order"} <ArrowRight size={16} />
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