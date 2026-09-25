"use client";

import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { mealCategories } from "@/data/meals";
import { useOrder } from "@/lib/OrderContext";
import Sidebar from "@/app/components/navigation/Sidebar";
import MobileNav from "@/app/components/navigation/MobileNav";
import Topbar from "@/app/components/navigation/Topbar";
import MealGrid from "@/app/components/meals/MealGrid";
import BasketBar from "@/app/components/orders/BasketBar";

export default function MenuPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { basket, menuItems, addToBasket, updateBasketQuantity, getBasketTotal, getBasketCount } = useOrder();

  const handleAddToBasket = (mealId) => {
    addToBasket(mealId, 1);
  };

  const handleUpdateQuantity = (mealId, quantity) => {
    updateBasketQuantity(mealId, quantity);
  };

  const filteredMeals = menuItems.filter((meal) => {
    const matchesCategory = selectedCategory === "all" || 
      meal.category.toLowerCase().includes(selectedCategory.toLowerCase());
    
    const matchesSearch = searchQuery === "" || 
      meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meal.detail.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const basketCount = getBasketCount();
  const basketTotal = getBasketTotal();

  return (
    <div className="app-shell">
      <Sidebar />
      
      <main className="main-content">
        <Topbar />
        
        <section className="page-header">
          <div>
            <p className="eyebrow">EXPLORE OPTIONS</p>
            <h1>Today&apos;s menu</h1>
            <p className="subhead">Choose from {menuItems.length} delicious meals prepared fresh daily.</p>
          </div>
        </section>

        <section className="menu-controls">
          <div className="search-bar">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search meals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="category-tabs">
            {mealCategories.map((category) => (
              <button
                key={category.id}
                className={`category-tab ${selectedCategory === category.id ? "active" : ""}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </section>

        <section className="section-heading">
          <div>
            <p className="eyebrow">AVAILABLE MEALS</p>
            <h2>
              {selectedCategory === "all" ? "All meals" : mealCategories.find(c => c.id === selectedCategory)?.name}
              <span>· {filteredMeals.length} choices</span>
            </h2>
          </div>
        </section>
        
        <MealGrid 
          meals={filteredMeals}
          basket={basket}
          onAdd={handleAddToBasket}
          onUpdateQuantity={handleUpdateQuantity}
        />
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