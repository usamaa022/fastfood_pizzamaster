"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { db, auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  getDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  FaPlus,
  FaMinus,
  FaShoppingCart,
  FaPrint,
  FaEdit,
  FaUtensils,
  FaLeaf,
  FaCocktail,
  FaStar,
  FaTrash,
  FaBoxOpen,
  FaPizzaSlice,
  FaHamburger,
  FaDrumstickBite,
  FaMugHot,
  FaSave,
  FaTimes,
  FaCalendarAlt,
  FaSearch,
  FaChartBar,
  FaChartPie,
  FaSignOutAlt,
  FaExclamationCircle,
} from "react-icons/fa";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, Title, BarElement } from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import LoginPage from "./LoginPage";

// Register the required components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, Title, BarElement);

export default function RestaurantPOS() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menu, setMenu] = useState([]);
  const [starters, setStarters] = useState([]);
  const [drinks, setDrinks] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeCategory, setActiveCategory] = useState("Pizza Offers");
  const [selectedSizes, setSelectedSizes] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editSizePrices, setEditSizePrices] = useState({});
  const [isPrinting, setIsPrinting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [nextOrderId, setNextOrderId] = useState(1);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [fetchedOrder, setFetchedOrder] = useState(null);
  const [orderIdSearch, setOrderIdSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [salesData, setSalesData] = useState({});
  const [monthlySales, setMonthlySales] = useState({});
  const [isFiltered, setIsFiltered] = useState(false);
  const [error, setError] = useState(null);
  const cartRef = useRef(null);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const years = Array.from({ length: 11 }, (_, i) => 2025 + i);
  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#8AC24A', '#FF6B6B', '#4ECDC4', '#45B7D1',
    '#FFBE0B', '#FB5607', '#8338EC', '#3A86FF', '#FF006E',
    '#A5DD9B', '#F9C74F', '#90BE6D', '#43AA8B', '#577590'
  ];

  // Show error message
  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  // Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsLoggedIn(false);
      toast.success("Logged out successfully!");
    } catch (err) {
      showError("Failed to logout. Please try again.");
    }
  };

  // Fetch the latest order ID from Firebase
  const fetchLatestOrderId = async () => {
    try {
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, orderBy("id", "desc"), limit(1));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const latestOrder = snapshot.docs[0].data();
        const latestId = parseInt(latestOrder.id);
        setNextOrderId(latestId + 1);
      } else {
        setNextOrderId(1);
      }
    } catch (error) {
      showError("Failed to fetch latest order ID. Please refresh the page.");
    }
  };

  // Generate the next order ID (3 digits, e.g. 001)
  const generateOrderId = () => {
    return nextOrderId.toString().padStart(3, '0');
  };

  // Categories for the menu
  const categories = [
    { name: "Pizza Offers", color: "bg-red-100", icon: <FaPizzaSlice /> },
    { name: "Burger Offers", color: "bg-yellow-100", icon: <FaHamburger /> },
    { name: "Chicken Shawarma", color: "bg-orange-100", icon: <FaDrumstickBite /> },
    { name: "Pizza Master", color: "bg-purple-100", icon: <FaPizzaSlice /> },
    { name: "Types of Pizza", color: "bg-pink-100", icon: <FaPizzaSlice /> },
  ];

  // Toggle admin view
  const toggleAdminView = () => {
    const newState = !isAdmin;
    setIsAdmin(newState);
    localStorage.setItem("isAdmin", newState.toString());
  };

  // Fetch data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsFetching(true);
        const menuSnapshot = await getDocs(collection(db, "menu"));
        const menuData = menuSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setMenu(menuData);

        const startersSnapshot = await getDocs(collection(db, "starters"));
        const startersData = startersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setStarters(startersData);

        const drinksSnapshot = await getDocs(collection(db, "drinks"));
        const drinksData = drinksSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setDrinks(drinksData);

        const ordersSnapshot = await getDocs(query(collection(db, "orders"), orderBy("id", "desc")));
        const ordersData = ordersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setOrders(ordersData);
        setFilteredOrders(ordersData);

        // Load admin state from localStorage
        const savedAdminState = localStorage.getItem("isAdmin");
        if (savedAdminState) {
          setIsAdmin(savedAdminState === "true");
        }

        await fetchLatestOrderId();
      } catch (error) {
        showError("Failed to fetch data. Please refresh the page.");
      } finally {
        setIsFetching(false);
      }
    };
    fetchData();
  }, []);

  // Calculate sales data for chart
  useEffect(() => {
    const calculateSalesData = () => {
      const data = {
        food: 0,
        drinks: 0,
        delivery: 0,
      };
      const monthlyData = {};
      orders.forEach((order) => {
        const orderDate = new Date(order.date);
        const monthKey = `${orderDate.getFullYear()}-${orderDate.getMonth()}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { food: {}, drinks: {}, delivery: 0, total: 0 };
        }
        order.items.forEach((item) => {
          const key = item.sizes ? `${item.name}-${item.selectedSize}` : item.name;
          if (item.category) {
            if (!monthlyData[monthKey].food[key]) {
              monthlyData[monthKey].food[key] = 0;
            }
            monthlyData[monthKey].food[key] += item.price * item.quantityInCart;
            data.food += item.price * item.quantityInCart;
          } else {
            if (!monthlyData[monthKey].drinks[key]) {
              monthlyData[monthKey].drinks[key] = 0;
            }
            monthlyData[monthKey].drinks[key] += item.price * item.quantityInCart;
            data.drinks += item.price * item.quantityInCart;
          }
        });
        monthlyData[monthKey].delivery += order.deliveryFee || 0;
        monthlyData[monthKey].total += order.total;
        data.delivery += order.deliveryFee || 0;
      });
      setSalesData(data);
      setMonthlySales(monthlyData);
    };
    calculateSalesData();
  }, [orders]);

  // Add item to cart
  const addToCart = (item) => {
    if (item.disabled) {
      showError("This item is currently unavailable.");
      return;
    }
    const size = selectedSizes[item.id] || (item.sizes ? item.sizes[0].name : null);
    const price = item.sizes ? item.sizes.find((s) => s.name === size).price : item.price;
    setCart((prev) => {
      const existingItem = prev.find((i) => i.id === item.id && i.selectedSize === size);
      if (existingItem) {
        return prev.map((i) =>
          i.id === item.id && i.selectedSize === size ? { ...i, quantityInCart: i.quantityInCart + 1 } : i
        );
      } else {
        return [...prev, { ...item, selectedSize: size, price, quantityInCart: 1 }];
      }
    });
    toast.success(`${item.name} ${size ? `(${size})` : ""} added to cart!`);
  };

  // Add starter or drink to cart
  const addStarterOrDrinkToCart = (item) => {
    if (item.disabled) {
      showError("This item is currently unavailable.");
      return;
    }
    setCart((prev) => {
      const existingItem = prev.find((i) => i.id === item.id);
      if (existingItem) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantityInCart: i.quantityInCart + 1 } : i
        );
      } else {
        return [...prev, { ...item, quantityInCart: 1 }];
      }
    });
    toast.success(`${item.name} added to cart!`);
  };

  // Remove item from cart
  const removeFromCart = (id, size) => {
    setCart((prev) => prev.filter((item) => !(item.id === id && item.selectedSize === size)));
    toast.error("Item removed from cart.");
  };

  // Update cart quantity
  const updateCartQuantity = (id, size, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id && item.selectedSize === size
            ? { ...item, quantityInCart: item.quantityInCart + delta }
            : item
        )
        .filter((item) => item.quantityInCart > 0)
    );
  };

  // Place or update order
  const placeOrUpdateOrder = async () => {
    if (cart.length === 0) {
      showError("Your cart is empty!");
      return;
    }
    setIsPrinting(true);
    try {
      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantityInCart, 0);
      const fee = parseFloat(deliveryFee) || 0;
      const total = subtotal + fee;
      if (isEditingOrder && fetchedOrder) {
        // Update existing order
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("id", "==", fetchedOrder.id));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const orderDocRef = doc(db, "orders", querySnapshot.docs[0].id);
          await updateDoc(orderDocRef, {
            items: cart,
            subtotal,
            deliveryFee: fee,
            total,
          });
          toast.success(`Order #${fetchedOrder.id} updated successfully! 🎉`);
          printReceipt({ ...fetchedOrder, items: cart, subtotal, deliveryFee: fee, total });
          setOrders((prev) =>
            prev.map((o) =>
              o.id === fetchedOrder.id
                ? { ...o, items: cart, subtotal, deliveryFee: fee, total }
                : o
            )
          );
          setFilteredOrders((prev) =>
            prev.map((o) =>
              o.id === fetchedOrder.id
                ? { ...o, items: cart, subtotal, deliveryFee: fee, total }
                : o
            )
          );
          setCart([]);
          setIsEditingOrder(false);
          setFetchedOrder(null);
          setDeliveryFee("");
        } else {
          showError("Order not found.");
        }
      } else {
        // Place new order
        const newOrder = {
          id: generateOrderId(),
          items: cart,
          subtotal,
          deliveryFee: fee,
          total,
          date: new Date().toLocaleString(),
        };
        await addDoc(collection(db, "orders"), newOrder);
        setOrders((prev) => [newOrder, ...prev]);
        setFilteredOrders((prev) => [newOrder, ...prev]);
        printReceipt(newOrder);
        toast.success(`Order #${newOrder.id} placed successfully! 🎉`);
        setCart([]);
        setDeliveryFee("");
        setNextOrderId(nextOrderId + 1);
      }
    } catch (error) {
      showError("Failed to place/update order. Please try again.");
    } finally {
      setIsPrinting(false);
    }
  };

  // Start editing an item
  const startEditing = (item) => {
    setEditingItem(item.id);
    setEditName(item.name);
    setEditPrice(item.price || "");
    if (item.sizes) {
      const sizePrices = {};
      item.sizes.forEach((size) => {
        sizePrices[size.name] = size.price;
      });
      setEditSizePrices(sizePrices);
    }
  };

  // Save edited item
  const saveEditing = async (id) => {
    const itemRef = doc(db, "menu", String(id));
    const updatedItem = { ...menu.find((item) => item.id === id) };
    updatedItem.name = editName;
    updatedItem.price = editPrice;
    if (updatedItem.sizes) {
      updatedItem.sizes = updatedItem.sizes.map((size) => ({
        ...size,
        price: editSizePrices[size.name],
      }));
    }
    await updateDoc(itemRef, updatedItem);
    setMenu((prev) =>
      prev.map((item) => (item.id === id ? updatedItem : item))
    );
    setEditingItem(null);
    toast.success("Item updated!");
  };

  // Start editing a starter
  const startEditingStarter = (starter) => {
    setEditingItem(starter.id);
    setEditName(starter.name);
    setEditPrice(starter.price);
  };

  // Save edited starter
  const saveEditingStarter = async (id) => {
    const starterRef = doc(db, "starters", String(id));
    await updateDoc(starterRef, { name: editName, price: editPrice });
    setStarters((prev) =>
      prev.map((starter) =>
        starter.id === id ? { ...starter, name: editName, price: editPrice } : starter
      )
    );
    setEditingItem(null);
    toast.success("Starter updated!");
  };

  // Start editing a drink
  const startEditingDrink = (drink) => {
    setEditingItem(drink.id);
    setEditName(drink.name);
    setEditPrice(drink.price);
  };

  // Save edited drink
  const saveEditingDrink = async (id) => {
    const drinkRef = doc(db, "drinks", String(id));
    await updateDoc(drinkRef, { name: editName, price: editPrice });
    setDrinks((prev) =>
      prev.map((drink) =>
        drink.id === id ? { ...drink, name: editName, price: editPrice } : drink
      )
    );
    setEditingItem(null);
    toast.success("Drink updated!");
  };

  // Print receipt
  const printReceipt = (order) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Pizza Master Receipt</title>
          <style>
            @media print {
              @page { size: 58mm auto; margin: 0; }
            }
            body {
              font-family: 'Courier New', monospace;
              width: 58mm;
              margin: 0;
              padding: 5px;
              font-size: 12px;
              line-height: 1.2;
              color: #000;
            }
            .header {
              text-align: center;
              font-weight: bold;
              margin-bottom: 10px;
              border-bottom: 1px dashed #000;
              padding-bottom: 5px;
            }
            .items {
              margin-bottom: 10px;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
            }
            .total {
              font-weight: bold;
              margin-top: 10px;
              border-top: 1px dashed #000;
              padding-top: 5px;
              text-align: right;
            }
            .footer {
              text-align: center;
              margin-top: 10px;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>Pizza Master</div>
            <div>Order #${order.id}</div>
            <div>${new Date().toLocaleString()}</div>
          </div>
          <div class="items">
            ${order.items
              .map(
                (item) => `
                  <div class="item">
                    <span>${item.name} ${item.selectedSize ? `(${item.selectedSize})` : ""}</span>
                    <span>${item.quantityInCart} x ${item.price} IQD</span>
                  </div>
                `
              )
              .join("")}
            ${order.deliveryFee > 0 ? `<div class="item"><span>Delivery Fee</span><span>${order.deliveryFee} IQD</span></div>` : ''}
          </div>
          <div class="total">
            <div>Subtotal: ${order.subtotal} IQD</div>
            ${order.deliveryFee > 0 ? `<div>Delivery: ${order.deliveryFee} IQD</div>` : ''}
            <div>Total: ${order.total} IQD</div>
          </div>
          <div class="footer">
            <div>Thank you for your order!</div>
            <div>Phone: +9647758501829</div>
            <div>Visit us again!</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Print all orders
  const printAllOrders = () => {
    const ordersToPrint = filteredOrders.length > 0 ? filteredOrders : orders;
    if (ordersToPrint.length === 0) {
      showError("No orders to print.");
      return;
    }
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Pizza Master - All Orders</title>
          <style>
            @media print {
              @page { size: 58mm auto; margin: 0; }
            }
            body {
              font-family: 'Courier New', monospace;
              width: 58mm;
              margin: 0;
              padding: 5px;
              font-size: 12px;
              line-height: 1.2;
              color: #000;
            }
            .order {
              margin-bottom: 20px;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
            }
            .header {
              text-align: center;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .items {
              margin: 5px 0;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
            }
            .total {
              font-weight: bold;
              text-align: right;
              margin-top: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 10px;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>Pizza Master</div>
            <div>All Orders</div>
            <div>${new Date().toLocaleString()}</div>
          </div>
          ${ordersToPrint.map((order) => `
            <div class="order">
              <div class="header">
                <div>Order #${order.id}</div>
                <div>${new Date(order.date).toLocaleString()}</div>
              </div>
              <div class="items">
                ${order.items.map((item) => `
                  <div class="item">
                    <span>${item.name} ${item.selectedSize ? `(${item.selectedSize})` : ""}</span>
                    <span>${item.quantityInCart} x ${item.price} IQD</span>
                  </div>
                `).join("")}
                ${order.deliveryFee > 0 ? `<div class="item"><span>Delivery Fee</span><span>${order.deliveryFee} IQD</span></div>` : ''}
              </div>
              <div class="total">
                <div>Subtotal: ${order.subtotal} IQD</div>
                ${order.deliveryFee > 0 ? `<div>Delivery: ${order.deliveryFee} IQD</div>` : ''}
                <div>Total: ${order.total} IQD</div>
              </div>
            </div>
          `).join("")}
          <div class="footer">
            <div>Total Orders: ${ordersToPrint.length}</div>
            <div>Total Delivery Fee: ${ordersToPrint.reduce((sum, order) => sum + (order.deliveryFee || 0), 0)} IQD</div>
            <div>Total Sales: ${ordersToPrint.reduce((sum, order) => sum + order.total, 0)} IQD</div>
            <div>Thank you!</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Fetch order by ID (for Order History)
  const fetchOrderById = (orderId) => {
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      setCart(order.items);
      setDeliveryFee(order.deliveryFee || "");
      setIsEditingOrder(true);
      setFetchedOrder(order);
      toast.success(`Order #${orderId} loaded for editing!`);
    } else {
      showError("Order not found.");
    }
  };

  // Filter orders by date range or ID
  const handleFilter = () => {
    if (isFiltered) {
      setFromDate("");
      setToDate("");
      setOrderIdSearch("");
      setFilteredOrders(orders);
      setIsFiltered(false);
      return;
    }
    if (!fromDate && !toDate && !orderIdSearch) {
      setFilteredOrders(orders);
      return;
    }
    const [fromDay, fromMonth, fromYear] = fromDate.split('/').map(Number);
    const [toDay, toMonth, toYear] = toDate.split('/').map(Number);
    const from = fromDate ? new Date(fromYear, fromMonth - 1, fromDay) : new Date(0);
    const to = toDate ? new Date(toYear, toMonth - 1, toDay, 23, 59, 59) : new Date();
    const filtered = orders.filter((order) => {
      const orderDate = new Date(order.date);
      const matchesDate = orderDate >= from && orderDate <= to;
      const matchesId = orderIdSearch ? order.id === orderIdSearch : true;
      return matchesDate && matchesId;
    });
    setFilteredOrders(filtered);
    setIsFiltered(true);
  };

  // Auto-scroll cart
  useEffect(() => {
    if (cartRef.current) {
      cartRef.current.scrollTop = cartRef.current.scrollHeight;
    }
  }, [cart]);

  // Chart data for monthly sales
  const getMonthlySalesChartData = () => {
    const monthKey = `${selectedYear}-${selectedMonth}`;
    const monthData = monthlySales[monthKey] || { food: {}, drinks: {}, delivery: 0, total: 0 };
    const foodLabels = Object.keys(monthData.food);
    const foodValues = Object.values(monthData.food);
    const drinkLabels = Object.keys(monthData.drinks);
    const drinkValues = Object.values(monthData.drinks);
    const labels = [...foodLabels, ...drinkLabels, "Delivery Fee"];
    const data = [...foodValues, ...drinkValues, monthData.delivery];
    const backgroundColors = foodLabels.map((_, index) => colors[index % colors.length])
      .concat(drinkLabels.map((_, index) => colors[(index + foodLabels.length) % colors.length]))
      .concat(['#FFCE56']);
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors,
          borderWidth: 1,
        },
      ],
    };
  };

  const getBarChartData = () => {
    const monthKey = `${selectedYear}-${selectedMonth}`;
    const monthData = monthlySales[monthKey] || { food: {}, drinks: {}, delivery: 0, total: 0 };
    const foodLabels = Object.keys(monthData.food);
    const foodValues = Object.values(monthData.food);
    const drinkLabels = Object.keys(monthData.drinks);
    const drinkValues = Object.values(monthData.drinks);
    const labels = [...foodLabels, ...drinkLabels, "Delivery Fee"];
    const data = [...foodValues, ...drinkValues, monthData.delivery];
    const backgroundColors = foodLabels.map((_, index) => colors[index % colors.length])
      .concat(drinkLabels.map((_, index) => colors[(index + foodLabels.length) % colors.length]))
      .concat(['#FFCE56']);
    return {
      labels,
      datasets: [
        {
          label: 'Sales (IQD)',
          data,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors,
          borderWidth: 1,
        },
      ],
    };
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="bottom-left" />
      {error && (
        <div className="fixed top-4 left-4 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
          <FaExclamationCircle className="text-xl" />
          <span>{error}</span>
        </div>
      )}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <img src={`/Images/logo.jpg`} className="w-40 h-20 object-contain rounded-lg shadow-md border border-gray-200" alt="Pizza Master Logo" />
          <h1 className="text-3xl font-bold text-black flex items-center">
            <FaUtensils className="mr-2 text-orange-600" /> Pizza Master
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg flex items-center space-x-2 hover:bg-red-600 transition-colors"
            >
              <FaSignOutAlt className="text-lg" />
              <span>Logout</span>
            </button>
            <button
              onClick={toggleAdminView}
              className={`px-6 py-3 rounded-lg text-white font-medium flex items-center shadow-sm transition-all ${
                isAdmin
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  : "bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600"
              }`}
            >
              {isAdmin ? <FaUtensils className="mr-2" /> : <FaEdit className="mr-2" />}
              {isAdmin ? "Customer View" : "Admin Panel"}
            </button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {isAdmin ? (
          <AdminView
            categories={categories}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            menu={menu}
            starters={starters}
            drinks={drinks}
            editingItem={editingItem}
            editName={editName}
            editPrice={editPrice}
            editSizePrices={editSizePrices}
            setEditName={setEditName}
            setEditPrice={setEditPrice}
            setEditSizePrices={setEditSizePrices}
            setEditingItem={setEditingItem}
            startEditing={startEditing}
            saveEditing={saveEditing}
            startEditingStarter={startEditingStarter}
            saveEditingStarter={saveEditingStarter}
            startEditingDrink={startEditingDrink}
            saveEditingDrink={saveEditingDrink}
          />
        ) : (
          <div className="grid grid-cols-12 gap-8">
            {/* MAIN MENU SECTION */}
            <div className="col-span-12 lg:col-span-5">
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-6 flex items-center text-black">
                  <FaUtensils className="mr-3 text-orange-600" /> Menu
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                  {categories.map((category) => (
                    <button
                      key={category.name}
                      onClick={() => setActiveCategory(category.name)}
                      className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center ${
                        activeCategory === category.name
                          ? `${category.color} text-black shadow-md border border-gray-200`
                          : "bg-gray-100 text-black hover:bg-gray-200"
                      }`}
                    >
                      {category.icon && <span className="mr-2">{category.icon}</span>}
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
              {/* MAIN MENU ITEMS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <AnimatePresence>
                  {menu
                    .filter((item) => item.category === activeCategory)
                    .map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        whileTap={{ scale: 0.98 }}
                        className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all transform hover:-translate-y-1 h-[420px] flex flex-col ${
                          item.disabled ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                      >
                        <div className="relative h-48">
                          <img src={`/Images/${item.id}.jpg`} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          <h3 className="font-bold text-xl mb-2 flex-1 text-black">{item.name}</h3>
                          {item.sizes ? (
                            <div className="flex flex-col space-y-2 mb-4 flex-1">
                              <div className="grid grid-cols-3 gap-2">
                                {item.sizes.map((size) => (
                                  <button
                                    key={size.name}
                                    onClick={() => setSelectedSizes({ ...selectedSizes, [item.id]: size.name })}
                                    disabled={item.disabled}
                                    className={`px-2 py-1 rounded-lg text-sm font-medium transition-colors ${
                                      selectedSizes[item.id] === size.name
                                        ? "bg-teal-100 text-black border border-teal-300"
                                        : "bg-gray-100 text-black hover:bg-gray-200"
                                    } ${item.disabled ? "cursor-not-allowed" : ""}`}
                                  >
                                    {size.name} ({size.price} IQD)
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-800 font-medium text-lg mb-4 flex-1">{item.price} IQD</p>
                          )}
                          <button
                            onClick={() => addToCart(item)}
                            disabled={item.disabled}
                            className={`w-full py-3 rounded-lg flex items-center justify-center font-medium transition-all text-lg ${
                              item.disabled
                                ? "bg-gray-200 cursor-not-allowed text-gray-400"
                                : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm hover:shadow-md active:scale-95 transform transition-transform"
                            }`}
                          >
                            <FaPlus className="mr-2" /> Add to Cart
                          </button>
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            </div>
            {/* STARTERS & DRINKS SECTION */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
              {/* STARTERS SECTION */}
              <div className="bg-white p-4 rounded-xl shadow-sm h-fit">
                <h2 className="text-xl font-bold mb-4 flex items-center text-black justify-between border-b pb-2">
                  <span className="flex items-center">
                    <FaLeaf className="mr-2 text-green-500" /> Starters
                  </span>
                </h2>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                  {starters.map((starter) => (
                    <div
                      key={starter.id}
                      onClick={() => !starter.disabled && addStarterOrDrinkToCart(starter)}
                      className={`bg-gray-50 p-3 rounded-lg flex items-center space-x-3 cursor-pointer hover:bg-gray-100 transition-colors hover:shadow-sm ${
                        starter.disabled ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                    >
                      <img src={`/Images/${starter.id}.jpg`} alt={starter.name} className="w-16 h-16 object-cover rounded-lg mr-3" />
                      <div className="flex-1">
                        <p className="font-medium text-lg text-black">{starter.name}</p>
                        <p className="text-md text-gray-800">{starter.price} IQD</p>
                      </div>
                      <button
                        className={`p-2 rounded-lg transition-colors ${
                          starter.disabled
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 hover:from-green-200 hover:to-emerald-200"
                        }`}
                        disabled={starter.disabled}
                      >
                        <FaPlus className="text-lg" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              {/* DRINKS SECTION */}
              <div className="bg-white p-4 rounded-xl shadow-sm h-fit">
                <h2 className="text-xl font-bold mb-4 flex items-center text-black justify-between border-b pb-2">
                  <span className="flex items-center">
                    <FaMugHot className="mr-2 text-blue-500" /> Drinks
                  </span>
                </h2>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                  {drinks.map((drink) => (
                    <div
                      key={drink.id}
                      onClick={() => !drink.disabled && addStarterOrDrinkToCart(drink)}
                      className={`bg-gray-50 p-3 rounded-lg flex items-center space-x-3 cursor-pointer hover:bg-gray-100 transition-colors hover:shadow-sm ${
                        drink.disabled ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                    >
                      <img src={`/Images/${drink.id}.jpg`} alt={drink.name} className="w-16 h-16 object-cover rounded-lg mr-3" />
                      <div className="flex-1">
                        <p className="font-medium text-lg text-black">{drink.name}</p>
                        <p className="text-md text-gray-800">{drink.price} IQD</p>
                      </div>
                      <button
                        className={`p-2 rounded-lg transition-colors ${
                          drink.disabled
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 hover:from-blue-200 hover:to-indigo-200"
                        }`}
                        disabled={drink.disabled}
                      >
                        <FaPlus className="text-lg" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* CART SECTION */}
            <div className="col-span-12 lg:col-span-4 bg-white p-4 rounded-xl shadow-sm h-[calc(100vh-120px)] sticky top-16 flex flex-col">
              <h2 className="text-xl font-bold mb-4 flex items-center text-black justify-center border-b pb-2">
                <FaShoppingCart className="mr-2 text-purple-600" /> Your Cart
              </h2>
              {cart.length === 0 ? (
                <div className="text-center py-8 px-2 h-full flex flex-col items-center justify-center">
                  <div className="bg-gray-50 p-6 rounded-lg mb-4">
                    <FaShoppingCart className="text-5xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-800 font-medium text-lg">Your cart is empty</p>
                  </div>
                  <p className="text-gray-800">Add items to your cart to place an order</p>
                </div>
              ) : (
                <>
                  <div ref={cartRef} className="space-y-3 mb-4 max-h-[55vh] overflow-y-auto pr-2 flex-1">
                    {cart.map((item) => (
                      <motion.div
                        key={`${item.id}-${item.selectedSize}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex items-start p-4 border border-gray-200 rounded-lg bg-gray-50 w-full"
                      >
                        <img
                          src={`/Images/${item.id}.jpg`}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg mr-4"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg break-words text-black">
                            {item.name} {item.selectedSize ? `(${item.selectedSize})` : ""}
                          </h3>
                          <p className="text-sm text-gray-800 mt-1">
                            {item.price * item.quantityInCart} IQD
                          </p>
                        </div>
                        <div className="flex flex-col items-center ml-2">
                          <div className="flex items-center space-x-3 mb-2">
                            <button
                              onClick={() => updateCartQuantity(item.id, item.selectedSize, -1)}
                              className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                            >
                              <FaMinus className="text-lg" />
                            </button>
                            <span className="text-lg font-medium w-8 text-center text-black">
                              {item.quantityInCart}
                            </span>
                            <button
                              onClick={() => updateCartQuantity(item.id, item.selectedSize, 1)}
                              className="p-2 rounded-full bg-green-50 text-green-500 hover:bg-green-100 transition-colors"
                            >
                              <FaPlus className="text-lg" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id, item.selectedSize)}
                            className="text-red-500 hover:text-red-600 transition-colors mt-2 text-sm flex items-center"
                          >
                            <FaTrash className="mr-1 text-lg" /> Remove
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 pt-4 mt-auto">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-xl text-black">Subtotal:</span>
                      <span className="font-bold text-xl text-purple-600">
                        {cart.reduce((sum, item) => sum + item.price * item.quantityInCart, 0)} IQD
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-lg text-black">Delivery Fee:</span>
                      <input
                        type="number"
                        value={deliveryFee}
                        onChange={(e) => setDeliveryFee(e.target.value)}
                        placeholder="0"
                        className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-right text-black"
                      />
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-xl text-black">Total:</span>
                      <span className="font-bold text-xl text-purple-600">
                        {cart.reduce((sum, item) => sum + item.price * item.quantityInCart, 0) + (parseFloat(deliveryFee) || 0)} IQD
                      </span>
                    </div>
                    <button
                      onClick={placeOrUpdateOrder}
                      disabled={isPrinting}
                      className={`w-full py-4 rounded-lg font-bold shadow-sm transition-all text-xl ${
                        isPrinting
                          ? "bg-gray-300 cursor-not-allowed text-gray-500"
                          : "bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:shadow-lg transform hover:scale-105 active:scale-95"
                      }`}
                    >
                      {isPrinting ? (
                        <>
                          <FaPrint className="mr-2 inline text-xl" /> Printing...
                        </>
                      ) : (
                        <>
                          {isEditingOrder ? (
                            <>
                              <FaSave className="mr-2 text-xl" /> Update Order
                            </>
                          ) : (
                            <>
                              <FaShoppingCart className="mr-2 text-xl" /> Place Order
                            </>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
      {/* ORDER HISTORY SECTION */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-2xl font-bold mb-6 flex items-center text-black">
            <FaCalendarAlt className="mr-3 text-yellow-600" /> Order History
          </h2>
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 mb-6">
            <div className="flex-1">
              <label className="block text-black font-medium mb-2">From</label>
              <input
                type="text"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="dd/mm/yyyy"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>
            <div className="flex-1">
              <label className="block text-black font-medium mb-2">To</label>
              <input
                type="text"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="dd/mm/yyyy"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>
            <div className="flex-1">
              <label className="block text-black font-medium mb-2">Order ID</label>
              <input
                type="text"
                value={orderIdSearch}
                onChange={(e) => setOrderIdSearch(e.target.value)}
                placeholder="e.g. 001"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleFilter}
                className={`px-6 py-3 rounded-lg font-medium flex items-center ${
                  isFiltered
                    ? "bg-gradient-to-r from-red-500 to-pink-500 text-white hover:shadow-md"
                    : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:shadow-md"
                }`}
              >
                {isFiltered ? (
                  <>
                    <FaTimes className="mr-2" /> Remove Filters
                  </>
                ) : (
                  <>
                    <FaSearch className="mr-2" /> Filter & Search
                  </>
                )}
              </button>
              <button
                onClick={printAllOrders}
                className="ml-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg flex items-center hover:shadow-md"
              >
                <FaPrint className="mr-2" /> Print All
              </button>
            </div>
          </div>
          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
            {filteredOrders.length > 0 ? (
              <>
                {filteredOrders.map((order, index) => (
                  <div
                    key={`${order.id}-${index}`}
                    onClick={() => fetchOrderById(order.id)}
                    className="p-4 border border-gray-200 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-lg text-black">Order #{order.id}</p>
                        <p className="text-sm text-gray-800">
                          {new Date(order.date).toLocaleDateString('en-GB')} {new Date(order.date).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-black">{order.total} IQD</p>
                        <p className="text-sm text-gray-800">{order.items.length} items</p>
                        <p className="text-sm text-gray-800">Delivery: {order.deliveryFee || 0} IQD</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="p-4 border-t border-gray-200 mt-4 bg-gray-50">
                  <div className="flex justify-between items-center font-bold text-black">
                    <span>Total Orders: {filteredOrders.length}</span>
                    <span>Total Delivery Fee: {filteredOrders.reduce((sum, order) => sum + (order.deliveryFee || 0), 0)} IQD</span>
                    <span>Total Sales: {filteredOrders.reduce((sum, order) => sum + order.total, 0)} IQD</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-gray-800 py-4">No orders found for this date range.</p>
            )}
          </div>
        </div>
      </div>
      {/* SALES CHART SECTION */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-2xl font-bold mb-6 flex items-center text-black">
            <FaChartPie className="mr-3 text-yellow-600" /> Sales Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-black font-medium mb-2">Select Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
              >
                {months.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-black font-medium mb-2">Select Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="w-full md:w-3/4 mx-auto mb-8">
            <Bar
              data={getBarChartData()}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  title: {
                    display: true,
                    text: `Sales for ${months[selectedMonth]} ${selectedYear} (Bar Chart)`,
                    color: 'black',
                    font: {
                      size: 16,
                    },
                  },
                },
              }}
            />
          </div>
          <div className="w-full md:w-3/4 mx-auto">
            <Pie
              data={getMonthlySalesChartData()}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'right',
                  },
                  title: {
                    display: true,
                    text: `Sales for ${months[selectedMonth]} ${selectedYear} (Pie Chart)`,
                    color: 'black',
                    font: {
                      size: 16,
                    },
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        return `${label}: ${value} IQD`;
                      }
                    }
                  }
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// AdminView component
function AdminView({
  categories,
  activeCategory,
  setActiveCategory,
  menu,
  starters,
  drinks,
  editingItem,
  editName,
  editPrice,
  editSizePrices,
  setEditName,
  setEditPrice,
  setEditSizePrices,
  setEditingItem,
  startEditing,
  saveEditing,
  startEditingStarter,
  saveEditingStarter,
  startEditingDrink,
  saveEditingDrink,
}) {
  return (
    <div className="grid grid-cols-1 gap-8">
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-2xl font-bold mb-6 flex items-center text-gray-800">
          <FaEdit className="mr-3 text-purple-600" /> Manage Menu
        </h2>
        <div className="mb-6">
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => setActiveCategory(category.name)}
                className={`px-3 py-2 rounded-lg font-medium transition-all flex items-center justify-center ${
                  activeCategory === category.name
                    ? `${category.color} text-gray-800 shadow-sm border border-gray-200`
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category.icon && <span className="mr-1">{category.icon}</span>}
                {category.name}
              </button>
            ))}
          </div>
        </div>
        {activeCategory === "Starters" ? (
          <StartersAdminView
            items={starters}
            editingItem={editingItem}
            editName={editName}
            editPrice={editPrice}
            setEditName={setEditName}
            setEditPrice={setEditPrice}
            startEditing={startEditingStarter}
            saveEditing={saveEditingStarter}
            setEditingItem={setEditingItem}
          />
        ) : activeCategory === "Drinks" ? (
          <DrinksAdminView
            items={drinks}
            editingItem={editingItem}
            editName={editName}
            editPrice={editPrice}
            setEditName={setEditName}
            setEditPrice={setEditPrice}
            startEditing={startEditingDrink}
            saveEditing={saveEditingDrink}
            setEditingItem={setEditingItem}
          />
        ) : (
          <MenuAdminView
            items={menu.filter(item => item.category === activeCategory)}
            editingItem={editingItem}
            editName={editName}
            editPrice={editPrice}
            editSizePrices={editSizePrices}
            setEditName={setEditName}
            setEditPrice={setEditPrice}
            setEditSizePrices={setEditSizePrices}
            startEditing={startEditing}
            saveEditing={saveEditing}
            setEditingItem={setEditingItem}
          />
        )}
      </div>
    </div>
  );
}

// StartersAdminView component
function StartersAdminView({
  items,
  editingItem,
  editName,
  editPrice,
  setEditName,
  setEditPrice,
  startEditing,
  saveEditing,
  setEditingItem,
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold mb-4 text-black">Starters</h3>
      <div className="grid grid-cols-1  md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
            {editingItem === item.id ? (
              <EditForm
                editName={editName}
                editPrice={editPrice}
                setEditName={setEditName}
                setEditPrice={setEditPrice}
                onSave={() => saveEditing(item.id)}
                onCancel={() => setEditingItem(null)}
              />
            ) : (
              <ItemDisplay
                item={item}
                onEdit={() => startEditing(item)}
                isMenuItem={false}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// DrinksAdminView component
function DrinksAdminView({
  items,
  editingItem,
  editName,
  editPrice,
  setEditName,
  setEditPrice,
  startEditing,
  saveEditing,
  setEditingItem,
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold mb-4 text-black">Drinks</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
            {editingItem === item.id ? (
              <EditForm
                editName={editName}
                editPrice={editPrice}
                setEditName={setEditName}
                setEditPrice={setEditPrice}
                onSave={() => saveEditing(item.id)}
                onCancel={() => setEditingItem(null)}
              />
            ) : (
              <ItemDisplay
                item={item}
                onEdit={() => startEditing(item)}
                isMenuItem={false}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// MenuAdminView component
function MenuAdminView({
  items,
  editingItem,
  editName,
  editPrice,
  editSizePrices,
  setEditName,
  setEditPrice,
  setEditSizePrices,
  startEditing,
  saveEditing,
  setEditingItem,
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.id} className="p-4 border-2 rounded-xl bg-white shadow-sm">
            {editingItem === item.id ? (
              <EditForm
                editName={editName}
                editPrice={editPrice}
                editSizePrices={editSizePrices}
                setEditName={setEditName}
                setEditPrice={setEditPrice}
                setEditSizePrices={setEditSizePrices}
                onSave={() => saveEditing(item.id)}
                onCancel={() => setEditingItem(null)}
                item={item}
              />
            ) : (
              <ItemDisplay
                item={item}
                onEdit={() => startEditing(item)}
                isMenuItem={true}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// EditForm component
function EditForm({
  editName,
  editPrice,
  editSizePrices,
  setEditName,
  setEditPrice,
  setEditSizePrices,
  onSave,
  onCancel,
  item,
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
          placeholder="Item name"
        />
        {!item?.sizes ? (
          <input
            type="number"
            value={editPrice}
            onChange={(e) => setEditPrice(e.target.value)}
            className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
            placeholder="Price"
          />
        ) : null}
      </div>
      {item?.sizes && (
        <div className="flex flex-wrap gap-2">
          {item.sizes.map((size) => (
            <div key={size.name} className="flex items-center space-x-2">
              <span className="font-medium w-12 text-gray-800">{size.name}:</span>
              <input
                type="number"
                value={editSizePrices[size.name] || ""}
                onChange={(e) =>
                  setEditSizePrices({
                    ...editSizePrices,
                    [size.name]: e.target.value,
                  })
                }
                className="w-20 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800"
                placeholder="Price"
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex space-x-2">
        <button
          onClick={onSave}
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 rounded-lg flex items-center justify-center"
        >
          <FaSave className="mr-1" /> Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg flex items-center justify-center"
        >
          <FaTimes className="mr-1" /> Cancel
        </button>
      </div>
    </div>
  );
}

// ItemDisplay component
function ItemDisplay({ item, onEdit, isMenuItem }) {
  return (
    <>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg text-gray-800 flex-1">{item.name}</h3>
      </div>
      {isMenuItem && item.sizes ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {item.sizes.map((size) => (
            <span key={size.name} className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-800">
              {size.name}: {size.price} IQD
            </span>
          ))}
        </div>
      ) : (
        <p className="text-gray-600 font-medium mb-4">{item.price} IQD</p>
      )}
      <button
        onClick={onEdit}
        className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-2 rounded-lg flex items-center justify-center"
      >
        <FaEdit className="mr-2" /> Edit
      </button>
    </>
  );
}
