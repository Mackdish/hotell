"use client";

import { useState } from "react";
import { ArrowRight, MapPin, CreditCard, Smartphone, Bell, Settings, LogOut, User } from "lucide-react";
import { defaultUser, institutions } from "@/data/user";
import { pickupLocations, paymentMethods } from "@/data/orders";
import Sidebar from "@/app/components/navigation/Sidebar";
import MobileNav from "@/app/components/navigation/MobileNav";
import Topbar from "@/app/components/navigation/Topbar";

export default function ProfilePage() {
  const [user, setUser] = useState(defaultUser);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(defaultUser);

  const handleSave = () => {
    setUser(editedUser);
    setIsEditing(false);
    // In a real app, this would save to backend
  };

  const handleCancel = () => {
    setEditedUser(user);
    setIsEditing(false);
  };

  const handleLogout = () => {
    // In a real app, this would handle logout logic
    console.log("Logging out...");
  };

  return (
    <div className="app-shell">
      <Sidebar />
      
      <main className="main-content">
        <Topbar />
        
        <section className="page-header">
          <div>
            <p className="eyebrow">YOUR PROFILE</p>
            <h1>Account settings</h1>
            <p className="subhead">Manage your profile and preferences.</p>
          </div>
        </section>

        <section className="profile-layout">
          <div className="profile-main">
            <div className="profile-card">
              <div className="profile-header">
                <div className="profile-avatar-large">{user.initials}</div>
                <div className="profile-info">
                  <h2>{user.name}</h2>
                  <p>{user.email}</p>
                </div>
                {!isEditing && (
                  <button 
                    className="edit-button"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="profile-edit-form">
                  <div className="form-group">
                    <label>Full name</label>
                    <input
                      type="text"
                      value={editedUser.name}
                      onChange={(e) => setEditedUser({...editedUser, name: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={editedUser.email}
                      onChange={(e) => setEditedUser({...editedUser, email: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={editedUser.phone}
                      onChange={(e) => setEditedUser({...editedUser, phone: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Student ID</label>
                    <input
                      type="text"
                      value={editedUser.studentId}
                      onChange={(e) => setEditedUser({...editedUser, studentId: e.target.value})}
                    />
                  </div>
                  <div className="form-actions">
                    <button className="cancel-button" onClick={handleCancel}>
                      Cancel
                    </button>
                    <button className="save-button" onClick={handleSave}>
                      Save changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="profile-details">
                  <div className="detail-row">
                    <span className="detail-label">Student ID</span>
                    <span className="detail-value">{user.studentId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Institution</span>
                    <span className="detail-value">{user.institution}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Campus</span>
                    <span className="detail-value">{user.campus}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phone</span>
                    <span className="detail-value">{user.phone}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="preferences-card">
              <h3>Preferences</h3>
              
              <div className="preference-section">
                <div className="preference-header">
                  <MapPin size={18} />
                  <h4>Default pickup location</h4>
                </div>
                <div className="pickup-options">
                  {pickupLocations.map((location) => (
                    <button
                      key={location.id}
                      className={`pickup-option ${user.defaultPickupLocation === location.id ? "selected" : ""}`}
                      onClick={() => {
                        const updated = {...user, defaultPickupLocation: location.id};
                        setUser(updated);
                        setEditedUser(updated);
                      }}
                    >
                      <div className="pickup-option-content">
                        <strong>{location.name}</strong>
                        <small>{location.description}</small>
                      </div>
                      {user.defaultPickupLocation === location.id && <div className="selected-indicator">✓</div>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="preference-section">
                <div className="preference-header">
                  <CreditCard size={18} />
                  <h4>Default payment method</h4>
                </div>
                <div className="payment-options">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      className={`payment-option ${user.defaultPaymentMethod === method.id ? "selected" : ""}`}
                      onClick={() => {
                        const updated = {...user, defaultPaymentMethod: method.id};
                        setUser(updated);
                        setEditedUser(updated);
                      }}
                    >
                      <div className="payment-option-content">
                        <strong>{method.name}</strong>
                        <small>{method.description}</small>
                      </div>
                      {user.defaultPaymentMethod === method.id && <div className="selected-indicator">✓</div>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="notifications-card">
              <h3>Notifications</h3>
              <div className="notification-toggle">
                <div className="toggle-info">
                  <Bell size={18} />
                  <div>
                    <strong>Order updates</strong>
                    <small>Get notified about your order status</small>
                  </div>
                </div>
                <button 
                  className={`toggle-switch ${user.notificationSettings.orderUpdates ? "on" : "off"}`}
                  onClick={() => {
                    const updated = {
                      ...user,
                      notificationSettings: {
                        ...user.notificationSettings,
                        orderUpdates: !user.notificationSettings.orderUpdates
                      }
                    };
                    setUser(updated);
                    setEditedUser(updated);
                  }}
                >
                  <span />
                </button>
              </div>
              <div className="notification-toggle">
                <div className="toggle-info">
                  <Smartphone size={18} />
                  <div>
                    <strong>Deadline reminders</strong>
                    <small>Remind me before ordering closes</small>
                  </div>
                </div>
                <button 
                  className={`toggle-switch ${user.notificationSettings.deadlineReminders ? "on" : "off"}`}
                  onClick={() => {
                    const updated = {
                      ...user,
                      notificationSettings: {
                        ...user.notificationSettings,
                        deadlineReminders: !user.notificationSettings.deadlineReminders
                      }
                    };
                    setUser(updated);
                    setEditedUser(updated);
                  }}
                >
                  <span />
                </button>
              </div>
              <div className="notification-toggle">
                <div className="toggle-info">
                  <Bell size={18} />
                  <div>
                    <strong>Ready notifications</strong>
                    <small>Notify when food is ready for pickup</small>
                  </div>
                </div>
                <button 
                  className={`toggle-switch ${user.notificationSettings.readyNotifications ? "on" : "off"}`}
                  onClick={() => {
                    const updated = {
                      ...user,
                      notificationSettings: {
                        ...user.notificationSettings,
                        readyNotifications: !user.notificationSettings.readyNotifications
                      }
                    };
                    setUser(updated);
                    setEditedUser(updated);
                  }}
                >
                  <span />
                </button>
              </div>
            </div>
          </div>

          <div className="profile-sidebar">
            <div className="quick-actions-card">
              <h3>Quick actions</h3>
              <a href="/orders" className="action-link">
                <User size={18} />
                <span>View order history</span>
                <ArrowRight size={16} />
              </a>
              <button className="action-link logout-link" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Log out</span>
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="account-info-card">
              <h3>Account info</h3>
              <div className="info-row">
                <span className="info-label">Member since</span>
                <span className="info-value">January 2024</span>
              </div>
              <div className="info-row">
                <span className="info-label">Total orders</span>
                <span className="info-value">12</span>
              </div>
              <div className="info-row">
                <span className="info-label">Favorite meal</span>
                <span className="info-value">Chicken & coconut rice</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <MobileNav />
    </div>
  );
}