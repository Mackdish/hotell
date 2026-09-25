"use client";

import MealCard from "./MealCard";

export default function MealGrid({ meals, basket, onAdd, onRemove, onUpdateQuantity }) {
  if (!meals || meals.length === 0) {
    return (
      <div className="empty-state">
        <p>No meals available at the moment.</p>
      </div>
    );
  }

  return (
    <section className="meal-grid">
      {meals.map((meal) => (
        <MealCard
          key={meal.id}
          meal={meal}
          quantity={basket[meal.id] || 0}
          onAdd={onAdd}
          onRemove={onRemove}
          onUpdateQuantity={onUpdateQuantity}
        />
      ))}
    </section>
  );
}