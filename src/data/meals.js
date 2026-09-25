export const meals = [
  {
    id: 1,
    name: "Chicken & coconut rice",
    detail: "Grilled chicken, fragrant rice, kachumbari",
    price: 180,
    category: "Popular",
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85",
    accent: "coral",
    available: true,
    description: "Tender grilled chicken served with aromatic coconut rice and fresh kachumbari salad. A campus favorite that never disappoints.",
    dietary: ["non-vegetarian"],
    prepTime: "15 min",
    calories: 450,
  },
  {
    id: 2,
    name: "Beef stew & ugali",
    detail: "Slow-cooked beef, sukuma wiki, tomato relish",
    price: 150,
    category: "Local favourite",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85",
    accent: "green",
    available: true,
    description: "Traditional Kenyan beef stew slow-cooked to perfection, served with soft ugali and sukuma wiki collard greens.",
    dietary: ["non-vegetarian"],
    prepTime: "20 min",
    calories: 520,
  },
  {
    id: 3,
    name: "Beans & chapati",
    detail: "Creamy coconut beans, two soft chapatis",
    price: 120,
    category: "Plant-based",
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85",
    accent: "gold",
    available: true,
    description: "Hearty coconut beans served with two freshly made soft chapatis. A satisfying plant-based option.",
    dietary: ["vegetarian", "vegan"],
    prepTime: "12 min",
    calories: 380,
  },
  {
    id: 4,
    name: "Pilau special",
    detail: "Spiced rice, beef kofta, kachumbari",
    price: 200,
    category: "Premium",
    image:
      "https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=900&q=85",
    accent: "coral",
    available: true,
    description: "Fragrant spiced pilau rice served with tender beef kofta and fresh kachumbari. A premium Swahili dish.",
    dietary: ["non-vegetarian"],
    prepTime: "18 min",
    calories: 480,
  },
  {
    id: 5,
    name: "Vegetable curry",
    detail: "Mixed vegetables, coconut milk, rice",
    price: 130,
    category: "Plant-based",
    image:
      "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=900&q=85",
    accent: "green",
    available: true,
    description: "Colorful mixed vegetables in rich coconut curry sauce, served with steamed rice. Healthy and delicious.",
    dietary: ["vegetarian", "vegan"],
    prepTime: "15 min",
    calories: 320,
  },
  {
    id: 6,
    name: "Chicken wings",
    detail: "Crispy wings, fries, coleslaw",
    price: 220,
    category: "Popular",
    image:
      "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=900&q=85",
    accent: "coral",
    available: false,
    description: "Crispy fried chicken wings served with golden fries and fresh coleslaw. A student favorite.",
    dietary: ["non-vegetarian"],
    prepTime: "20 min",
    calories: 650,
  },
];

export const mealCategories = [
  { id: "all", name: "All meals" },
  { id: "popular", name: "Popular" },
  { id: "local", name: "Local favourite" },
  { id: "plant-based", name: "Plant-based" },
  { id: "premium", name: "Premium" },
];

export const getMealById = (id) => meals.find((meal) => meal.id === id);

export const getMealsByCategory = (category) => {
  if (category === "all") return meals;
  return meals.filter((meal) => 
    meal.category.toLowerCase().includes(category.toLowerCase())
  );
};

export const searchMeals = (query) => {
  const lowerQuery = query.toLowerCase();
  return meals.filter((meal) =>
    meal.name.toLowerCase().includes(lowerQuery) ||
    meal.detail.toLowerCase().includes(lowerQuery) ||
    meal.description.toLowerCase().includes(lowerQuery)
  );
};