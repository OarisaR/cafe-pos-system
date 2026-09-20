//Orders.jsx
import React, { useState, useEffect } from "react";

import { useParams, useNavigate } from "react-router-dom";

import { MessageSquare, ChevronDown, ListOrdered } from "lucide-react";

import { fetchCategories, fetchMenuItems } from "../menu/menuService";
import {
  getAllTables,
  claimTable,
  markEmpty,
  TABLE_STATUS,
} from "../tables/tableService";
import { OrderMenuItemCard } from "./components/OrderMenuItemCard";

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
} from "./orderService";

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

  const [ordersPanelOpen, setOrdersPanelOpen] = useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  useEffect(() => {
    bootstrap();
  }, [tableRef]);

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
       * getActiveOrders() contains only currently active orders
       * (OPEN / PAID), so a previously SERVED order is not reused.
       * Therefore, once a table's previous order is SERVED, a new
       * order can be created for the same table with a new order_id.
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

  async function handleStartOrder() {
    // Do not allow an order without selecting Dine In / Take Away.
    if (!selectedOrderType) return;

    // Dine In requires a table.
    if (selectedOrderType === "dine-in" && !selectedTable) {
      return;
    }

    try {
      setError(null);

      // The DB rejects new orders on an 'occupied' table, then marks the
      // table occupied itself after the insert. So free it first.
      if (selectedOrderType === "dine-in") {
        await markEmpty(selectedTable.table_id);
      }

      let createdOrder;

      try {
        createdOrder = await createOrder({
          tableId:
            selectedOrderType === "takeaway" ? null : selectedTable.table_id,
          orderType: selectedOrderType,
        });
      } catch (err) {
        // Insert failed: put the table back to occupied.
        if (selectedOrderType === "dine-in") {
          await claimTable(selectedTable.table_id);
        }

        throw err;
      }

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

  const canStartOrder =
    selectedOrderType === "takeaway"
      ? !order
      : selectedOrderType === "dine-in"
        ? Boolean(
            selectedTable &&
            !order &&
            selectedTable.status === TABLE_STATUS.OCCUPIED,
          )
        : false;

  // Only OPEN orders can be edited.
  // PAID and SERVED orders are locked.
  const canEditOrder = Boolean(order && order.status === ORDER_STATUS.OPEN);

  async function handleQuantityChange(menuItem, delta) {
    if (!canEditOrder) return;

    try {
      setError(null);

      const existingLine = cartItems.find(
        (cartItem) => cartItem.menu_item_id === menuItem.menu_item_id,
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

  const subtotal = cartItems.reduce(
    (sum, cartItem) => sum + Number(cartItem.subtotal),
    0,
  );

  const vat = Math.round(subtotal * 0.075);

  const grandTotal = subtotal + vat;
  // Can proceed only if there's an OPEN order with at least one item.
  const canProceedToPayment =
    Boolean(order?.order_id) &&
    order.status === ORDER_STATUS.OPEN &&
    cartItems.length > 0;
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

  // Cancel an order. Allowed while OPEN or PAID.
  // (Refund/bill handling for a PAID order belongs to Billing - Pritam.)
  async function handleCancelOrder() {
    if (
      !order ||
      (order.status !== ORDER_STATUS.OPEN && order.status !== ORDER_STATUS.PAID)
    ) {
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

      setOrderHistory(await getRecentOrders());
    } catch (err) {
      setError(err.message);
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

          <select
            aria-label="Filter menu by category"
            value={activeCategory}
            onChange={(event) => setActiveCategory(event.target.value)}
            style={styles.categorySelect}
          >
            <option value="all">All categories</option>

            {categories.map((category) => (
              <option key={category.category_id} value={category.category_id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

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

        {!order && selectedOrderType === "dine-in" && !selectedTable && (
          <div style={styles.lockedNote}>Select a table to begin.</div>
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

        <div style={styles.itemsGrid}>
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

                {tables
                  .filter(
                    (table) =>
                      (table.status !== TABLE_STATUS.EMPTY &&
                        table.status !== TABLE_STATUS.NEEDS_CLEANING) ||
                      table.table_id === selectedTable?.table_id,
                  )
                  .map((table) => (
                    <option key={table.table_id} value={table.table_id}>
                      Table {table.table_number}
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

                // Only unfinished orders can be reopened.
                // Served / Cancelled rows are read-only.
                const canReopen =
                  historyOrder.status === ORDER_STATUS.OPEN ||
                  historyOrder.status === ORDER_STATUS.PAID;

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

            return (
              <div key={line.order_item_id} style={styles.cartRow}>
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
                        disabled={!canEditOrder}
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
        {order?.status === ORDER_STATUS.OPEN && (
          <>
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
                : "Proceed to Payment"}
            </button>

            <button style={styles.dangerBtn} onClick={handleCancelOrder}>
              Cancel Order
            </button>
          </>
        )}
        {/* PAID = bill collected in Billing (Pritam's module) */}
        {order?.status === ORDER_STATUS.PAID && (
          <>
            <button style={styles.primaryBtn} onClick={handleMarkAsServed}>
              Mark as Served
            </button>

            <button style={styles.dangerBtn} onClick={handleCancelOrder}>
              Mark as Cancelled
            </button>
          </>
        )}

        {order?.status === ORDER_STATUS.SERVED && (
          <div style={styles.lockedNote}>Order Served</div>
        )}
      </div>
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
};
