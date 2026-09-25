"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Utensils, LayoutDashboard, Settings2, Search, Clock3, CheckCircle2, ChefHat, PackageCheck, CircleDollarSign, Pencil, Eye, EyeOff } from "lucide-react";
import { meals as defaultMeals } from "@/data/meals";

const ORDER_KEY = "plate_orders";
const MENU_KEY = "plate_admin_menu";

const statusLabels = {
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready for pickup",
  collected: "Collected",
  cancelled: "Cancelled",
};

const nextStatus = {
  confirmed: { value: "preparing", label: "Start preparing" },
  preparing: { value: "ready", label: "Mark ready" },
  ready: { value: "collected", label: "Mark collected" },
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminPage() {
  const [tab, setTab] = useState("overview");
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState(defaultMeals);
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedOrders = localStorage.getItem(ORDER_KEY);
      const savedMenu = localStorage.getItem(MENU_KEY);
      if (savedOrders) setOrders(JSON.parse(savedOrders));
      if (savedMenu) setMenu(JSON.parse(savedMenu));
    } catch (error) {
      console.error("Could not load admin data", error);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(ORDER_KEY, JSON.stringify(orders));
  }, [orders, loaded]);

  useEffect(() => {
    if (loaded) localStorage.setItem(MENU_KEY, JSON.stringify(menu));
  }, [menu, loaded]);

  const filteredOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return orders;
    return orders.filter((order) =>
      [order.id, order.customerName, order.customerPhone, order.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [orders, query]);

  const updateOrderStatus = (id, status) => {
    setOrders((current) => current.map((order) =>
      String(order.id) === String(id) ? { ...order, status, updatedAt: new Date().toISOString() } : order
    ));
  };

  const toggleMeal = (id) => {
    setMenu((current) => current.map((meal) =>
      meal.id === id ? { ...meal, available: !meal.available } : meal
    ));
  };

  const editPrice = (meal) => {
    const entered = window.prompt(`New price for ${meal.name} (KSh)`, String(meal.price));
    if (entered === null) return;
    const price = Number(entered);
    if (!Number.isFinite(price) || price < 0) {
      window.alert("Enter a valid price.");
      return;
    }
    setMenu((current) => current.map((item) => item.id === meal.id ? { ...item, price } : item));
  };

  const activeCount = orders.filter((order) => !["collected", "cancelled"].includes(order.status)).length;
  const today = new Date().toDateString();
  const todayOrders = orders.filter((order) => order.createdAt && new Date(order.createdAt).toDateString() === today);
  const paidTotal = todayOrders.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + Number(order.total || 0), 0);

  const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "menu", label: "Menu", icon: Utensils },
    { id: "settings", label: "Settings", icon: Settings2 },
  ];

  return (
    <main className="min-h-screen bg-[#f6f6f1] text-[#202a23]">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[#e5e6dc] bg-white p-6 md:flex">
          <a href="/" className="mb-10 text-2xl font-black tracking-tight">plate<span className="text-[#d96d54]">.</span><span className="mt-1 block text-xs font-medium tracking-normal text-gray-400">KITCHEN CONSOLE</span></a>
          <nav className="space-y-2">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${tab === id ? "bg-[#263f32] text-white" : "text-gray-500 hover:bg-[#f3f4ee] hover:text-[#263f32]"}`}>
                <Icon size={18} />{label}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl bg-[#f5eee2] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#92724b]">Kitchen tip</p>
            <p className="mt-2 text-sm leading-6 text-[#6e604e]">Keep the order queue updated so customers know when their meals are ready.</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d96d54]">Kitchen & admin</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{tabs.find((item) => item.id === tab)?.label}</h1>
              <p className="mt-2 text-sm text-gray-500">Manage incoming orders, pickup times, and today’s menu.</p>
            </div>
            <a href="/" className="rounded-xl border border-[#e1e3d9] bg-white px-4 py-3 text-sm font-semibold hover:border-[#263f32]">← Customer view</a>
          </header>

          <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-[#e5e6dc] bg-white p-2 md:hidden">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${tab === id ? "bg-[#263f32] text-white" : "text-gray-500"}`}><Icon size={16} />{label}</button>
            ))}
          </div>

          {tab === "overview" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Orders today", value: todayOrders.length, icon: ClipboardList, tint: "bg-[#e9efe5] text-[#426347]" },
                  { label: "Active orders", value: activeCount, icon: ChefHat, tint: "bg-[#f9e8df] text-[#b85e48]" },
                  { label: "Ready for pickup", value: orders.filter((order) => order.status === "ready").length, icon: PackageCheck, tint: "bg-[#f6edd8] text-[#9a7939]" },
                  { label: "Paid today", value: `KSh ${paidTotal.toLocaleString("en-KE")}`, icon: CircleDollarSign, tint: "bg-[#e6eafa] text-[#5268a3]" },
                ].map(({ label, value, icon: Icon, tint }) => (
                  <div key={label} className="rounded-2xl border border-[#e5e6dc] bg-white p-5">
                    <div className="flex items-center justify-between"><span className="text-sm text-gray-500">{label}</span><span className={`grid h-10 w-10 place-items-center rounded-xl ${tint}`}><Icon size={19} /></span></div>
                    <p className="mt-5 text-3xl font-black">{value}</p>
                  </div>
                ))}
              </div>
              <section className="mt-8 rounded-2xl border border-[#e5e6dc] bg-white p-5 sm:p-7">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="text-xl font-extrabold">Latest orders</h2><p className="mt-1 text-sm text-gray-500">Review customer details and pickup schedule.</p></div>
                  <button onClick={() => setTab("orders")} className="text-sm font-bold text-[#426347]">View all orders →</button>
                </div>
                {orders.length ? <OrderTable orders={[...orders].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5)} onStatus={updateOrderStatus} /> : <EmptyOrders />}
              </section>
            </>
          )}

          {tab === "orders" && (
            <section className="rounded-2xl border border-[#e5e6dc] bg-white p-5 sm:p-7">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div><h2 className="text-xl font-extrabold">Order queue</h2><p className="mt-1 text-sm text-gray-500">{orders.length} total orders stored in this browser</p></div>
                <label className="flex min-w-[220px] items-center gap-2 rounded-xl border border-[#e5e6dc] px-3 py-2.5"><Search size={17} className="text-gray-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search orders..." className="w-full bg-transparent text-sm outline-none" /></label>
              </div>
              {filteredOrders.length ? <OrderTable orders={[...filteredOrders].sort((a, b) => new Date(a.pickupTime || a.createdAt || 0) - new Date(b.pickupTime || b.createdAt || 0))} onStatus={updateOrderStatus} /> : <EmptyOrders />}
            </section>
          )}

          {tab === "menu" && (
            <section className="rounded-2xl border border-[#e5e6dc] bg-white p-5 sm:p-7">
              <div className="mb-6"><h2 className="text-xl font-extrabold">Menu management</h2><p className="mt-1 text-sm text-gray-500">Update prices and switch meals on or off for ordering.</p></div>
              <div className="space-y-3">
                {menu.map((meal) => (
                  <div key={meal.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-[#e9eae2] p-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#f2eee5]">{meal.image && <img src={meal.image} alt="" className="h-full w-full object-cover" />}</div>
                    <div className="min-w-[150px] flex-1"><p className="font-bold">{meal.name}</p><p className="mt-1 text-xs text-gray-500">{meal.category}</p><p className="mt-1 font-extrabold text-[#263f32]">KSh {Number(meal.price).toLocaleString("en-KE")}</p></div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${meal.available ? "bg-[#e9efe5] text-[#426347]" : "bg-gray-100 text-gray-500"}`}>{meal.available ? "Available" : "Sold out"}</span>
                    <button onClick={() => editPrice(meal)} className="flex items-center gap-2 rounded-lg border border-[#e2e4da] px-3 py-2 text-sm font-semibold hover:border-[#263f32]"><Pencil size={15} /> Price</button>
                    <button onClick={() => toggleMeal(meal.id)} className="flex items-center gap-2 rounded-lg bg-[#f4f5ef] px-3 py-2 text-sm font-semibold hover:bg-[#e8ece3]">{meal.available ? <EyeOff size={15} /> : <Eye size={15} />}{meal.available ? "Disable" : "Enable"}</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tab === "settings" && (
            <section className="max-w-3xl rounded-2xl border border-[#e5e6dc] bg-white p-5 sm:p-7">
              <h2 className="text-xl font-extrabold">Ordering settings</h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">This first phase is a front-end prototype. Ordering cutoff, pickup-slot capacity, staff permissions, and live payment settings will be connected to the shared backend in a later phase.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-[#f6f6f1] p-4"><p className="text-xs font-bold uppercase tracking-wider text-gray-500">Proposed daily cutoff</p><p className="mt-2 text-2xl font-black">9:00 AM</p><p className="mt-1 text-xs text-gray-500">Kenya time (EAT)</p></div>
                <div className="rounded-xl bg-[#f6f6f1] p-4"><p className="text-xs font-bold uppercase tracking-wider text-gray-500">Payments</p><p className="mt-2 text-2xl font-black">Not connected</p><p className="mt-1 text-xs text-gray-500">Payment provider setup is a later phase.</p></div>
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

function EmptyOrders() {
  return <div className="rounded-xl bg-[#f7f7f2] px-6 py-14 text-center"><Clock3 size={30} className="mx-auto text-gray-400" /><p className="mt-4 font-bold">No orders to show yet</p><p className="mt-2 text-sm text-gray-500">Orders will appear here when they are created in this browser.</p></div>;
}

function OrderTable({ orders, onStatus }) {
  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const action = nextStatus[order.status || "confirmed"];
        return (
          <article key={order.id} className="rounded-xl border border-[#e8e9e1] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-extrabold">Order #{order.id}</p><p className="mt-1 text-xs text-gray-500">Placed {formatDate(order.createdAt)}</p></div>
              <span className="rounded-full bg-[#e9efe5] px-3 py-1 text-xs font-bold text-[#426347]">{statusLabels[order.status] || "Confirmed"}</span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div><p className="text-xs text-gray-400">Customer</p><p className="mt-1 text-sm font-semibold">{order.customerName || order.customer?.name || "Customer details pending"}</p><p className="text-xs text-gray-500">{order.customerPhone || order.customer?.phone || ""}</p></div>
              <div><p className="text-xs text-gray-400">Pickup time</p><p className="mt-1 text-sm font-semibold">{formatDate(order.pickupTime || order.pickupDateTime || order.pickupLocation)}</p></div>
              <div><p className="text-xs text-gray-400">Items</p><p className="mt-1 text-sm font-semibold">{(order.items || []).map((item) => `${item.quantity}× ${item.mealName || item.name || "Meal"}`).join(", ") || "—"}</p></div>
              <div><p className="text-xs text-gray-400">Total / payment</p><p className="mt-1 text-sm font-semibold">KSh {Number(order.total || 0).toLocaleString("en-KE")}</p><p className="text-xs text-gray-500">{order.paymentStatus || order.paymentMethod || "Payment status unknown"}</p></div>
            </div>
            {action && <div className="mt-4 flex justify-end"><button onClick={() => onStatus(order.id, action.value)} className="rounded-lg bg-[#263f32] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#345442]"><CheckCircle2 size={15} className="mr-2 inline" />{action.label}</button></div>}
          </article>
        );
      })}
    </div>
  );
}
