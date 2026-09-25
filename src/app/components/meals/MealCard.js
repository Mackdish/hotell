"use client";

import { Plus, Minus } from "lucide-react";

export default function MealCard({ meal, quantity = 0, onAdd, onRemove, onUpdateQuantity }) {
  const handleAdd = () => {
    if (onAdd) onAdd(meal.id);
  };

  const handleRemove = () => {
    if (onRemove) onRemove(meal.id);
  };

  const handleIncrement = () => {
    if (onUpdateQuantity) onUpdateQuantity(meal.id, quantity + 1);
  };

  const handleDecrement = () => {
    if (onUpdateQuantity) onUpdateQuantity(meal.id, quantity - 1);
  };

  return (
    <article className="meal-card">
      <div 
        className="meal-image" 
        style={{ backgroundImage: `url(${meal.image})` }}
      >
        <span className={`meal-tag ${meal.accent}`}>{meal.category}</span>
      </div>
      
      <div className="meal-info">
        <div>
          <h3>{meal.name}</h3>
          <p>{meal.detail}</p>
        </div>
        <strong>KSh {meal.price}</strong>
        
        <div className="meal-footer">
          {quantity > 0 ? (
            <div className="quantity">
              <button 
                onClick={handleDecrement}
                aria-label={`Remove one ${meal.name}`}
              >
                <Minus size={14} />
              </button>
              <b>{quantity}</b>
              <button 
                onClick={handleIncrement}
                aria-label={`Add one ${meal.name}`}
              >
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <button 
              className="add-button" 
              onClick={handleAdd}
              disabled={!meal.available}
            >
              Add to order <Plus size={15} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}