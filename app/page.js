"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
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
  FaToggleOn,
  FaToggleOff,
  FaSave,
  FaTimes,
  FaRedo,
} from "react-icons/fa";

export default function RestaurantPOS() {
  // State declarations
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
  const [orderIdInput, setOrderIdInput] = useState("");
  const [fetchedOrder, setFetchedOrder] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [nextOrderId, setNextOrderId] = useState(1);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const cartRef = useRef(null);

  // Load next order ID from localStorage
  useEffect(() => {
    const savedOrderId = localStorage.getItem("nextOrderId");
    if (savedOrderId) {
      setNextOrderId(parseInt(savedOrderId));
    }
  }, []);

  // Generate the next order ID
  const generateOrderId = () => {
    const currentId = nextOrderId;
    const newId = currentId + 1;
    setNextOrderId(newId);
    localStorage.setItem("nextOrderId", newId.toString());
    return newId.toString().padStart(3, '0');
  };

  // Reset order ID
  const resetOrderId = () => {
    const confirmReset = window.confirm("Are you sure you want to reset the order ID?");
    if (confirmReset) {
      setNextOrderId(1);
      localStorage.setItem("nextOrderId", "1");
      toast.success("Order ID reset to 001!");
    }
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
        const menuSnapshot = await getDocs(collection(db, "menu"));
        const menuData = menuSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setMenu(menuData);
        const startersSnapshot = await getDocs(collection(db, "starters"));
        const startersData = startersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setStarters(startersData);
        const drinksSnapshot = await getDocs(collection(db, "drinks"));
        const drinksData = drinksSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setDrinks(drinksData);
        const ordersSnapshot = await getDocs(collection(db, "orders"));
        const ordersData = ordersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setOrders(ordersData);
        // Load admin state from localStorage
        const savedAdminState = localStorage.getItem("isAdmin");
        if (savedAdminState) {
          setIsAdmin(savedAdminState === "true");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to fetch data from Firebase.");
      }
    };
    fetchData();
  }, []);

  // Add item to cart
  const addToCart = (item) => {
    if (item.disabled) {
      toast.error("This item is currently unavailable.", {
        icon: <FaBoxOpen className="text-yellow-500" />,
      });
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
    toast.success(`${item.name} ${size ? `(${size})` : ""} added to cart!`, {
      icon: <FaPlus className="text-green-500" />,
    });
  };

  // Add starter or drink to cart
  const addStarterOrDrinkToCart = (item) => {
    if (item.disabled) {
      toast.error("This item is currently unavailable.", {
        icon: <FaBoxOpen className="text-yellow-500" />,
      });
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
    toast.success(`${item.name} added to cart!`, {
      icon: <FaPlus className="text-green-500" />,
    });
  };

  // Remove item from cart
  const removeFromCart = (id, size) => {
    setCart((prev) => prev.filter((item) => !(item.id === id && item.selectedSize === size)));
    toast.error("Item removed from cart.", {
      icon: <FaTrash className="text-red-500" />,
    });
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
      toast.error("Your cart is empty!", {
        icon: <FaBoxOpen className="text-yellow-500" />,
      });
      return;
    }
    setIsPrinting(true);
    setTimeout(async () => {
      try {
        if (isEditingOrder) {
          // Update existing order
          const ordersRef = collection(db, "orders");
          const q = query(ordersRef, where("id", "==", fetchedOrder.id));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const orderDocRef = doc(db, "orders", querySnapshot.docs[0].id);
            await updateDoc(orderDocRef, {
              items: cart,
              total: cart.reduce((sum, item) => sum + item.price * item.quantityInCart, 0),
            });
            toast.success(`Order #${fetchedOrder.id} updated successfully! 🎉`, {
              icon: <FaShoppingCart className="text-green-500" />,
            });
            printReceipt({ ...fetchedOrder, items: cart, total: cart.reduce((sum, item) => sum + item.price * item.quantityInCart, 0) });
            setCart([]);
            setIsEditingOrder(false);
            setFetchedOrder(null);
          } else {
            toast.error("Order not found.");
          }
        } else {
          // Place new order
          const newOrder = {
            id: generateOrderId(),
            items: cart,
            total: cart.reduce((sum, item) => sum + item.price * item.quantityInCart, 0),
            date: new Date().toLocaleString(),
          };
          await addDoc(collection(db, "orders"), newOrder);
          setOrders((prev) => [...prev, newOrder]);
          printReceipt(newOrder);
          toast.success(`Order #${newOrder.id} placed successfully! 🎉`, {
            icon: <FaShoppingCart className="text-green-500" />,
          });
          setCart([]);
        }
      } catch (error) {
        console.error("Error placing/updating order:", error);
        toast.error("Failed to place/update order.");
      } finally {
        setIsPrinting(false);
      }
    }, 2000);
  };

  // Toggle item availability
  const toggleItemDisabled = async (collectionName, id) => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      const itemRef = doc(db, collectionName, String(id));
      const docSnap = await getDoc(itemRef);
      if (!docSnap.exists()) {
        toast.error("Item not found in database.");
        setIsToggling(false);
        return;
      }
      let item;
      let setStateFunction;
      if (collectionName === "menu") {
        item = menu.find((i) => i.id === id);
        setStateFunction = setMenu;
      } else if (collectionName === "starters") {
        item = starters.find((i) => i.id === id);
        setStateFunction = setStarters;
      } else if (collectionName === "drinks") {
        item = drinks.find((i) => i.id === id);
        setStateFunction = setDrinks;
      }
      if (!item) {
        setIsToggling(false);
        return;
      }
      const newDisabledState = !item.disabled;
      await updateDoc(itemRef, { disabled: newDisabledState });
      setStateFunction((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, disabled: newDisabledState } : item
        )
      );
      toast.success(`Item ${newDisabledState ? "disabled" : "enabled"} successfully!`);
    } catch (error) {
      console.error("Error toggling item:", error);
      toast.error("Failed to toggle item.");
    } finally {
      setIsToggling(false);
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
    toast.success("Item updated!", {
      icon: <FaSave className="text-blue-500" />,
    });
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
    toast.success("Starter updated!", {
      icon: <FaSave className="text-blue-500" />,
    });
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
    toast.success("Drink updated!", {
      icon: <FaSave className="text-blue-500" />,
    });
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
          </div>
          <div class="total">
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

  // Fetch order by ID
  const fetchOrderById = async () => {
    if (!orderIdInput) {
      toast.error("Please enter an Order ID.");
      return;
    }
    setIsFetching(true);
    try {
      const orderId = orderIdInput.padStart(3, '0');
      const ordersRef = collection(db, "orders");
      const q = query(ordersRef, where("id", "==", orderId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const orderDoc = querySnapshot.docs[0];
        const orderData = { id: orderDoc.id, ...orderDoc.data() };
        setFetchedOrder(orderData);
        setCart(orderData.items);
        setIsEditingOrder(true);
        toast.success(`Order #${orderId} fetched successfully!`);
      } else {
        toast.error("Order not found.");
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("Failed to fetch order.");
    } finally {
      setIsFetching(false);
    }
  };

  // Clear daily orders
  const clearDailyOrders = async () => {
    try {
      const ordersRef = collection(db, "orders");
      const snapshot = await getDocs(ordersRef);
      snapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });
      setOrders([]);
      toast.success("All orders cleared for the day!");
    } catch (error) {
      console.error("Error clearing orders:", error);
      toast.error("Failed to clear orders.");
    }
  };

  // Auto-scroll cart
  useEffect(() => {
    if (cartRef.current) {
      cartRef.current.scrollTop = cartRef.current.scrollHeight;
    }
  }, [cart]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <img src={`/Images/logo.jpg`} className="w-40 h-20 object-contain rounded-lg shadow-md border border-gray-200" alt="Pizza Master Logo" />
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <FaUtensils className="mr-2 text-orange-600" /> Pizza Master
          </h1>
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
            toggleItemDisabled={toggleItemDisabled}
            clearDailyOrders={clearDailyOrders}
          />
        ) : (
          <div className="grid grid-cols-12 gap-8">
            {/* MAIN MENU SECTION - Wider column (8/12)  categoryyy*/}
            <div className="col-span-12 lg:col-span-5">
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-6 flex items-center text-gray-800">
                  <FaUtensils className="mr-3 text-orange-600" /> Menu
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                  {categories.map((category) => (
                    <button
                      key={category.name}
                      onClick={() => setActiveCategory(category.name)}
                      className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center ${
                        activeCategory === category.name
                          ? `${category.color} text-gray-800 shadow-md border border-gray-200`
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {category.icon && <span className="mr-2">{category.icon}</span>}
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
              {/* MAIN MENU ITEMS GRID - Changed to 2 items per row */}
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
                          <h3 className="font-bold text-xl mb-2 flex-1 text-gray-800">{item.name}</h3>
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
                                        ? "bg-teal-100 text-teal-800 border border-teal-300"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    } ${item.disabled ? "cursor-not-allowed" : ""}`}
                                  >
                                    {size.name} ({size.price} IQD)
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-600 font-medium text-lg mb-4 flex-1">{item.price} IQD</p>
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
            {/* STARTERS & DRINKS SECTION - Stacked vertically in same column */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
              {/* STARTERS SECTION */}
              <div className="bg-white p-4 rounded-xl shadow-sm h-fit">
                <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800 justify-between border-b pb-2">
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
                        <p className="text-md text-gray-600">{starter.price} IQD</p>
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
                <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800 justify-between border-b pb-2">
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
                        <p className="text-md text-gray-600">{drink.price} IQD</p>
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
            {/* CART SECTION - Extended width */}
            <div className="col-span-12 lg:col-span-4 bg-white p-4 rounded-xl shadow-sm h-[calc(100vh-120px)] sticky top-16 flex flex-col">
              <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800 justify-center border-b pb-2">
                <FaShoppingCart className="mr-2 text-purple-600" /> Your Cart
              </h2>
              {cart.length === 0 ? (
                <div className="text-center py-8 px-2 h-full flex flex-col items-center justify-center">
                  <div className="bg-gray-50 p-6 rounded-lg mb-4">
                    <FaShoppingCart className="text-5xl text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-800 font-medium text-lg">Your cart is empty</p>
                  </div>
                  <p className="text-gray-600">Add items to your cart to place an order</p>
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
                          <h3 className="font-semibold text-lg break-words text-gray-800">
                            {item.name} {item.selectedSize ? `(${item.selectedSize})` : ""}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
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
                            <span className="text-lg font-medium w-8 text-center text-gray-800">
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
                      <span className="font-bold text-xl text-gray-800">Total:</span>
                      <span className="font-bold text-xl text-purple-600">
                        {cart.reduce((sum, item) => sum + item.price * item.quantityInCart, 0)} IQD
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
              <div className="mt-4 p-4 bg-gray-100 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800">
                  <FaBoxOpen className="mr-2 text-yellow-600" /> Past Orders
                </h2>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={orderIdInput}
                    onChange={(e) => setOrderIdInput(e.target.value)}
                    placeholder="Enter Order ID "
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800"
                  />
                  <button
                    onClick={fetchOrderById}
                    disabled={isFetching}
                    className={`px-4 py-2 rounded-lg font-medium flex items-center ${
                      isFetching
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:shadow-md"
                    }`}
                  >
                    {isFetching ? (
                      <>
                        <FaPrint className="mr-2" /> Fetching...
                      </>
                    ) : (
                      <>
                        <FaBoxOpen className="mr-2" /> Fetch Order
                      </>
                    )}
                  </button>
                </div>
                <button
                  onClick={resetOrderId}
                  className="mt-4 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg flex items-center justify-center w-full"
                >
                  <FaRedo className="mr-2" /> Reset Order ID
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
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
  toggleItemDisabled,
  clearDailyOrders,
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
            toggleItemDisabled={toggleItemDisabled}
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
            toggleItemDisabled={toggleItemDisabled}
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
            toggleItemDisabled={toggleItemDisabled}
            setEditingItem={setEditingItem}
          />
        )}
        <button
          onClick={clearDailyOrders}
          className="mt-6 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg flex items-center justify-center"
        >
          <FaTrash className="mr-2" /> Clear Daily Orders
        </button>
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
  toggleItemDisabled,
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold mb-4 text-black">Starters</h3>
      <div className="grid grid-cols-1  md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className={`p-4 border border-gray-200 rounded-lg bg-white shadow-sm ${item.disabled ? "opacity-60" : ""}`}>
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
                onToggle={() => toggleItemDisabled("starters", item.id)}
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
  toggleItemDisabled,
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold mb-4 text-black">Drinks</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className={`p-4 border border-gray-200 rounded-lg bg-white shadow-sm ${item.disabled ? "opacity-60" : ""}`}>
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
                onToggle={() => toggleItemDisabled("drinks", item.id)}
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
  toggleItemDisabled,
  setEditingItem,
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.id} className={`p-4 border-2 rounded-xl bg-white shadow-sm ${item.disabled ? "opacity-60" : ""}`}>
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
                onToggle={() => toggleItemDisabled("menu", item.id)}
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
function ItemDisplay({ item, onEdit, onToggle, isMenuItem }) {
  return (
    <>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg text-gray-800 flex-1">{item.name}</h3>
        {/* <button
          onClick={onToggle}
          className={`p-3 rounded-lg text-white flex items-center justify-center shadow-sm transition-all transform active:scale-95 ${
            item.disabled ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {item.disabled ? <FaToggleOff className="text-lg" /> : <FaToggleOn className="text-lg" />}
        </button> */}
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
