// TablesPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllTables,
  claimTable,
  markNeedsCleaning,
  markEmpty,
  createTable,
  deleteTable,
  nextFreeTableNumber,
  getTableArtCapacity,
  SEAT_OPTIONS,
  TABLE_STATUS,
} from "./tableService";
import { getActiveOrders } from "../orders/orderService";
import { useAuth } from "../authentication/context/AuthContext";
import { ROLES } from "../authentication/constants/rbac";

function getTableImageSrc(table) {
  const capacity = table.capacity;
  const status = table.status;


  let statusKey = "empty";
  if (status === TABLE_STATUS.OCCUPIED) statusKey = "occupied";
  if (status === TABLE_STATUS.NEEDS_CLEANING) statusKey = "cleaning";

  return `/images/table-${getTableArtCapacity(capacity)}-${statusKey}.png`;
}

const STATUS_META = {
  [TABLE_STATUS.EMPTY]: {
    label: "Available",
    dot: "var(--color-success)",
  },
  [TABLE_STATUS.OCCUPIED]: {
    label: "Occupied",
    dot: "var(--color-primary-active)",
  },
  [TABLE_STATUS.NEEDS_CLEANING]: {
    label: "Needs Cleaning",
    dot: "var(--color-danger)",
  },
};

export const TablesPage = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);

  // ---- নতুন টেবিল বসানোর ফর্ম ----
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newCapacity, setNewCapacity] = useState(SEAT_OPTIONS[0]);
  const [saving, setSaving] = useState(false);
  const [tableToRemove, setTableToRemove] = useState(null);

  const navigate = useNavigate();
  const { role } = useAuth();

  // ডেটাবেজের `tables_admin` policy ও ঠিক এই দুজনকেই লিখতে দেয়
  const canManageFloor = role === ROLES.OWNER || role === ROLES.MANAGER;

  useEffect(() => {
    loadTables();
  }, []);

  async function loadTables() {
    try {
      setLoading(true);
      setError(null);

      const [tableRows, orderRows] = await Promise.all([
        getAllTables(),
        getActiveOrders(),
      ]);

      setTables(tableRows);
      setActiveOrders(orderRows);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ---- derived data ----

  const stats = useMemo(() => {
    const counts = {
      total: tables.length,
      [TABLE_STATUS.EMPTY]: 0,
      [TABLE_STATUS.OCCUPIED]: 0,
      [TABLE_STATUS.NEEDS_CLEANING]: 0,
    };

    tables.forEach((table) => {
      counts[table.status] = (counts[table.status] || 0) + 1;
    });

    return counts;
  }, [tables]);

  const needsAttention = useMemo(
    () =>
      tables.filter((table) => table.status === TABLE_STATUS.NEEDS_CLEANING),
    [tables],
  );

  const selectedTable =
    tables.find((table) => table.table_id === selectedTableId) || null;

  const selectedTableOrder =
    activeOrders.find(
      (order) =>
        order.table_id === selectedTableId && order.order_type === "dine-in",
    ) || null;

  // ---- actions ----

  async function runAction(fn) {
    try {
      setError(null);
      await fn();
      await loadTables();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleMarkOccupied(table) {
    runAction(() => claimTable(table.table_id));
  }

  function handleOpenOrder(table) {
    navigate(`/dashboard/orders/table/${table.table_number}`);
  }

  function handleMarkNeedsCleaning(table) {
    runAction(() => markNeedsCleaning(table.table_id));
  }

  function handleMarkCleaned(table) {
    runAction(() => markEmpty(table.table_id));
  }

  // ---- floor setup ----

  function openAddForm() {
    setNewNumber(String(nextFreeTableNumber(tables)));
    setNewCapacity(SEAT_OPTIONS[0]);
    setError(null);
    setShowAddForm(true);
  }

  async function handleCreateTable(e) {
    e.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      setError(null);

      const created = await createTable({
        tableNumber: newNumber,
        capacity: newCapacity,
      });

      await loadTables();
      setShowAddForm(false);
      // নতুন টেবিলটাই বেছে দেওয়া হয়, যাতে সাথে সাথেই দেখা যায়
      setSelectedTableId(created.table_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveTable() {
    if (!tableToRemove) return;

    try {
      setSaving(true);
      setError(null);
      await deleteTable(tableToRemove.table_id);
      setTableToRemove(null);
      setSelectedTableId(null);
      await loadTables();
    } catch (err) {
      setTableToRemove(null);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={styles.page}>Loading tables…</div>;
  }

  return (
    <div style={styles.page}>
      {error && <div style={styles.errorBanner}>Error: {error}</div>}

      {/* ============ STATS BAR ============ */}

      <div style={styles.statsBar}>
        <StatCard label="Total Tables" value={stats.total} />

        <StatCard
          label="Available"
          value={stats[TABLE_STATUS.EMPTY]}
          dot="var(--color-success)"
        />

        <StatCard
          label="Occupied"
          value={stats[TABLE_STATUS.OCCUPIED]}
          dot="var(--color-primary-active)"
        />

        <StatCard
          label="Needs Cleaning"
          value={stats[TABLE_STATUS.NEEDS_CLEANING]}
          dot="var(--color-danger)"
        />
      </div>

      <div style={styles.mainGrid}>
        {/* ============ FLOOR AREA — ART SWAP POINT ============ */}

        <div style={styles.floorArea}>
          <div style={styles.tablesGrid}>
            {tables.map((table) => (
              <TableCard
                key={table.table_id}
                table={table}
                selected={table.table_id === selectedTableId}
                onSelect={() => setSelectedTableId(table.table_id)}
              />
            ))}

            {/* বাকি টেবিলের মতোই একটা ঘর, শুধু ফাঁকা — এখানে চাপলে
                নতুন টেবিল বসানোর ফর্ম খোলে */}
            {canManageFloor && (
              <button
                type="button"
                onClick={openAddForm}
                style={styles.addTableCard}
                title="Add a new table to the floor"
              >
                <span style={styles.addTablePlus}>+</span>
                <span style={styles.addTableText}>Add Table</span>
              </button>
            )}
          </div>
        </div>

        {/* ============ DETAIL PANEL ============ */}

        <div style={styles.detailPanel}>
          {selectedTable ? (
            <TableDetail
              table={selectedTable}
              activeOrder={selectedTableOrder}
              onMarkOccupied={() => handleMarkOccupied(selectedTable)}
              onOpenOrder={() => handleOpenOrder(selectedTable)}
              onMarkNeedsCleaning={() => handleMarkNeedsCleaning(selectedTable)}
              onMarkCleaned={() => handleMarkCleaned(selectedTable)}
              canManageFloor={canManageFloor}
              onRemove={() => setTableToRemove(selectedTable)}
            />
          ) : (
            <div style={styles.noSelection}>Select a table to see details</div>
          )}

          {/* ============ NEEDS ATTENTION LIST ============ */}

          <div style={styles.attentionSection}>
            <h4 style={styles.attentionTitle}>Needs Attention</h4>

            {needsAttention.length === 0 ? (
              <div style={styles.attentionEmpty}>
                Nothing needs attention right now
              </div>
            ) : (
              needsAttention.map((table) => (
                <div
                  key={table.table_id}
                  style={styles.attentionRow}
                  onClick={() => setSelectedTableId(table.table_id)}
                >
                  <span>Table {table.table_number}</span>

                  <span
                    style={{
                      color: STATUS_META[table.status].dot,
                      fontWeight: 700,
                    }}
                  >
                    {STATUS_META[table.status].label}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ============ ADD TABLE FORM ============ */}

      {showAddForm && (
        <div style={styles.overlay} onClick={() => setShowAddForm(false)}>
          <form
            style={styles.dialog}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreateTable}
          >
            <h3 style={styles.dialogTitle}>Add a table</h3>
            <p style={styles.dialogSub}>
              It joins the floor as an empty table, ready to seat guests.
            </p>

            <label style={styles.fieldLabel}>Table number</label>
            <input
              type="number"
              min="1"
              step="1"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              required
              autoFocus
              style={styles.numberInput}
            />

            <label style={{ ...styles.fieldLabel, marginTop: "16px" }}>
              Seats
            </label>
            <div style={styles.seatRow}>
              {SEAT_OPTIONS.map((seats) => (
                <button
                  key={seats}
                  type="button"
                  onClick={() => setNewCapacity(seats)}
                  style={{
                    ...styles.seatPill,
                    backgroundColor:
                      newCapacity === seats
                        ? "var(--color-primary)"
                        : "var(--color-bg)",
                    color: newCapacity === seats ? "#FFFFFF" : "var(--color-text-main)",
                    borderColor:
                      newCapacity === seats
                        ? "var(--color-primary)"
                        : "var(--color-border)",
                  }}
                >
                  {seats} people
                </button>
              ))}
            </div>

            {/* ঠিক যে ছবিটা ফ্লোরে বসবে, সেটাই আগে থেকে দেখানো হয় */}
            <div style={styles.previewBox}>
              <img
                src={`/images/table-${getTableArtCapacity(newCapacity)}-empty.png`}
                alt={`Preview of a ${newCapacity} seat table`}
                style={styles.previewImg}
              />
              <div style={styles.previewNote}>
                Looks like your existing{" "}
                <strong>{getTableArtCapacity(newCapacity)}-seater</strong>
                {getTableArtCapacity(newCapacity) !== Number(newCapacity)
                  ? ` — seats ${newCapacity}`
                  : ""}
              </div>
            </div>

            <div style={styles.dialogActions}>
              <button
                type="button"
                style={styles.secondaryBtn}
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
              <button type="submit" style={styles.primaryBtn} disabled={saving}>
                {saving ? "Adding…" : `Add Table ${newNumber || ""}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============ REMOVE TABLE CONFIRM ============ */}

      {tableToRemove && (
        <div style={styles.overlay} onClick={() => setTableToRemove(null)}>
          <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.dialogTitle}>
              Remove Table {tableToRemove.table_number}?
            </h3>
            <p style={styles.dialogSub}>
              It disappears from the floor map. A table that already has orders
              on record cannot be removed.
            </p>

            <div style={styles.dialogActions}>
              <button
                type="button"
                style={styles.secondaryBtn}
                onClick={() => setTableToRemove(null)}
              >
                Keep it
              </button>
              <button
                type="button"
                style={styles.dangerBtn}
                onClick={handleRemoveTable}
                disabled={saving}
              >
                {saving ? "Removing…" : "Remove table"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------------------
// Subcomponents
// -------------------------------------------------------------------------

const StatCard = ({ label, value, dot }) => (
  <div style={styles.statCard}>
    <div style={styles.statTop}>
      <span style={styles.statValue}>{value}</span>

      {dot && (
        <span
          style={{
            ...styles.statDot,
            backgroundColor: dot,
          }}
        />
      )}
    </div>

    <div style={styles.statLabel}>{label}</div>
  </div>
);


const TableCard = ({ table, selected, onSelect }) => {
  const meta =
    STATUS_META[table.status] || STATUS_META[TABLE_STATUS.NEEDS_CLEANING];

  const imageSrc = getTableImageSrc(table);

  return (
    <div
      onClick={onSelect}
      style={{
        position: "relative",
        cursor: "pointer",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        border: selected
          ? "2px solid var(--color-primary)"
          : "2px solid var(--color-border)",
        boxShadow: "none",
        aspectRatio: "1 / 1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-bg)",
      }}
    >
      <img
        src={imageSrc}
        alt={`Table ${table.table_number} (${meta.label})`}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "4px 8px",
          borderRadius: "999px",
          backgroundColor: "rgba(0, 0, 0, 0.65)",
          color: "#fff",
          fontSize: "0.72rem",
          fontWeight: 700,
          letterSpacing: "0.02em",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
        }}
      >
        Table {table.table_number}
      </div>
    </div>
  );
};



const TableDetail = ({
  table,
  activeOrder,
  onMarkOccupied,
  onOpenOrder,
  onMarkNeedsCleaning,
  onMarkCleaned,
  canManageFloor,
  onRemove,
}) => {
  const meta =
    STATUS_META[table.status] || STATUS_META[TABLE_STATUS.NEEDS_CLEANING];

  return (
    <div>
      <div style={styles.detailHeaderRow}>
        <h3 style={styles.detailTitle}>Table {table.table_number}</h3>

        <span
          style={{
            color: meta.dot,
            fontWeight: 700,
          }}
        >
          {meta.label}
        </span>
      </div>

      <div style={styles.detailRow}>
        <span style={styles.detailLabel}>Capacity</span>

        <span>{table.capacity} guests</span>
      </div>

      <div style={styles.detailRow}>
        <span style={styles.detailLabel}>Status</span>

        <span>{meta.label}</span>
      </div>

      {table.status === TABLE_STATUS.OCCUPIED && (
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Order</span>

          <span>
            {activeOrder
              ? `#${activeOrder.order_number} (${activeOrder.status})`
              : "No active order"}
          </span>
        </div>
      )}

      <div style={styles.detailActions}>
        {table.status === TABLE_STATUS.EMPTY && (
          <button style={styles.primaryBtn} onClick={onMarkOccupied}>
            Mark as Occupied
          </button>
        )}

        {table.status === TABLE_STATUS.OCCUPIED && (
          <>
            <button style={styles.primaryBtn} onClick={onOpenOrder}>
              {activeOrder ? "Continue Order" : "Place Order"}
            </button>

            <button style={styles.secondaryBtn} onClick={onMarkNeedsCleaning}>
              Mark as Needs Cleaning
            </button>
          </>
        )}

        {table.status === TABLE_STATUS.NEEDS_CLEANING && (
          <button style={styles.primaryBtn} onClick={onMarkCleaned}>
            Mark as Cleaned
          </button>
        )}

        {/* ব্যবহারে থাকা টেবিল সরানো যাবে না — আগে খালি করতে হবে */}
        {canManageFloor && table.status === TABLE_STATUS.EMPTY && (
          <button style={styles.removeLink} onClick={onRemove}>
            Remove this table
          </button>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: {
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "0 24px 60px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  errorBanner: {
    padding: "10px 14px",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--color-danger-bg)",
    color: "var(--color-danger)",
    fontWeight: 600,
  },

  statsBar: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "12px",
  },

  statCard: {
    backgroundColor: "var(--color-surface)",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "14px 16px",
  },

  statTop: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  statValue: {
    fontSize: "1.6rem",
    fontWeight: 800,
    color: "var(--color-text-main)",
  },

  statDot: {
    width: "9px",
    height: "9px",
    borderRadius: "50%",
  },

  statLabel: {
    fontSize: "0.74rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    color: "var(--color-text-muted)",
    marginTop: "4px",
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 300px",
    gap: "20px",
    alignItems: "start",
  },

  floorArea: {
    backgroundColor: "var(--color-surface)",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "40px",
  },

  tablesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gridAutoRows: "150px", // all table cards will be 150px tall
    gap: "32px",
  },

  tableCard: {
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
  },

  addTableCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    height: "100%",
    minHeight: 0,
    borderRadius: "var(--radius-md)",
    border: "2px dashed var(--color-border)",
    backgroundColor: "transparent",
    color: "var(--color-text-muted)",
    cursor: "pointer",
  },

  addTablePlus: {
    fontSize: "1.9rem",
    fontWeight: 300,
    lineHeight: 1,
    color: "var(--color-primary-active)",
  },

  addTableText: {
    fontSize: "0.78rem",
    fontWeight: 700,
    letterSpacing: "0.02em",
  },

  tableCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },

  tableCardName: {
    fontWeight: 800,
    color: "var(--color-text-main)",
  },

  statusDot: {
    width: "9px",
    height: "9px",
    borderRadius: "50%",
  },

  tableCardCap: {
    fontSize: "0.76rem",
    color: "var(--color-text-muted)",
  },

  tableCardStatus: {
    fontSize: "0.8rem",
    fontWeight: 700,
    marginTop: "4px",
  },

  detailPanel: {
    backgroundColor: "var(--color-surface)",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  noSelection: {
    color: "var(--color-text-muted)",
    fontSize: "0.9rem",
  },

  detailHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },

  detailTitle: {
    fontSize: "1.15rem",
    fontWeight: 800,
    color: "var(--color-text-main)",
  },

  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.86rem",
    padding: "8px 0",
    borderBottom: "1px solid var(--color-border-light)",
  },

  detailLabel: {
    color: "var(--color-text-muted)",
  },

  detailActions: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "16px",
  },

  primaryBtn: {
    padding: "11px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    backgroundColor: "var(--color-primary)",
    color: "#FFFFFF",
    fontWeight: 700,
    cursor: "pointer",
  },

  secondaryBtn: {
    padding: "11px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-border)",
    backgroundColor: "transparent",
    color: "var(--color-text-main)",
    fontWeight: 700,
    cursor: "pointer",
  },

  attentionSection: {
    borderTop: "1px solid var(--color-border-light)",
    paddingTop: "16px",
  },

  attentionTitle: {
    fontSize: "0.9rem",
    fontWeight: 800,
    marginBottom: "10px",
  },

  attentionEmpty: {
    fontSize: "0.82rem",
    color: "var(--color-text-muted)",
  },

  attentionRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.84rem",
    padding: "8px 0",
    cursor: "pointer",
    borderBottom: "1px solid var(--color-border-light)",
  },

  removeLink: {
    padding: "9px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--color-danger)",
    backgroundColor: "transparent",
    color: "var(--color-danger)",
    fontSize: "0.82rem",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "4px",
  },

  dangerBtn: {
    padding: "11px 18px",
    borderRadius: "var(--radius-sm)",
    border: "none",
    backgroundColor: "var(--color-danger)",
    color: "#FFFFFF",
    fontWeight: 700,
    cursor: "pointer",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(34, 42, 30, 0.55)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 900,
  },

  dialog: {
    width: "100%",
    maxWidth: "400px",
    backgroundColor: "var(--color-surface)",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-lg)",
    padding: "22px",
    boxShadow: "var(--shadow-modal)",
    maxHeight: "90vh",
    overflowY: "auto",
  },

  dialogTitle: {
    fontSize: "1.15rem",
    fontWeight: 800,
    color: "var(--color-text-main)",
  },

  dialogSub: {
    fontSize: "0.84rem",
    color: "var(--color-text-muted)",
    marginTop: "4px",
    marginBottom: "18px",
    lineHeight: 1.5,
  },

  fieldLabel: {
    display: "block",
    fontSize: "0.72rem",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--color-text-muted)",
    marginBottom: "6px",
  },

  numberInput: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: "var(--radius-sm)",
    border: "1.5px solid var(--color-border)",
    backgroundColor: "var(--color-bg)",
    color: "var(--color-text-main)",
    fontSize: "1rem",
    fontWeight: 700,
    outline: "none",
  },

  seatRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },

  seatPill: {
    flex: "1 1 auto",
    padding: "10px 6px",
    borderRadius: "var(--radius-sm)",
    border: "1.5px solid",
    fontSize: "0.82rem",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  previewBox: {
    marginTop: "18px",
    padding: "12px",
    borderRadius: "var(--radius-md)",
    backgroundColor: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    textAlign: "center",
  },

  previewImg: {
    display: "block",
    width: "112px",
    height: "112px",
    objectFit: "contain",
    margin: "0 auto",
  },

  previewNote: {
    fontSize: "0.78rem",
    color: "var(--color-text-muted)",
    marginTop: "6px",
  },

  dialogActions: {
    display: "flex",
    gap: "10px",
    marginTop: "20px",
  },
};
