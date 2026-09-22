//Orders.jsx
import React, { useState, useEffect, useMemo } from "react";

import { useParams, useNavigate } from "react-router-dom";

import { MessageSquare, ChevronDown, ListOrdered } from "lucide-react";

import { fetchCategories, fetchMenuItems } from "../menu/menuService";
import { useRealtimeRefresh } from "../shared/lib/useRealtimeRefresh";
import {
  getAllTables,
  claimTable,
  TABLE_STATUS,
} from "../tables/tableService";
import { OrderMenuItemCard } from "./components/OrderMenuItemCard";
import { CategoryStrip } from "./components/CategoryStrip";
import { TablePicker } from "./components/TablePicker";
import { OrderTrackerPanel } from "./components/OrderTrackerPanel";
import { fetchKitchenTickets } from "../kitchen/kitchenService";

import {
  ORDER_STATUS,
  createOrder,
  updateOrderItemNote,
  addOrderItem,
  updateOrderItemQuantity,
  removeOrderItem,
  getOrderItems,
  getActiveOrders,
  getRecentOrders,
  markOrderServed,
  cancelOrder,
  sendRoundToKitchen,
  setRoundKitchenStatus,
} from "./orderService";

import {
  CANCEL_STAGE,
  REQUEST_STATUS,
  STAGE_MESSAGE,
  resolveCancelStage,
  requestCancellation,
  fetchRequestForOrder,
} from "./cancellationService";

const ORDER_TYPES = [
  { value: "dine-in", label: "Dine In" },
  { value: "takeaway", label: "Take Away" },
];

// Label and color for each order status in the Orders panel.
const ORDER_STATUS_DISPLAY = {
  [ORDER_STATUS.OPEN]: {
    label: "Open",
    color: "var(--color-primary-active)",
  },
  [ORDER_STATUS.PAID]: {
    label: "Paid",
    color: "var(--color-success)",
  },
  [ORDER_STATUS.SERVED]: {
    label: "Served",
    color: "var(--color-text-muted)",
  },
  [ORDER_STATUS.CANCELLED]: {
    label: "Cancelled",
    color: "var(--color-danger)",
  },
};

export const OrdersPage = () => {
  const { tableNumber: routeTableNumber } = useParams();

  const tableRef = routeTableNumber || "";

  const navigate = useNavigate();

  const [tables, setTables] = useState([]);

  const [categories, setCategories] = useState([]);

  const [menuItems, setMenuItems] = useState([]);

  const [activeCategory, setActiveCategory] = useState("all");

  // Order type must be selected FIRST.
  // null = nothing selected yet.
  const [selectedOrderType, setSelectedOrderType] = useState(null);

  const [order, setOrder] = useState(null);

  const [cartItems, setCartItems] = useState([]);

  // All recent orders (any status) for the Orders panel.
  const [orderHistory, setOrderHistory] = useState([]);

  const [tableNumber, setTableNumber] = useState(null);

  const [editingItemNoteId, setEditingItemNoteId] = useState(null);

  const [itemNoteDraft, setItemNoteDraft] = useState("");

  const [itemNoteSaving, setItemNoteSaving] = useState(false);

  // ---- Cancellation ----------------------------------------------------
  // এই অর্ডারে ইতিমধ্যে পাঠানো অনুরোধ (থাকলে), আর Manager এর জবাব
  const [cancelRequest, setCancelRequest] = useState(null);

  // "Manager কে অনুরোধ পাঠান" ফর্মটা খোলা আছে কিনা
  const [showCancelRequest, setShowCancelRequest] = useState(false);

  const [cancelReason, setCancelReason] = useState("");

  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const [cancelError, setCancelError] = useState(null);

  // এই অর্ডারটা এখন কোন ধাপে — cancellationService এর নিয়ম মেনে
  const cancelStage = useMemo(
    () => resolveCancelStage(order, cartItems),
    [order, cartItems],
  );

  // অর্ডার বদলালে তার সাথে জড়িত অনুরোধটাও নতুন করে আনা হয়,
  // যাতে Manager এর জবাব cashier এর পর্দায় দেখা যায়।
  useEffect(() => {
    let active = true;

    if (!order?.order_id) {
      setCancelRequest(null);
      setShowCancelRequest(false);
      return;
    }

    fetchRequestForOrder(order.order_id)
      .then((row) => {
        if (active) setCancelRequest(row);
      })
      // টেবিলটা এখনো তৈরি হয়নি — POS আগের মতোই চলবে
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [order?.order_id, order?.status]);

  const [ordersPanelOpen, setOrdersPanelOpen] = useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  // Which table is being seated right now (table picker spinner).
  const [seatingTableId, setSeatingTableId] = useState(null);

  // Every live kitchen ticket across all tables (for the tracker panel).
  const [kitchenTickets, setKitchenTickets] = useState([]);

  // Which ticket is being handed over right now.
  const [handingOverKey, setHandingOverKey] = useState(null);

  async function loadKitchenTickets() {
    try {
      setKitchenTickets(await fetchKitchenTickets());
    } catch (err) {
      // The tracker is an extra; never let it break the till.
      console.warn("Kitchen tracker unavailable:", err.message);
    }
  }

  useEffect(() => {
    bootstrap();
    loadKitchenTickets();
  }, [tableRef]);

  /*
   * Live sync. When the kitchen moves a ticket (preparing / ready) or another
   * cashier changes a table, the database pushes the change and this screen
   * updates on its own — no refresh needed.
   *
   * This is deliberately a quiet refresh: it never shows the full-page
   * loader, so the cashier does not see the screen flash while typing.
   */
  async function refreshQuietly() {
    try {
      const [tableRows, orderRows] = await Promise.all([
        getAllTables(),
        getActiveOrders(),
      ]);

      setTables(tableRows);
      setOrderHistory(await getRecentOrders());

      const liveOrder = order
        ? orderRows.find((row) => row.order_id === order.order_id) || null
        : null;

      // The tab is still open → pull its latest lines (kitchen status etc.)
      if (liveOrder) {
        setCartItems(await getOrderItems(liveOrder.order_id));
      }

      await loadKitchenTickets();
    } catch (err) {
      // A background refresh must never break what the cashier is doing.
      console.warn("Live refresh skipped:", err.message);
    }
  }

  useRealtimeRefresh(
    "cashier-pos",
    ["order_items", "orders", "restaurant_tables"],
    refreshQuietly,
  );

  async function bootstrap() {
    try {
      setLoading(true);

      setError(null);
      const [cats, items, tableRows, orderRows, recentRows] = await Promise.all(
        [
          fetchCategories(),
          fetchMenuItems(),
          getAllTables(),
          getActiveOrders(),
          getRecentOrders(),
        ],
      );

      setTables(tableRows);

      // orderRows (open/paid only) is still used below to find the
      // current order. recentRows (all statuses) feeds the Orders panel.
      setOrderHistory(recentRows);

      setCategories(cats);

      const selectedTableFromRoute = tableRows.find(
        (table) => String(table.table_number) === String(tableRef),
      );

      setTableNumber(selectedTableFromRoute?.table_number ?? null);

      // Route has a table (came from Tables page) = Dine In flow.
      // Set the order type so the header shows the table dropdown
      // instead of "Begin Order".
      if (selectedTableFromRoute) {
        setSelectedOrderType("dine-in");
      }

      setMenuItems(items.filter((item) => item.status === "available"));

      /*
       * Only load an existing order when a table is actually present
       * in the route.
       *
       * Takeaway orders do not use a table.
       *
       * IMPORTANT:
       * Only a Dine In order belonging to this table should be loaded.
       * This prevents an unrelated Take Away order from appearing
       * inside a table's Orders page.
       *
       * getActiveOrders() returns only OPEN tabs, so a paid (closed) order
       * never sticks to its table. Once the guest pays, the same table can
       * immediately start a brand-new order with a new order_id.
       */
      const currentOrder = selectedTableFromRoute
        ? orderRows.find(
            (activeOrder) =>
              activeOrder.table_id === selectedTableFromRoute.table_id &&
              activeOrder.order_type === "dine-in",
          ) || null
        : null;

      setOrder(currentOrder);

      setCartItems(
        currentOrder ? await getOrderItems(currentOrder.order_id) : [],
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleTableSelection(event) {
    const nextTable = tables.find(
      (table) => table.table_id === event.target.value,
    );

    navigate(
      nextTable
        ? `/dashboard/orders/table/${nextTable.table_number}`
        : "/dashboard/orders",
    );
  }

  /*
   * Table picker (grid): the cashier asks the guest which table, taps it,
   * and the table is seated (EMPTY -> OCCUPIED) right away.
   *
   * - Available      -> claim it, then open that table's order screen
   * - Needs cleaning -> ask once, then claim it (do not block a busy counter)
   * - Occupied       -> already seated; just open it (second round of orders)
   */
  async function handlePickTable(table) {
    if (
      table.status === TABLE_STATUS.NEEDS_CLEANING &&
      !window.confirm(
        `Table ${table.table_number} has not been cleaned yet. Seat the guest anyway?`,
      )
    ) {
      return;
    }

    try {
      setError(null);
      setSeatingTableId(table.table_id);

      if (table.status !== TABLE_STATUS.OCCUPIED) {
        await claimTable(table.table_id);
      }

      navigate(`/dashboard/orders/table/${table.table_number}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSeatingTableId(null);
    }
  }

  async function handleStartOrder() {
    // Do not allow an order without selecting Dine In / Take Away.
    if (!selectedOrderType) return;

    // Dine In requires a table.
    if (selectedOrderType === "dine-in" && !selectedTable) {
      return;
    }

    try {
      setError(null);

      // Seat the table if it is not occupied yet. This happens when the
      // previous guest paid and the table was released, and the cashier
      // opens the same table again for the next guest.
      if (
        selectedOrderType === "dine-in" &&
        selectedTable.status !== TABLE_STATUS.OCCUPIED
      ) {
        await claimTable(selectedTable.table_id);
      }

      // The table no longer has to be freed first. The database now allows
      // an order on an occupied table as long as it has no running order,
      // so the guest's seat is never released for a moment in between.
      const createdOrder = await createOrder({
        tableId:
          selectedOrderType === "takeaway" ? null : selectedTable.table_id,
        orderType: selectedOrderType,
      });

      setTables(await getAllTables());

      setOrder(createdOrder);

      setCartItems([]);
      setOrderHistory(await getRecentOrders());
    } catch (err) {
      setError(err.message);
    }
  }

  function startItemNote(line) {
    setEditingItemNoteId(line.order_item_id);

    setItemNoteDraft(line.note || "");
  }

  function cancelItemNote() {
    setEditingItemNoteId(null);

    setItemNoteDraft("");
  }

  async function saveItemNote(line) {
    if (!canEditOrder || itemNoteSaving) return;

    try {
      setItemNoteSaving(true);

      setError(null);

      const updated = await updateOrderItemNote(
        line.order_item_id,
        itemNoteDraft,
      );

      setCartItems((prev) =>
        prev.map((item) =>
          item.order_item_id === line.order_item_id
            ? { ...item, note: updated.note }
            : item,
        ),
      );

      cancelItemNote();
    } catch (err) {
      setError(err.message);
    } finally {
      setItemNoteSaving(false);
    }
  }

  const filteredItems =
    activeCategory === "all"
      ? menuItems
      : menuItems.filter((item) => item.category_id === activeCategory);

  const selectedTable =
    tables.find(
      (table) =>
        String(table.table_number) === String(tableRef) ||
        table.table_id === tableRef,
    ) || null;

  const currentOrderType = order?.order_type || selectedOrderType;

  // A table can be started from any state except "already has a running
  // order". If the table is empty (for example the guest just paid and the
  // floor staff released it), handleStartOrder seats it again first.
  const canStartOrder =
    selectedOrderType === "takeaway"
      ? !order
      : selectedOrderType === "dine-in"
        ? Boolean(selectedTable && !order)
        : false;

  // Only OPEN orders can be edited.
  // PAID and SERVED orders are locked.
  const canEditOrder = Boolean(order && order.status === ORDER_STATUS.OPEN);

  async function handleQuantityChange(menuItem, delta) {
    if (!canEditOrder) return;

    try {
      setError(null);

      // Only an unsent line can grow. If the same item was already sent to
      // the kitchen, a fresh line is started for the next round.
      const existingLine = cartItems.find(
        (cartItem) =>
          cartItem.menu_item_id === menuItem.menu_item_id && !cartItem.sent_at,
      );

      if (!existingLine) {
        if (delta <= 0) return;

        const created = await addOrderItem(order.order_id, {
          menuItemId: menuItem.menu_item_id,
          quantity: 1,
          unitPrice: menuItem.price,
        });

        setCartItems((prev) => [...prev, created]);

        return;
      }

      const newQty = existingLine.quantity + delta;

      if (newQty <= 0) {
        await removeOrderItem(existingLine.order_item_id);

        setCartItems((prev) =>
          prev.filter(
            (cartItem) => cartItem.order_item_id !== existingLine.order_item_id,
          ),
        );

        return;
      }

      const updated = await updateOrderItemQuantity(
        existingLine.order_item_id,
        newQty,
        menuItem.price,
      );

      setCartItems((prev) =>
        prev.map((cartItem) =>
          cartItem.order_item_id === updated.order_item_id ? updated : cartItem,
        ),
      );
    } catch (err) {
      setError(err.message);
    }
  }

  // Pay-last flow: items wait in the tab until the cashier sends them.
  // Sent items are locked (the kitchen is already cooking them).
  const pendingItems = cartItems.filter((line) => !line.sent_at);


  const hasPendingItems = pendingItems.length > 0;

  const subtotal = cartItems.reduce(
    (sum, cartItem) => sum + Number(cartItem.subtotal),
    0,
  );

  const vat = Math.round(subtotal * 0.075);

  const grandTotal = subtotal + vat;
  // Can proceed only if there's an OPEN order with at least one item.
  // Pay-last: the bill closes the whole tab, so nothing may still be
  // waiting to go to the kitchen (the database refuses it too).
  const canProceedToPayment =
    Boolean(order?.order_id) &&
    order.status === ORDER_STATUS.OPEN &&
    cartItems.length > 0 &&
    !cartItems.some((line) => !line.sent_at);
  /*
   * Mark Order as Served:
   *
   * Payment is completed first in Billing:
   * OPEN → PAID
   *
   * Once the customer actually receives/collects the food:
   * PAID → SERVED
   *
   * IMPORTANT:
   * After this order becomes SERVED, the current order is cleared.
   * This allows the same table to immediately create another
   * completely new order with a different order_id.
   */
  // ⚠️ No longer wired to any button. In the pay-last flow serving happens
  // per kitchen round on the Kitchen board, so this whole order-level step
  // is gone. Left here only for reference while Person 2 reviews the change.
  // eslint-disable-next-line no-unused-vars
  async function handleMarkAsServed() {
    if (!order || order.status !== ORDER_STATUS.PAID) {
      return;
    }

    try {
      setError(null);

      await markOrderServed(order.order_id);

      // The database frees the table when the bill is paid, but here the
      // table stays occupied until the cashier marks Needs Cleaning.
      // If it was freed, put it back.
      if (order.table_id) {
        const freshTables = await getAllTables();

        const orderTable = freshTables.find(
          (tableRow) => tableRow.table_id === order.table_id,
        );

        if (orderTable?.status === TABLE_STATUS.EMPTY) {
          await claimTable(order.table_id);
          setTables(await getAllTables());
        } else {
          setTables(freshTables);
        }
      }

      // The served order is finished.
      // Clear it so this table can place a new order.
      setOrder(null);

      setCartItems([]);

      setEditingItemNoteId(null);

      setItemNoteDraft("");

      setOrderHistory(await getRecentOrders());
    } catch (err) {
      setError(err.message);
    }
  }

  // Cancel an order.
  //
  // কে বাতিল করতে পারবে সেটা রান্নাঘরের টিকিটের অবস্থার উপর নির্ভর করে:
  //   কিছু পাঠানো হয়নি / queued → cashier নিজেই
  //   preparing                  → কেউ না (রান্না চলছে)
  //   ready / served             → Manager এর অনুমোদন
  //   বিল হয়ে গেছে               → আর বাতিল হবে না
  // একই নিয়ম ডেটাবেজেও বসানো আছে, তাই এখানে ফাঁকি দিলেও কাজ হবে না।
  async function handleCancelOrder() {
    if (!order) return;

    if (
      cancelStage === CANCEL_STAGE.LOCKED ||
      cancelStage === CANCEL_STAGE.SETTLED
    ) {
      setError(STAGE_MESSAGE[cancelStage]);
      return;
    }

    // গেস্টের কাছে পৌঁছে গেছে — এখন Manager এর কাছে অনুরোধ যাবে
    if (cancelStage === CANCEL_STAGE.REQUEST) {
      setCancelError(null);
      setCancelReason("");
      setShowCancelRequest(true);
      return;
    }

    const confirmed = window.confirm(
      `Cancel order #${order.order_number}? This cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      setError(null);

      await cancelOrder(order.order_id);

      // Cancelled order is finished - clear it so this table
      // can start a brand-new order.
      setOrder(null);

      setCartItems([]);

      setEditingItemNoteId(null);

      setItemNoteDraft("");

      setCancelRequest(null);

      setOrderHistory(await getRecentOrders());
    } catch (err) {
      setError(err.message);
    }
  }

  // Manager এর কাছে বাতিলের অনুরোধ পাঠানো
  async function handleSubmitCancelRequest(event) {
    event.preventDefault();

    const reason = cancelReason.trim();

    if (!reason) {
      setCancelError("Write what the guest said — the Manager needs the reason.");
      return;
    }

    try {
      setCancelSubmitting(true);
      setCancelError(null);

      await requestCancellation(order.order_id, reason);

      setShowCancelRequest(false);
      setCancelReason("");
      setCancelRequest(await fetchRequestForOrder(order.order_id));
    } catch (err) {
      setCancelError(err.message);
    } finally {
      setCancelSubmitting(false);
    }
  }

  // Re-open an order from the Active Orders panel.
  // Needed for Take Away orders: they have no table in the route,
  // so after going to Billing and coming back they could not be found again.
  async function handleOpenActiveOrder(activeOrder) {
    // Dine-in: go to the table route, bootstrap() loads it.
    if (activeOrder.order_type === "dine-in") {
      const table = tables.find(
        (tableRow) => tableRow.table_id === activeOrder.table_id,
      );

      if (table) {
        navigate(`/dashboard/orders/table/${table.table_number}`);
        return;
      }
    }

    // Take Away: load it directly.
    try {
      setError(null);

      setSelectedOrderType(activeOrder.order_type);

      setOrder(activeOrder);

      setCartItems(await getOrderItems(activeOrder.order_id));
    } catch (err) {
      setError(err.message);
    }
  }

  /*
   * Payment handoff:
   *
   * The Billing page is handled by Pritam. When the bill is created
   * there, the database trigger (bills_after_insert) sets
   * orders.status = 'paid'. When the cashier returns here, the PAID
   * buttons (Mark as Served / Mark as Cancelled) appear automatically.
   *
   * Orders passes the internal UUID to the Billing module.
   *
   * Example:
   * /dashboard/billing/550e8400-e29b-41d4-a716-446655440000
   *
   * The UUID remains the internal database order_id.
   */
  /*
   * Send to kitchen (cashier presses this).
   *
   * Everything not sent yet becomes one round, is locked for editing, and
   * ingredient stock is deducted right then — because that is the moment
   * the food actually gets made. The guest can keep adding more items
   * afterwards; they simply go out as the next round.
   */
  async function handleSendToKitchen() {
    if (!order?.order_id || !hasPendingItems) return;

    try {
      setError(null);

      await sendRoundToKitchen(order.order_id);

      setCartItems(await getOrderItems(order.order_id));
    } catch (err) {
      setError(err.message);
    }
  }

  /*
   * The cashier hands the food to the guest. Marking a round "served" is
   * the last kitchen step; the Kitchen board is for the floor/kitchen staff,
   * so the cashier does this from the popup on their own screen.
   */
  async function handleHandOverTicket(ticket) {
    setHandingOverKey(ticket.key);

    try {
      setError(null);

      await setRoundKitchenStatus(ticket.orderId, ticket.round, "served");

      await loadKitchenTickets();

      // If it belonged to the tab on screen, refresh its lines too
      if (order?.order_id === ticket.orderId) {
        setCartItems(await getOrderItems(order.order_id));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setHandingOverKey(null);
    }
  }

  function handleProceedToPayment() {
    if (!order?.order_id) return;

    navigate(`/dashboard/billing/${order.order_id}`);
  }

  if (loading) {
    return <div style={styles.page}>Loading order…</div>;
  }

  return (
    <div style={styles.page}>
      {error && <div style={styles.errorBanner}>Error: {error}</div>}

      <div style={styles.catalog}>
        <div style={styles.catalogHeader}>
          <div>
            <div style={styles.eyebrow}>CATALOG</div>

            <h2 style={styles.catalogTitle}>Choose items</h2>
          </div>

          {selectedTable && !order && (
            <button
              type="button"
              onClick={() => navigate("/dashboard/orders")}
              style={styles.changeTableBtn}
            >
              Change table
            </button>
          )}
        </div>

        {/* Category cards — same look as the Menu Directory */}
        <CategoryStrip
          categories={categories}
          menuItems={menuItems}
          activeCategory={activeCategory}
          onChange={setActiveCategory}
        />

        {!order && !selectedOrderType && (
          <div style={styles.lockedNote}>
            Choose Dine In or Take Away to begin.
          </div>
        )}

        {!order && selectedOrderType === "takeaway" && (
          <div style={styles.lockedNote}>
            Start a takeaway order when the cashier is ready.
          </div>
        )}

        {/* Dine In without a table yet → show every table with its status */}
        {!order && selectedOrderType === "dine-in" && !selectedTable && (
          <TablePicker
            tables={tables}
            selectedTableId={selectedTable?.table_id || null}
            onPick={handlePickTable}
            busyTableId={seatingTableId}
          />
        )}

        {!order &&
          selectedOrderType === "dine-in" &&
          tableRef &&
          canStartOrder && (
            <div style={styles.lockedNote}>
              Table selected. Start an order when the cashier is ready.
            </div>
          )}

        {tableRef &&
          !order &&
          selectedTable?.status === TABLE_STATUS.OCCUPIED && (
            <div style={styles.lockedNote}>
              This occupied table has no active order. Start a new order when
              the cashier is ready.
            </div>
          )}

        {order?.status === ORDER_STATUS.PAID && (
          <div style={styles.lockedNote}>
            Payment completed — waiting to be served.
          </div>
        )}

        {/* Hide the menu while the cashier is still choosing a table */}
        <div
          style={{
            ...styles.itemsGrid,
            display:
              !order && selectedOrderType === "dine-in" && !selectedTable
                ? "none"
                : styles.itemsGrid.display,
          }}
        >
          {filteredItems.map((item) => {
            const categoryName =
              categories.find(
                (category) => category.category_id === item.category_id,
              )?.name || "Menu item";

            const line = cartItems.find(
              (cartItem) => cartItem.menu_item_id === item.menu_item_id,
            );

            return (
              <OrderMenuItemCard
                key={item.menu_item_id}
                item={item}
                categoryName={categoryName}
                disabled={!canEditOrder}
                quantity={line?.quantity || 0}
                onSelect={() => handleQuantityChange(item, 1)}
                onIncrement={() => handleQuantityChange(item, 1)}
                onDecrement={() => handleQuantityChange(item, -1)}
              />
            );
          })}
        </div>
      </div>

      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.tableHeadingLine}>
            {!currentOrderType && !order && (
              <span style={styles.tableHeadingText}>Begin Order</span>
            )}

            {currentOrderType === "dine-in" && (
              <select
                aria-label="Select order table"
                value={selectedTable?.table_id || order?.table_id || ""}
                onChange={handleTableSelection}
                style={styles.tablePickerInline}
              >
                <option value="">Select Table</option>

                {/* Every table is listed with its status, so the cashier can
                    switch from here too — not only from the picker grid. */}
                {tables.map((table) => (
                  <option key={table.table_id} value={table.table_id}>
                    Table {table.table_number}
                    {table.status === TABLE_STATUS.EMPTY
                      ? " · available"
                      : table.status === TABLE_STATUS.OCCUPIED
                        ? " · occupied"
                        : " · needs cleaning"}
                  </option>
                ))}
              </select>
            )}

            {currentOrderType === "takeaway" && (
              <span style={styles.tableHeadingText}>Take Away</span>
            )}

            {order?.order_number && (
              <span style={styles.orderNumber}>#{order.order_number}</span>
            )}
          </div>
        </div>

        <button
          type="button"
          style={styles.ordersToggleBtn}
          onClick={() => setOrdersPanelOpen((value) => !value)}
          aria-expanded={ordersPanelOpen}
        >
          <ListOrdered size={13} />
          <span>Recent Orders ({orderHistory.length})</span>

          <ChevronDown
            size={13}
            style={{
              marginLeft: "auto",
              transform: ordersPanelOpen ? "rotate(180deg)" : "none",
              transition: "transform 0.15s",
            }}
          />
        </button>

        {ordersPanelOpen && (
          <div style={styles.ordersPanel}>
            {orderHistory.length === 0 ? (
              <div style={styles.lockedNote}>No orders yet.</div>
            ) : (
              orderHistory.map((historyOrder) => {
                const table = tables.find(
                  (tableRow) => tableRow.table_id === historyOrder.table_id,
                );

                const statusInfo = ORDER_STATUS_DISPLAY[
                  historyOrder.status
                ] || {
                  label: historyOrder.status,
                  color: "var(--color-text-muted)",
                };

                // Only a running tab can be reopened. Paid / cancelled rows
                // are history — the tab is closed and its table is free for
                // the next guest.
                const canReopen = historyOrder.status === ORDER_STATUS.OPEN;

                return (
                  <div
                    key={historyOrder.order_id}
                    style={{
                      ...styles.ordersPanelRow,
                      cursor: canReopen ? "pointer" : "default",
                    }}
                    onClick={
                      canReopen
                        ? () => handleOpenActiveOrder(historyOrder)
                        : undefined
                    }
                  >
                    <span style={styles.ordersPanelOrderNum}>
                      Order #{historyOrder.order_number}
                    </span>

                    <span
                      style={{
                        ...styles.ordersPanelStatus,
                        color: statusInfo.color,
                      }}
                    >
                      {statusInfo.label}
                    </span>

                    <span style={styles.ordersPanelTableLabel}>
                      {historyOrder.order_type === "takeaway"
                        ? "Take Away"
                        : `Table ${table?.table_number ?? "—"}`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {!order && (
          <div style={styles.orderTypeRow}>
            {ORDER_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setSelectedOrderType(type.value)}
                style={{
                  ...styles.orderTypeBtn,
                  backgroundColor:
                    selectedOrderType === type.value
                      ? "var(--color-primary)"
                      : "transparent",
                  color:
                    selectedOrderType === type.value
                      ? "#fff"
                      : "var(--color-text-main)",
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        )}

        {canStartOrder && (
          <button style={styles.primaryBtn} onClick={handleStartOrder}>
            Start Order
          </button>
        )}

        <div style={styles.cart}>
          {cartItems.map((line) => {
            const menuItem = menuItems.find(
              (item) => item.menu_item_id === line.menu_item_id,
            );

            const isEditingNote = editingItemNoteId === line.order_item_id;

            // Already with the kitchen → read only
            const isSent = Boolean(line.sent_at);

            return (
              <div
                key={line.order_item_id}
                style={{
                  ...styles.cartRow,
                  opacity: isSent ? 0.75 : 1,
                }}
              >
                <div style={styles.cartThumb}>
                  {menuItem?.image_url ? (
                    <img
                      src={menuItem.image_url}
                      alt=""
                      style={styles.cartThumbImg}
                    />
                  ) : null}
                </div>

                <div style={styles.cartMain}>
                  <div style={styles.cartItemName}>
                    {menuItem?.name ?? line.menu_item_id}

                    {isSent && (
                      <span style={styles.kitchenTag}>
                        {line.kitchen_status === "ready"
                          ? "READY"
                          : line.kitchen_status === "preparing"
                            ? "COOKING"
                            : line.kitchen_status === "served"
                              ? "SERVED"
                              : "IN KITCHEN"}
                      </span>
                    )}
                  </div>

                  {isEditingNote ? (
                    <input
                      autoFocus
                      value={itemNoteDraft}
                      onChange={(event) => setItemNoteDraft(event.target.value)}
                      onBlur={() => saveItemNote(line)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          saveItemNote(line);
                        }

                        if (event.key === "Escape") {
                          cancelItemNote();
                        }
                      }}
                      placeholder="e.g. More ice"
                      disabled={itemNoteSaving}
                      style={styles.itemNoteInput}
                    />
                  ) : (
                    <div style={styles.cartMetaRow}>
                      <span style={styles.cartUnitPrice}>
                        ৳ {Number(line.unit_price).toFixed(2)}
                      </span>

                      <span style={styles.cartQtyTag}>{line.quantity}X</span>

                      <button
                        type="button"
                        style={{
                          ...styles.itemNoteButton,
                          color: line.note
                            ? "var(--color-primary-active)"
                            : "var(--color-text-muted)",
                        }}
                        disabled={!canEditOrder || isSent}
                        onClick={() => startItemNote(line)}
                        title={line.note ? "Edit note" : "Add note"}
                      >
                        <MessageSquare size={13} />
                      </button>

                      {line.note && (
                        <span style={styles.inlineNote} title={line.note}>
                          {line.note}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <span style={styles.cartItemPrice}>
                  ৳ {Number(line.subtotal).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>

        <div style={styles.summary}>
          <div style={styles.summaryRow}>
            <span>Sub Total</span>
            <span>৳ {subtotal}</span>
          </div>

          <div style={styles.summaryRow}>
            <span>Tax 7.5%</span>
            <span>৳ {vat}</span>
          </div>

          <div
            style={{
              ...styles.summaryRow,
              fontWeight: 800,
            }}
          >
            <span>Total Amount</span>
            <span>৳ {grandTotal}</span>
          </div>
        </div>
        {/* ---- Manager কে বাতিলের অনুরোধ ---------------------------------- */}
        {showCancelRequest && (
          <form onSubmit={handleSubmitCancelRequest} style={styles.cancelForm}>
            <div style={styles.cancelFormTitle}>
              Send this to the Manager
            </div>

            <p style={styles.cancelFormHint}>
              {STAGE_MESSAGE[CANCEL_STAGE.REQUEST]}
            </p>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="What did the guest say? e.g. Latte arrived cold, guest refused a remake and wants the money back."
              style={styles.cancelTextarea}
              autoFocus
            />

            {cancelError && (
              <div style={styles.cancelError}>{cancelError}</div>
            )}

            <div style={styles.cancelFormActions}>
              <button
                type="button"
                onClick={() => setShowCancelRequest(false)}
                disabled={cancelSubmitting}
                style={styles.cancelGhostBtn}
              >
                Never mind
              </button>
              <button
                type="submit"
                disabled={cancelSubmitting}
                style={styles.dangerBtn}
              >
                {cancelSubmitting ? "Sending…" : "Send Request"}
              </button>
            </div>
          </form>
        )}

        {/* ---- অনুরোধের অবস্থা ও Manager এর জবাব ------------------------- */}
        {cancelRequest && (
          <div
            style={{
              ...styles.requestBanner,
              borderColor:
                cancelRequest.status === REQUEST_STATUS.APPROVED
                  ? "var(--color-success)"
                  : cancelRequest.status === REQUEST_STATUS.REJECTED
                    ? "var(--color-danger)"
                    : "var(--color-border)",
            }}
          >
            <div style={styles.requestBannerHead}>
              {cancelRequest.status === REQUEST_STATUS.PENDING
                ? "Cancellation request sent — waiting for the Manager"
                : cancelRequest.status === REQUEST_STATUS.APPROVED
                  ? "Manager approved the cancellation"
                  : "Manager rejected the cancellation"}
            </div>

            {cancelRequest.manager_message && (
              <p style={styles.requestBannerText}>
                “{cancelRequest.manager_message}”
              </p>
            )}

          </div>
        )}

        {order?.status === ORDER_STATUS.OPEN && (
          <>
            <button
              style={{
                ...styles.sendKitchenBtn,
                opacity: hasPendingItems ? 1 : 0.5,
                cursor: hasPendingItems ? "pointer" : "not-allowed",
              }}
              onClick={hasPendingItems ? handleSendToKitchen : undefined}
              disabled={!hasPendingItems}
            >
              {hasPendingItems
                ? `Send ${pendingItems.length} item${pendingItems.length === 1 ? "" : "s"} to Kitchen`
                : "Everything sent to kitchen"}
            </button>

            <button
              style={{
                ...styles.primaryBtn,
                opacity: canProceedToPayment ? 1 : 0.5,
                cursor: canProceedToPayment ? "pointer" : "not-allowed",
              }}
              onClick={canProceedToPayment ? handleProceedToPayment : undefined}
              disabled={!canProceedToPayment}
              title={
                canProceedToPayment
                  ? ""
                  : cartItems.length === 0
                    ? "Please select some items."
                    : ""
              }
            >
              {cartItems.length === 0
                ? "Please select some items."
                : hasPendingItems
                  ? "Send the new items to the kitchen first"
                  : "Proceed to Payment"}
            </button>

            <button
              style={{
                ...styles.dangerBtn,
                opacity: cancelStage === CANCEL_STAGE.LOCKED ? 0.5 : 1,
                cursor:
                  cancelStage === CANCEL_STAGE.LOCKED ? "not-allowed" : "pointer",
              }}
              onClick={handleCancelOrder}
              disabled={cancelStage === CANCEL_STAGE.LOCKED}
              title={STAGE_MESSAGE[cancelStage] || ""}
            >
              {cancelStage === CANCEL_STAGE.LOCKED
                ? "Kitchen is cooking — cannot cancel"
                : cancelStage === CANCEL_STAGE.REQUEST
                  ? "Ask Manager to Cancel"
                  : "Cancel Order"}
            </button>
          </>
        )}
        {/* PAID = bill collected in Billing (Pritam's module) */}
        {/*
          Pay-last: the bill closes the tab. Serving is tracked per kitchen
          round on the Kitchen board, so there is no order-level "Served"
          step any more — and a settled bill can no longer be cancelled
          (the database refuses both).
        */}
        {order?.status === ORDER_STATUS.PAID && (
          <>
            <div style={styles.lockedNote}>
              Bill settled. Remaining items are tracked on the Kitchen board.
            </div>

            <button
              style={styles.primaryBtn}
              onClick={() => navigate("/dashboard/tables")}
            >
              Back to Tables
            </button>
          </>
        )}

        {order?.status === ORDER_STATUS.SERVED && (
          <div style={styles.lockedNote}>Order Served</div>
        )}
      </div>

      {/* Order tracker — every live ticket, all tables, bottom right */}
      <OrderTrackerPanel
        tickets={kitchenTickets}
        currentOrderId={order?.order_id || null}
        onHandOver={handleHandOverTicket}
        busyKey={handingOverKey}
      />
    </div>
  );
};

const styles = {
  page: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 360px)",
    gap: "18px",
    padding: "4px 0 40px",
  },

  eyebrow: {
    color: "var(--color-primary-active)",
    fontSize: "0.68rem",
    fontWeight: 800,
    letterSpacing: "0.12em",
  },

  errorBanner: {
    gridColumn: "1 / -1",
    background: "var(--color-danger-bg)",
    color: "var(--color-danger)",
    padding: "11px 14px",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(192, 57, 43, 0.18)",
    fontSize: "0.86rem",
    fontWeight: 600,
  },

  catalog: {
    minWidth: 0,
    padding: "18px",
    backgroundColor: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
  },

  catalogHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "14px",
  },

  catalogTitle: {
    marginTop: "3px",
    fontSize: "1.3rem",
    fontWeight: 800,
  },

  kitchenTag: {
    marginLeft: "8px",
    padding: "1px 7px",
    borderRadius: "var(--radius-full)",
    backgroundColor: "var(--color-info-bg)",
    color: "var(--color-info)",
    fontSize: "0.62rem",
    fontWeight: 800,
    letterSpacing: "0.03em",
    verticalAlign: "middle",
  },
  sendKitchenBtn: {
    width: "100%",
    minHeight: "46px",
    borderRadius: "var(--radius-md)",
    border: "none",
    backgroundColor: "var(--color-primary-active)",
    color: "#fff",
    fontWeight: 800,
    fontSize: "0.9rem",
    marginBottom: "8px",
  },
  // "Change table" — shown once a table is picked but the order hasn't started
  changeTableBtn: {
    minHeight: "40px",
    padding: "0 16px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-white)",
    color: "var(--color-primary-active)",
    fontWeight: 700,
    fontSize: "0.82rem",
  },
  categorySelect: {
    minWidth: "190px",
    height: "40px",
    padding: "0 38px 0 13px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--color-white)",
    color: "var(--color-text-main)",
    fontWeight: 700,
    fontSize: "0.82rem",
    outline: "none",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(34, 42, 30, 0.06)",
    appearance: "none",
    backgroundImage:
      'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b735f%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E")',
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    backgroundSize: "14px",
  },

  lockedNote: {
    fontSize: "0.82rem",
    color: "var(--color-text-muted)",
    marginBottom: "10px",
  },

  itemsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
    gap: "16px",
  },

  sidebar: {
    alignSelf: "stretch",
    height: "100%",
    boxSizing: "border-box",
    position: "sticky",
    top: "20px",
    minWidth: 0,
    padding: "18px",
    backgroundColor: "var(--color-white)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-md)",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  sidebarHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "10px",
    paddingBottom: "14px",
    borderBottom: "1px solid var(--color-border-light)",
  },

  tableHeadingLine: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    gap: "8px",
    minHeight: "40px",
  },

  tableHeadingText: {
    fontSize: "1.05rem",
    fontWeight: 800,
    color: "var(--color-text-main)",
  },

  sidebarTitle: {
    marginTop: "3px",
    fontSize: "1.3rem",
    fontWeight: 800,
  },

  tablePickerInline: {
    width: "auto",
    minWidth: 0,
    maxWidth: "100%",
    height: "40px",
    padding: "0 24px 0 0",
    border: "none",
    outline: "none",
    backgroundColor: "transparent",
    color: "var(--color-text-main)",
    fontSize: "1.05rem",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "none",
    borderRadius: 0,
    appearance: "none",
    backgroundImage:
      'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2214%22 height=%2214%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b735f%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E")',
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right center",
    backgroundSize: "14px",
  },

  orderNumber: {
    marginLeft: "auto",
    padding: "5px 9px",
    borderRadius: "var(--radius-full)",
    backgroundColor: "var(--color-primary-subtle)",
    color: "var(--color-primary-active)",
    fontWeight: 800,
    fontSize: "0.76rem",
  },

  ordersToggleBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    width: "100%",
    padding: "9px 10px",
    marginTop: "10px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--color-bg)",
    color: "var(--color-text-main)",
    fontWeight: 700,
    fontSize: "0.8rem",
    cursor: "pointer",
  },

  ordersPanel: {
    marginTop: "8px",
    padding: "10px",
    border: "1px solid var(--color-border-light)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--color-bg)",
    maxHeight: "180px",
    overflowY: "auto",
  },

  ordersPanelRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
    padding: "6px 0",
    borderBottom: "1px solid var(--color-border-light)",
    fontSize: "0.78rem",
  },

  ordersPanelOrderNum: {
    fontWeight: 700,
  },

  ordersPanelStatus: {
    color: "var(--color-primary-active)",
    fontWeight: 700,
  },

  ordersPanelTableLabel: {
    color: "var(--color-text-muted)",
    fontSize: "0.74rem",
  },

  orderTypeRow: {
    display: "flex",
    backgroundColor: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "3px",
    marginTop: "12px",
  },

  orderTypeBtn: {
    flex: 1,
    padding: "8px 0",
    borderRadius: "var(--radius-sm)",
    border: "none",
    fontWeight: 700,
    fontSize: "0.82rem",
    cursor: "pointer",
  },

  cart: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "14px",
    maxHeight: "300px",
    overflowY: "auto",
  },

  cartThumb: {
    width: "40px",
    height: "40px",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--color-surface)",
    flexShrink: 0,
    overflow: "hidden",
  },

  cartThumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  cartRow: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    padding: "8px 0",
    borderBottom: "1px solid var(--color-border-light)",
  },

  cartMain: {
    flex: 1,
    minWidth: 0,
  },

  cartItemName: {
    fontSize: "0.86rem",
    fontWeight: 750,
    color: "var(--color-text-main)",
    lineHeight: 1.2,
    marginBottom: "5px",
  },

  cartMetaRow: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    minWidth: 0,
    height: "20px",
  },

  cartUnitPrice: {
    flexShrink: 0,
    fontSize: "0.74rem",
    fontWeight: 600,
    color: "var(--color-text-muted)",
    whiteSpace: "nowrap",
  },

  cartQtyTag: {
    flexShrink: 0,
    fontSize: "0.73rem",
    fontWeight: 750,
    color: "var(--color-text-main)",
    whiteSpace: "nowrap",
  },

  inlineNote: {
    minWidth: 0,
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "0.72rem",
    color: "var(--color-text-muted)",
  },

  cartItemPrice: {
    flexShrink: 0,
    minWidth: "68px",
    textAlign: "right",
    fontSize: "0.84rem",
    fontWeight: 800,
    color: "var(--color-text-main)",
  },

  itemNoteButton: {
    flexShrink: 0,
    width: "22px",
    height: "22px",
    minWidth: "22px",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
  },

  itemNoteInput: {
    width: "100%",
    boxSizing: "border-box",
    marginTop: "4px",
    padding: "5px 7px",
    border: "1px solid var(--color-primary)",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.78rem",
  },

  summary: {
    borderTop: "1px solid var(--color-border-light)",
    marginTop: "10px",
    paddingTop: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.86rem",
  },

  primaryBtn: {
    marginTop: "14px",
    padding: "12px",
    borderRadius: "var(--radius-md)",
    border: "none",
    backgroundColor: "var(--color-primary)",
    color: "#fff",
    fontWeight: 800,
    boxShadow: "0 4px 14px rgba(139, 154, 110, 0.25)",
    cursor: "pointer",
  },

  dangerBtn: {
    marginTop: "8px",
    padding: "12px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-danger)",
    backgroundColor: "transparent",
    color: "var(--color-danger)",
    fontWeight: 800,
    cursor: "pointer",
  },

  // ---- Cancellation request -------------------------------------------
  cancelForm: {
    marginTop: "12px",
    padding: "14px",
    borderRadius: "var(--radius-md)",
    border: "1.5px solid var(--color-danger)",
    backgroundColor: "var(--color-danger-bg)",
    display: "flex",
    flexDirection: "column",
    gap: "9px",
  },
  cancelFormTitle: {
    fontSize: "0.92rem",
    fontWeight: 800,
    color: "var(--color-danger)",
  },
  cancelFormHint: {
    fontSize: "0.8rem",
    lineHeight: 1.5,
    color: "var(--color-text-muted)",
  },
  cancelTextarea: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1.5px solid var(--color-border)",
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text-main)",
    fontSize: "0.88rem",
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
  },
  cancelError: {
    fontSize: "0.82rem",
    fontWeight: 700,
    color: "var(--color-danger)",
  },
  cancelFormActions: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  cancelGhostBtn: {
    marginTop: "8px",
    padding: "12px 16px",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--color-border)",
    backgroundColor: "transparent",
    color: "var(--color-text-main)",
    fontWeight: 700,
    cursor: "pointer",
  },
  requestBanner: {
    marginTop: "12px",
    padding: "12px 14px",
    borderRadius: "var(--radius-md)",
    border: "1.5px solid",
    backgroundColor: "var(--color-surface)",
  },
  requestBannerHead: {
    fontSize: "0.87rem",
    fontWeight: 800,
    color: "var(--color-text-main)",
  },
  requestBannerText: {
    marginTop: "6px",
    fontSize: "0.85rem",
    lineHeight: 1.5,
    fontStyle: "italic",
    color: "var(--color-text-muted)",
  },
};
